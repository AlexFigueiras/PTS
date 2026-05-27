import { and, eq } from 'drizzle-orm';
import { getDb } from '@/lib/db/client';
import { BackgroundJobsRepository } from '../repositories/background-jobs.repository';
import { type BackgroundJob } from '@/lib/db/schema/background-jobs';
import { type TenantContext } from '@/lib/tenant-context';
import { RndsQueueHandler } from '@/modules/rnds/handlers/rnds-queue.handler';
import { RndsClinicalValidationError } from '@/modules/rnds/services/rnds.service';
import { RndsInfrastructureError } from '@/modules/rnds/infra/rnds-client';
import { profiles, patients, ptsResponses } from '@/lib/db/schema';
import { parseJobErrorLog, ErrorParser } from '../utils/error-parser';
import { NotificationService } from './notification.service';

export class JobProcessorService {
  /**
   * Varre o banco em busca de tarefas presas em 'processing' por mais de 5 minutos (zumbis)
   * e as reseta atomicamente para 'queued' (com agendamento futuro com backoff) ou move para 'dead_letter' caso exceda maxRetries.
   *
   * @param thresholdMinutes Tempo limite para considerar um job como preso/zumbi (default 5 minutos)
   */
  async reapStuckJobs(thresholdMinutes = 5): Promise<number> {
    const db = getDb();
    return await BackgroundJobsRepository.reapStuckJobs(db, thresholdMinutes);
  }

  /**
   * Executa uma única iteração do processador de fila.
   * Busca o próximo job pendente, trava-o de forma concorrente e executa.
   */
  async processNextJob(): Promise<{
    processed: boolean;
    jobId?: string;
    queueName?: string;
    status?: 'completed' | 'failed' | 'queued' | 'dead_letter';
    error?: string;
  }> {
    const db = getDb();

    // 1. Busca e trava concorrentemente o próximo job pendente usando FOR UPDATE SKIP LOCKED
    const job = await BackgroundJobsRepository.pollNextJobForExecution(db);
    if (!job) {
      return { processed: false };
    }

    const tenantCtx: TenantContext = {
      tenantId: job.tenantId,
      userId: '', // Será preenchido/ignorado conforme necessidade no worker
      role: 'PROFESSIONAL',
      activeUnitId: null,
    };

    try {
      // 2. Executa o job de acordo com o queueName
      await this.executeJobHandler(job, tenantCtx);

      // 3. Sucesso: atualiza status para completed
      await BackgroundJobsRepository.updateJobStatusGlobal(db, job.id, 'completed', {
        processedAt: new Date(),
        errorLog: null,
      });

      return {
        processed: true,
        jobId: job.id,
        queueName: job.queueName,
        status: 'completed',
      };
    } catch (err: any) {
      // 4. Captura e classifica falhas (Retry Engine / DLQ)
      const isFatal = this.isFatalError(err);
      const errorMessage = err?.message ?? String(err);
      const errorStack = err?.stack ?? '';
      const formattedLog = `[${new Date().toISOString()}] Error: ${errorMessage}\nStack: ${errorStack}`;

      if (isFatal) {
        // Erro fatal (clínico ou de negócio): aborta imediatamente enviando para dead_letter (DLQ)
        await BackgroundJobsRepository.updateJobStatusGlobal(db, job.id, 'dead_letter', {
          errorLog: formattedLog,
          processedAt: new Date(),
        });

        // Dispara alerta assíncrono para o profissional no inbox
        await this.createDeadLetterAlert(db, job, formattedLog);

        return {
          processed: true,
          jobId: job.id,
          queueName: job.queueName,
          status: 'dead_letter',
          error: errorMessage,
        };
      } else {
        // Erro técnico de infraestrutura / rede: calcula retentativa com backoff exponencial + jitter
        const nextRetry = job.retryCount + 1;

        if (nextRetry >= job.maxRetries) {
          const finalErrorLog = `${formattedLog}\n\n[FATAL] Esgotado o limite máximo de ${job.maxRetries} retentativas.`;
          // Esgotou o limite máximo de tentativas: move para dead_letter
          await BackgroundJobsRepository.updateJobStatusGlobal(db, job.id, 'dead_letter', {
            retryCount: nextRetry,
            errorLog: finalErrorLog,
            processedAt: new Date(),
          });

          // Dispara alerta assíncrono para o profissional no inbox
          await this.createDeadLetterAlert(db, job, finalErrorLog);

          return {
            processed: true,
            jobId: job.id,
            queueName: job.queueName,
            status: 'dead_letter',
            error: `Esgotado limite de retentativas: ${errorMessage}`,
          };
        } else {
          // Calcula backoff exponencial + jitter
          const baseDelaySeconds = 30; // base de 30 segundos
          const maxDelaySeconds = 3600; // teto de 1 hora
          const multiplier = Math.pow(2, nextRetry - 1);
          let backoff = baseDelaySeconds * multiplier;

          if (backoff > maxDelaySeconds) {
            backoff = maxDelaySeconds;
          }

          // Adiciona jitter aleatório (entre 0% e 20% do backoff) para evitar thundering herd
          const jitter = Math.random() * 0.2 * backoff;
          const totalDelayMs = (backoff + jitter) * 1000;
          const runAt = new Date(Date.now() + totalDelayMs);

          await BackgroundJobsRepository.updateJobStatusGlobal(db, job.id, 'queued', {
            retryCount: nextRetry,
            runAt,
            errorLog: formattedLog,
          });

          return {
            processed: true,
            jobId: job.id,
            queueName: job.queueName,
            status: 'queued',
            error: `Erro retentável (Agendado para ${runAt.toISOString()}): ${errorMessage}`,
          };
        }
      }
    }
  }

