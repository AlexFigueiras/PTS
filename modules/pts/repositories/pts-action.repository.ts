import { and, eq, asc } from 'drizzle-orm';
import { BaseTenantRepository } from '@/repositories/base.repository';
import type { TenantContext } from '@/lib/tenant-context';
import { ptsActions, type PtsAction } from '@/lib/db/schema';
import type { ActionStatus } from '@pts/domain';

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
}
