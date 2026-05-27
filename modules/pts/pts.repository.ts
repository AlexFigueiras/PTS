import { and, count, desc, eq, sql } from 'drizzle-orm';
import { BaseTenantRepository } from '@/repositories/base.repository';
import {
  ptsResponses,
  intersectoralTasks,
  type PtsResponse,
  type IntersectoralTask,
  type NewIntersectoralTask,
  type ServiceUnitType,
} from '@/lib/db/schema';
import { buildFilters } from '@/lib/db/filters';
import {
  getPaginationOffset,
  toPaginatedResult,
  type PaginationParams,
  type PaginatedResult,
} from '@/lib/pagination';
import {
  type SdohObservationInput,
  type TaskStatus,
  type IntersectoralTaskInsertInput,
} from './pts.dto';

type ListTasksFilters = PaginationParams & {
  status?: TaskStatus;
};

/**
 * Repositório especializado para operações do ciclo do PTS.
 * Herda o isolamento estrito de Multi-Tenant do município através da classe BaseTenantRepository.
 */
export class PtsRepository extends BaseTenantRepository {
  private readonly tx?: any;

  constructor(ctx: TenantContext, tx?: any) {
    super(ctx);
    this.tx = tx;
  }

  protected override get db() {
    return this.tx ?? super.db;
  }

  /**
   * Salva ou atualiza as observações estáticas de triagem social (SDoH)
   * de forma 100% atômica e idempotente no PostgreSQL (True Idempotency).
   *
   * Utiliza um UPSERT (.onConflictDoUpdate) baseado na chave composta (patient_id, tenant_id)
   * para eliminar qualquer condição de corrida de criação inicial síncrona.
   *
   * Garante a não duplicação por retry através de uma expressão SQL que faz
   * a descompactação das observações antigas e novas, aplica um DISTINCT ON no 'code' LOINC
   * (preservando o emitido mais recente via ORDER BY issuedAt DESC) e reagrupa o array de volta.
   */
  async saveSdohObservations(
    patientId: string,
    observations: SdohObservationInput[],
    userId?: string,
    unitId?: string | null,
    unitType?: ServiceUnitType | null,
  ): Promise<PtsResponse> {
    const observationsJson = JSON.stringify(observations);

    const [row] = await this.db
      .insert(ptsResponses)
      .values({
        tenantId: this.tenantId,
        patientId,
        status: 'draft',
        data: {
          sdohObservations: observations,
        },
        unitId: unitId ?? null,
        unitType: unitType ?? null,
        ...(userId && { professionalId: userId, createdBy: userId }),
      })
      .onConflictDoUpdate({
        target: [ptsResponses.tenantId, ptsResponses.patientId],
        set: {
          data: sql`jsonb_set(
            coalesce(${ptsResponses.data}, '{}'::jsonb),
            '{sdohObservations}',
            coalesce(
              (
                SELECT jsonb_agg(elem)
                FROM (
                  SELECT DISTINCT ON (elem->>'code') elem
                  FROM (
                    SELECT jsonb_array_elements(coalesce(${ptsResponses.data}->'sdohObservations', '[]'::jsonb)) AS elem
                    UNION ALL
                    SELECT jsonb_array_elements(${observationsJson}::jsonb) AS elem
                  ) sub_union
                  ORDER BY elem->>'code', elem->>'issuedAt' DESC
                ) sub_distinct
              ),
              '[]'::jsonb
            ),
            true
          )`,
          updatedAt: new Date(),
          ...(userId && { professionalId: userId }),
          ...(unitId !== undefined && { unitId }),
          ...(unitType !== undefined && { unitType }),
        },
      })
      .returning();

    return row;
  }

  /**
   * Cria uma nova Tarefa Intersetorial (encaminhamento warm handoff)
   * na tabela física e normalizada, forçando o tenantId isolado.
   */
  async createTask(input: Omit<IntersectoralTaskInsertInput, 'tenantId'>): Promise<IntersectoralTask> {
    const [row] = await this.db
      .insert(intersectoralTasks)
      .values({
        ...input,
        tenantId: this.tenantId,
      } as NewIntersectoralTask)
      .returning();
    return row;
  }

  /**
   * Atualiza as propriedades e status de uma Tarefa Intersetorial
   * respeitando estritamente o escopo do tenant ativo.
   */
  async updateTask(
    id: string,
    input: Partial<Omit<IntersectoralTaskInsertInput, 'tenantId' | 'id'>>,
  ): Promise<IntersectoralTask | undefined> {
    const [row] = await this.db
      .update(intersectoralTasks)
      .set({
        ...input,
        updatedAt: new Date(),
      })
      .where(and(eq(intersectoralTasks.id, id), eq(intersectoralTasks.tenantId, this.tenantId)))
      .returning();
    return row;
  }

  /**
   * Encontra uma Tarefa Intersetorial pelo ID dentro do tenant ativo.
   */
  async findTaskById(id: string): Promise<IntersectoralTask | undefined> {
    const [row] = await this.db
      .select()
      .from(intersectoralTasks)
      .where(and(eq(intersectoralTasks.id, id), eq(intersectoralTasks.tenantId, this.tenantId)))
      .limit(1);
    return row;
  }

  /**
   * Consulta especializada para listar a fila de encaminhamentos de entrada
   * de uma Unidade de Serviço específica, com filtros de status e ordenação compostos:
   * por prioridade decrescente do FHIR mapeada determinística e indestrutivelmente via CASE WHEN nativo:
   * (asap -> 4, stat -> 3, urgent -> 2, routine -> 1), seguido por criação descendente.
   */
  async listTasksByTargetUnit(
    targetUnitId: string,
    filters: ListTasksFilters,
  ): Promise<PaginatedResult<IntersectoralTask>> {
    const where = buildFilters(
      eq(intersectoralTasks.tenantId, this.tenantId),
      eq(intersectoralTasks.targetUnitId, targetUnitId),
      filters.status ? eq(intersectoralTasks.status, filters.status) : undefined,
    );

    const offset = getPaginationOffset(filters);

    const [rows, [{ value: total }]] = await Promise.all([
      this.db
        .select()
        .from(intersectoralTasks)
        .where(where)
        .orderBy(
          sql`CASE 
            WHEN ${intersectoralTasks.priority} = 'asap' THEN 4
            WHEN ${intersectoralTasks.priority} = 'stat' THEN 3
            WHEN ${intersectoralTasks.priority} = 'urgent' THEN 2
            WHEN ${intersectoralTasks.priority} = 'routine' THEN 1
            ELSE 0
          END DESC`,
          desc(intersectoralTasks.createdAt),
        )
        .limit(filters.pageSize)
        .offset(offset),
      this.db.select({ value: count() }).from(intersectoralTasks).where(where),
    ]);

    return toPaginatedResult(rows, Number(total), filters);
  }
}