  /**
   * Orquestra a delegação do processamento do job para o handler do módulo correto.
   */
  private async executeJobHandler(job: BackgroundJob, ctx: TenantContext): Promise<void> {
    switch (job.queueName) {
      case 'rnds':
        await RndsQueueHandler.handle(job.payload, ctx);
        break;

      default:
        throw new Error(`Nenhum handler registrado para a fila '${job.queueName}'.`);
    }
  }

  /**
   * Analisa a tipagem e características do erro para classificar se é fatal (DLQ imediato)
   * ou se é de rede/infraestrutura (elegível para retentativa).
   */
  private isFatalError(err: any): boolean {
    if (!err) return false;

    // 1. Erro de Validação Clínica da RNDS (HTTP 400/422 FHIR OperationOutcome) é fatal
    if (err instanceof RndsClinicalValidationError || err.name === 'RndsClinicalValidationError') {
      return true;
    }

    // 2. Erro de Infraestrutura/Rede da RNDS (mTLS, socket, timeout, rede) não é fatal (retentável)
    if (err instanceof RndsInfrastructureError || err.name === 'RndsInfrastructureError') {
      return false;
    }

    // 3. Códigos comuns de falha de conexão física/rede no Node/Undici são retentáveis
    const networkCodes = [
      'ECONNRESET',
      'ETIMEDOUT',
      'ENOTFOUND',
      'ECONNREFUSED',
      'EADDRINUSE',
      'EHOSTUNREACH',
      'EPIPE',
      'UND_ERR_CONNECT_TIMEOUT',
      'UND_ERR_HEADERS_TIMEOUT',
    ];

    if (err.code && networkCodes.includes(err.code)) {
      return false;
    }

    // 4. Erros internos do Javascript (erros de sintaxe, nulos, referência) são erros de código e portanto fatais para o job
    if (
      err instanceof TypeError ||
      err instanceof ReferenceError ||
      err instanceof SyntaxError ||
      err instanceof RangeError
    ) {
      return true;
    }

    return false;
  }

