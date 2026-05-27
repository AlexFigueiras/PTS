import { and, eq, lte, sql, count, desc } from 'drizzle-orm';
import { backgroundJobs, type BackgroundJob, type NewBackgroundJob } from '@/lib/db/schema/background-jobs';
import { type Database, getDb } from '@/lib/db/client';
import { type PaginationParams, type PaginatedResult, getPaginationOffset, toPaginatedResult } from '@/lib/pagination';
import { type TenantContext } from '@/lib/tenant-context';

export type JobFilters = PaginationParams & {
  status?: string;
  queueName?: string;
};

export class BackgroundJobsRepository {
  private readonly db: Database;
  private readonly tenantId: string | null;

  constructor(ctx: TenantContext | null | undefined) {
    this.db = getDb();
    this.tenantId = ctx?.tenantId ?? null;
  }

  /**
   * Enfileira um novo job associado ao tenant ativo do repositório.
   * Suporta opcionalmente uma instância de transação do Drizzle (tx) para atomicidade transacional (Transactional Outbox).
   */
  async enqueueJob(
    queueName: string,
    payload: Record<string, unknown>,
    options?: { maxRetries?: number; runAt?: Date; tx?: any }
  ): Promise<BackgroundJob> {
    const executor = options?.tx ?? this.db;

    if (!this.tenantId) {
      throw new Error('O tenantId é obrigatório para enfileirar um job.');
    }

    const [row] = await executor
      .insert(backgroundJobs)
      .values({
        tenantId: this.tenantId,
        queueName,
        payload,
        status: 'queued',
        retryCount: 0,
        maxRetries: options?.maxRetries ?? 5,
        runAt: options?.runAt ?? new Date(),
      } as NewBackgroundJob)
      .returning();

    return row;
  }

  /**
   * Obtém as informações de um job específico, limitado ao tenant ativo do repositório.
   */
  async getJobById(id: string): Promise<BackgroundJob | undefined> {
    if (!this.tenantId) {
      throw new Error('O tenantId é obrigatório para obter um job.');
    }

    const [row] = await this.db
      .select()
      .from(backgroundJobs)
      .where(and(eq(backgroundJobs.id, id), eq(backgroundJobs.tenantId, this.tenantId)))
      .limit(1);

    return row;
  }

  /**
   * Lista e pagina jobs do tenant ativo do repositório.
   */
  async listJobs(filters: JobFilters): Promise<PaginatedResult<BackgroundJob>> {
    if (!this.tenantId) {
      throw new Error('O tenantId é obrigatório para listar os jobs.');
    }

    const conditions = [eq(backgroundJobs.tenantId, this.tenantId)];

    if (filters.status) {
      conditions.push(eq(backgroundJobs.status, filters.status));
    }
    if (filters.queueName) {
      conditions.push(eq(backgroundJobs.queueName, filters.queueName));
    }

    const where = and(...conditions);
    const offset = getPaginationOffset(filters);

    const [rows, [{ value: total }]] = await Promise.all([
      this.db
        .select()
        .from(backgroundJobs)
        .where(where)
        .orderBy(desc(backgroundJobs.createdAt))
        .limit(filters.pageSize)
        .offset(offset),
      this.db.select({ value: count() }).from(backgroundJobs).where(where),
    ]);

    return toPaginatedResult(rows, Number(total), filters);
  }

  /**
   * Re-enfileira um job que falhou (DLQ) atualizando seu payload com os dados mais recentes fornecidos pela camada de serviço.
   */
  async requeueFailedJob(id: string, freshPayload: Record<string, unknown>, runAt = new Date()): Promise<BackgroundJob | undefined> {
    if (!this.tenantId) {
      throw new Error('O tenantId é obrigatório para re-enfileirar um job.');
    }

    const [row] = await this.db
      .update(backgroundJobs)
      .set({
        status: 'queued',
        retryCount: 0,
        runAt,
        errorLog: null,
        payload: freshPayload,
        updatedAt: new Date(),
      })
      .where(and(eq(backgroundJobs.id, id), eq(backgroundJobs.tenantId, this.tenantId)))
      .returning();

    return row;
  }

  /**
   * =========================================================================
   * MÉTODOS GLOBAIS (SISTEMA / BACKGROUND WORKER RUNTIME)
   * =========================================================================
   * Estes métodos são executados pelo worker em segundo plano de forma global,
   * portanto operam diretamente sobre o banco com bypass de tenantId na leitura,
   * permitindo que o Cron atenda a todos os inquilinos sequencialmente sem falhas.
   */

