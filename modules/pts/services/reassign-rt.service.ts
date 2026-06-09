import { and, eq } from 'drizzle-orm';
import { withTransactionContext } from '@/lib/db/client';
import { withAudit } from '@/lib/audit/with-audit';
import { requireRole, requireTier, ForbiddenError } from '@/lib/auth/authorization';
import { BaseService } from '@/services/base.service';
import type { TenantContext } from '@/lib/tenant-context';
import { tenantMembers, type PtsPlan } from '@/lib/db/schema';
import { PtsPlanRepository } from '../repositories/pts-plan.repository';

export type ReassignRtInput = {
  planId: string;
  newOwnerId: string;
};

const reassignRtAudited = withAudit<ReassignRtInput, PtsPlan>(
  {
    action: 'update',
    entityType: 'pts_plan',
    entityId: (input) => input.planId,
    metadata: (input) => ({ field: 'ownerId', newOwnerId: input.newOwnerId }),
  },
  async (ctx: TenantContext, input: ReassignRtInput): Promise<PtsPlan> => {
    // Reatribuir o Técnico de Referência é ato de gestão sobre o ciclo PTS (Premium).
    requireRole(ctx, 'MANAGER');
    requireTier(ctx, 'PREMIUM');

    const tx = ctx.tx;

    // O novo RT precisa ser membro do município.
    const [member] = await tx
      .select({ userId: tenantMembers.userId })
      .from(tenantMembers)
      .where(and(eq(tenantMembers.userId, input.newOwnerId), eq(tenantMembers.tenantId, ctx.tenantId)))
      .limit(1);

    if (!member) {
      throw new ForbiddenError('O novo Técnico de Referência precisa ser membro do município.');
    }

    const planRepo = new PtsPlanRepository(ctx, tx);
    const updated = await planRepo.updateOwner(input.planId, input.newOwnerId);
    if (!updated) {
      throw new Error('Plano não encontrado ou fora do escopo do município.');
    }
    return updated;
  }
);

export class ReassignRtService extends BaseService {
  async reassign(input: ReassignRtInput): Promise<PtsPlan> {
    return await withTransactionContext(this.ctx.userId, this.ctx.tenantId, async (tx) => {
      const txCtx = { ...this.ctx, tx };
      return reassignRtAudited(txCtx, input);
    });
  }
}