  /**
   * Método interno auxiliar para resolver o profissional solicitante da tarefa original
   * e disparar uma notificação inbox (DLQ Humana) resiliente e informativa.
   */
  private async createDeadLetterAlert(db: any, job: BackgroundJob, errorLog: string | null | undefined): Promise<void> {
    try {
      const parsedError = parseJobErrorLog(errorLog);
      const payload = job.payload as Record<string, any>;

      // 1. Tenta resolver o profissional de saúde via participante do encontro (CPF/CNS)
      let requesterId: string | null = null;
      let userRole: any = 'PROFESSIONAL';

      const participant = payload?.encounter?.participant;
      if (participant?.cnsOrCpf) {
        const cleanCpfOrCns = participant.cnsOrCpf.replace(/\D/g, '');
        const [profile] = await db
          .select({ id: profiles.id, role: profiles.role })
          .from(profiles)
          .where(eq(profiles.cpf, cleanCpfOrCns))
          .limit(1);

        if (profile) {
          requesterId = profile.id;
          userRole = profile.role;
        }
      }

      // 2. Redundância: Tenta localizar o paciente e recuperar o criador do PTS associado
      let patientId: string | null = null;
      if (payload?.patient) {
        const p = payload.patient;
        const conditions = [eq(patients.tenantId, job.tenantId)];

        if (p.cpf) {
          conditions.push(eq(patients.cpf, p.cpf.replace(/\D/g, '')));
        } else if (p.cns) {
          conditions.push(eq(patients.cns, p.cns.replace(/\D/g, '')));
        } else if (p.fullName) {
          conditions.push(eq(patients.fullName, p.fullName));
        }

        const [dbPatient] = await db
          .select({ id: patients.id })
          .from(patients)
          .where(and(...conditions))
          .limit(1);

        if (dbPatient) {
          patientId = dbPatient.id;

          if (!requesterId) {
            const [ptsRes] = await db
              .select({ professionalId: ptsResponses.professionalId, createdBy: ptsResponses.createdBy })
              .from(ptsResponses)
              .where(and(eq(ptsResponses.patientId, dbPatient.id), eq(ptsResponses.tenantId, job.tenantId)))
              .limit(1);

            if (ptsRes) {
              requesterId = ptsRes.professionalId || ptsRes.createdBy;
              if (requesterId) {
                const [profile] = await db
                  .select({ role: profiles.role })
                  .from(profiles)
                  .where(eq(profiles.id, requesterId))
                  .limit(1);
                if (profile) {
                  userRole = profile.role;
                }
              }
            }
          }
        }
      }

      // 3. Fallback: Se não encontrarmos o requester no banco, pega o primeiro perfil correspondente
      if (!requesterId) {
        const [fallbackProfile] = await db
          .select({ id: profiles.id, role: profiles.role })
          .from(profiles)
          .limit(1);

        if (fallbackProfile) {
          requesterId = fallbackProfile.id;
          userRole = fallbackProfile.role;
        }
      }

      if (!requesterId) {
        console.warn(`[DEAD_LETTER_ALERT] Não foi possível encontrar nenhum profissional para receber o alerta do job ${job.id}`);
        return;
      }

      // 4. Instancia o NotificationService e salva a notificação inbox
      const ctx: TenantContext = {
        tenantId: job.tenantId,
        userId: requesterId,
        role: userRole,
        activeUnitId: null,
      };

      const notificationService = new NotificationService(ctx);
      await notificationService.createNotification({
        userId: requesterId,
        title: 'Falha no envio para a RNDS',
        message: ErrorParser.toHumanMessage(errorLog),
        type: 'error',
        metadata: {
          jobId: job.id,
          patientId: patientId,
        },
      });
    } catch (alertErr) {
      console.error('[DEAD_LETTER_ALERT] Erro crítico ao criar notificação de falha de job:', alertErr);
    }
  }
}

