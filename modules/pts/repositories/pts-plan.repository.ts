import { and, eq } from 'drizzle-orm';
import { BaseTenantRepository } from '@/repositories/base.repository';
import type { TenantContext } from '@/lib/tenant-context';
import { ptsPlans, type PtsPlan } from '@/lib/db/schema';
import type { NivelIntensidade } from '@pts/domain';

export class PtsPlanRepository extends BaseTenantRepository {
  private readonly tx?: any;

  constructor(ctx: TenantContext, tx?: any) {
    super(ctx);
    this.tx = tx;
  }

  protected override get db() {
    return this.tx ?? super.db;
  }

  async createPlan(
    caseId: string,
    type: 'PTS' | 'PIA',
    ownerId: string,
    metadata?: {
      legalMeasure?: string | null;
      mandatoryReviewDate?: Date | null;
    }
  ): Promise<PtsPlan> {
    const [row] = await this.db
      .insert(ptsPlans)
      .values({
        tenantId: this.tenantId,
        caseId,
        type,
        ownerId,
        legalMeasure: metadata?.legalMeasure ?? null,
        mandatoryReviewDate: metadata?.mandatoryReviewDate ?? null,
      })
      .returning();
    return row;
  }

  async findById(planId: string): Promise<PtsPlan | undefined> {
    const [row] = await this.db
      .select()
      .from(ptsPlans)
      .where(and(eq(ptsPlans.id, planId), eq(ptsPlans.tenantId, this.tenantId)))
      .limit(1);
    return row;
  }

  async findByCaseId(caseId: string): Promise<PtsPlan[]> {
    return this.db
      .select()
      .from(ptsPlans)
      .where(and(eq(ptsPlans.caseId, caseId), eq(ptsPlans.tenantId, this.tenantId)));
  }

  async updateNivelIntensidade(planId: string, nivel: NivelIntensidade): Promise<PtsPlan | undefined> {
    const [row] = await this.db
      .update(ptsPlans)
      .set({ nivelIntensidade: nivel, updatedAt: new Date() })
      .where(and(eq(ptsPlans.id, planId), eq(ptsPlans.tenantId, this.tenantId)))
      .returning();
    return row;
  }

  async updateParticipation(
    planId: string,
    participacao: 'presente' | 'representado_familia' | 'dispensado_por_incapacidade',
    justificativa: string | null
  ): Promise<PtsPlan | undefined> {
    const [row] = await this.db
      .update(ptsPlans)
      .set({
        participacaoUsuario: participacao,
        participacaoJustificativa: justificativa,
        updatedAt: new Date(),
      })
      .where(and(eq(ptsPlans.id, planId), eq(ptsPlans.tenantId, this.tenantId)))
      .returning();
    return row;
  }

  /** Reatribui o Técnico de Referência (owner) do plano. */
  async updateOwner(planId: string, newOwnerId: string): Promise<PtsPlan | undefined> {
    const [row] = await this.db
      .update(ptsPlans)
      .set({ ownerId: newOwnerId, updatedAt: new Date() })
      .where(and(eq(ptsPlans.id, planId), eq(ptsPlans.tenantId, this.tenantId)))
      .returning();
    return row;
  }
}
