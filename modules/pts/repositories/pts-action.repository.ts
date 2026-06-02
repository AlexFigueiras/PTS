import { and, eq, asc, lte, inArray, isNotNull, sql } from 'drizzle-orm';
import { BaseTenantRepository } from '@/repositories/base.repository';
import { getDb } from '@/lib/db/client';
import type { TenantContext } from '@/lib/tenant-context';
import { ptsActions, type PtsAction } from '@/lib/db/schema';
import type { ActionStatus, FrequenciaTipo, HorizonteTipo, AceiteUsuario } from '@pts/domain';

export class PtsActionRepository extends BaseTenantRepository {
  private readonly tx?: any;

  constructor(ctx: TenantContext, tx?: any) {
    super(ctx);
    this.tx = tx;
  }

  protected override get db() {
    return this.tx ?? super.db;
  }

  async createAction(input: {
    planId: string;
    responsibleUnitId: string;
    assignedProfessionalId?: string | null;
    deadline: Date;
    status: ActionStatus;
    description: string;
    evolutionNotes?: string | null;
    dataInicio?: string | null;
    prazofim?: string | null;
    frequenciaTipo?: FrequenciaTipo | null;
    frequenciaDetalhe?: string | null;
    proximoRetorno?: string | null;
    dataProximaReavaliacao?: string | null;
    horizonteTipo?: HorizonteTipo | null;
    aceiteUsuario?: AceiteUsuario | null;
  }): Promise<PtsAction> {
    const [row] = await this.db
      .insert(ptsActions)
      .values({
        tenantId: this.tenantId,
        planId: input.planId,
        responsibleUnitId: input.responsibleUnitId,
        assignedProfessionalId: input.assignedProfessionalId || null,
        deadline: input.deadline,
        status: input.status,
        description: input.description,
        evolutionNotes: input.evolutionNotes || null,
        dataInicio: input.dataInicio || null,
        prazofim: input.prazofim || null,
        frequenciaTipo: input.frequenciaTipo || null,
        frequenciaDetalhe: input.frequenciaDetalhe || null,
        proximoRetorno: input.proximoRetorno || null,
        dataProximaReavaliacao: input.dataProximaReavaliacao || null,
        horizonteTipo: input.horizonteTipo || null,
        aceiteUsuario: input.aceiteUsuario || null,
      })
      .returning();
    return row;
  }

  async updateActionStatus(
    actionId: string,
    status: ActionStatus,
    evolutionNotes?: string | null
  ): Promise<PtsAction | undefined> {
    const [row] = await this.db
      .update(ptsActions)
      .set({
        status,
        ...(evolutionNotes !== undefined && { evolutionNotes }),
        updatedAt: new Date(),
      })
      .where(and(eq(ptsActions.id, actionId), eq(ptsActions.tenantId, this.tenantId)))
      .returning();
    return row;
  }

  async updateDataProximaReavaliacao(
    actionId: string,
    dataProximaReavaliacao: string
  ): Promise<void> {
    await this.db
      .update(ptsActions)
      .set({ dataProximaReavaliacao, updatedAt: new Date() })
      .where(and(eq(ptsActions.id, actionId), eq(ptsActions.tenantId, this.tenantId)));
  }

  async findById(actionId: string): Promise<PtsAction | undefined> {
    const [row] = await this.db
      .select()
      .from(ptsActions)
      .where(and(eq(ptsActions.id, actionId), eq(ptsActions.tenantId, this.tenantId)))
      .limit(1);
    return row;
  }

  async findByPlanId(planId: string): Promise<PtsAction[]> {
    return this.db
      .select()
      .from(ptsActions)
      .where(and(eq(ptsActions.planId, planId), eq(ptsActions.tenantId, this.tenantId)))
      .orderBy(asc(ptsActions.createdAt));
  }

  /**
   * Cross-tenant static finder for the non-compliance cron.
   * Returns active (pactuada|em_andamento) actions whose proximo_retorno
   * is at or before `referenceDate`, across all tenants.
   * Does NOT use BaseTenantRepository — called from the global cron worker.
   */
  static async findActiveActionsOverdue(
    referenceDate: Date,
    limit = 500,
  ): Promise<Array<PtsAction & { planId: string }>> {
    const db = getDb();
    const dateStr = referenceDate.toISOString().split('T')[0]; // YYYY-MM-DD
    return db
      .select()
      .from(ptsActions)
      .where(
        and(
          inArray(ptsActions.status, ['pactuada', 'em_andamento']),
          isNotNull(ptsActions.proximoRetorno),
          lte(ptsActions.proximoRetorno, dateStr),
        ),
      )
      .orderBy(asc(ptsActions.proximoRetorno))
      .limit(limit) as Promise<Array<PtsAction & { planId: string }>>;
  }
}