  /**
   * Adquire e trava de forma concorrente o próximo job pendente para processamento.
   * Utiliza a estratégia transacional `FOR UPDATE SKIP LOCKED` nativa do PostgreSQL.
   */
  static async pollNextJobForExecution(db: Database): Promise<BackgroundJob | null> {
    return await db.transaction(async (tx) => {
      // 1. Busca o próximo job elegível para processamento usando SKIP LOCKED
      const [eligibleJob] = await tx
        .select()
        .from(backgroundJobs)
        .where(
          and(
            sql`${backgroundJobs.status} IN ('queued', 'failed')`,
            lte(backgroundJobs.runAt, new Date()),
            sql`${backgroundJobs.retryCount} < ${backgroundJobs.maxRetries}`
          )
        )
        .orderBy(backgroundJobs.runAt)
        .limit(1)
        .for('update', { skipLocked: true });

      if (!eligibleJob) {
        return null;
      }

      // 2. Trava imediatamente o job mudando o status para 'processing'
      // ATENÇÃO: Executado estritamente sob o escopo 'tx' para evitar vazamentos.
      const [lockedJob] = await tx
        .update(backgroundJobs)
        .set({
          status: 'processing',
          updatedAt: new Date(),
        })
        .where(eq(backgroundJobs.id, eligibleJob.id))
        .returning();

      return lockedJob;
    });
  }

  /**
   * Atualiza as informações do job em processamento global.
   */
  static async updateJobStatusGlobal(
    db: Database,
    id: string,
    status: 'queued' | 'processing' | 'completed' | 'failed' | 'dead_letter',
    updates?: Partial<Omit<BackgroundJob, 'id' | 'status'>>
  ): Promise<void> {
    await db
      .update(backgroundJobs)
      .set({
        status,
        updatedAt: new Date(),
        ...updates,
      })
      .where(eq(backgroundJobs.id, id));
  }

  /**
   * Identifica jobs zumbis (presos em status 'processing' por tempo excessivo) e os reseta.
   * Executado de forma global no início de cada execução do cron.
   */
  static async reapStuckJobs(db: Database, thresholdMinutes = 5): Promise<number> {
    const cutoffTime = new Date(Date.now() - thresholdMinutes * 60 * 1000);

    // 1. Busca todos os jobs presos em 'processing' há mais do que o tempo limite (Leitura Global)
    const stuckJobs = await db
      .select()
      .from(backgroundJobs)
      .where(and(eq(backgroundJobs.status, 'processing'), lte(backgroundJobs.updatedAt, cutoffTime)));

    if (stuckJobs.length === 0) {
      return 0;
    }

    let reapedCount = 0;

    // Usamos db.transaction para garantir que todo o reap de jobs zumbis seja executado com atomicidade ACID.
    await db.transaction(async (tx) => {
      for (const job of stuckJobs) {
        const nextRetry = job.retryCount + 1;
        const formattedLog = `[${new Date().toISOString()}] [REAPER] Job detectado como zumbi (preso em 'processing' desde ${job.updatedAt.toISOString()}).`;

        if (nextRetry >= job.maxRetries) {
          // Excedeu o limite de tentativas no reset do Reaper -> vai para DLQ
          // ATENÇÃO: Executado estritamente sob o escopo 'tx' para evitar vazamentos de transação.
          await tx
            .update(backgroundJobs)
            .set({
              status: 'dead_letter',
              retryCount: nextRetry,
              errorLog: `${job.errorLog ?? ''}\n${formattedLog}\n[FATAL] Job reabduzido pelo Reaper excedeu o limite máximo de ${job.maxRetries} tentativas.`,
              processedAt: new Date(),
              updatedAt: new Date(),
            })
            .where(eq(backgroundJobs.id, job.id));
        } else {
          // Agenda nova tentativa com backoff exponencial
          const baseDelaySeconds = 30;
          const multiplier = Math.pow(2, nextRetry - 1);
          const backoff = Math.min(baseDelaySeconds * multiplier, 3600);
          const jitter = Math.random() * 0.2 * backoff;
          const runAt = new Date(Date.now() + (backoff + jitter) * 1000);

          // ATENÇÃO: Executado estritamente sob o escopo 'tx' para evitar vazamentos de transação.
          await tx
            .update(backgroundJobs)
            .set({
              status: 'queued',
              retryCount: nextRetry,
              runAt,
              errorLog: `${job.errorLog ?? ''}\n${formattedLog}\n[INFO] Re-enfileirado pelo Reaper com agendamento de retentativa para ${runAt.toISOString()}.`,
              updatedAt: new Date(),
            })
            .where(eq(backgroundJobs.id, job.id));
        }

        reapedCount++;
      }
    });

    return reapedCount;
  }
}
