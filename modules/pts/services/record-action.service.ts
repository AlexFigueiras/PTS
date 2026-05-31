import { and, eq } from 'drizzle-orm';
import { withTransactionContext } from '@/lib/db/client';
import { ptsActions, type PtsAction } from '@/lib/db/schema';
import { withAudit } from '@/lib/audit/with-audit';
import { requireAnyRole, ForbiddenError } from '@/lib/auth/authorization';
import { BaseService } from '@/services/base.service';
import type { TenantContext } from '@/lib/tenant-context';
import { PtsActionRepository } from '../repositories/pts-action.repository';
import { assertActionTransition, type ActionStatus } from '@pts/domain';

export type CreateActionInput = {
  planId: string;
  responsibleUnitId: string;
  assignedProfessionalId?: string | null;
  deadline: Date;
  description: string;
};

export type TransitionActionInput = {
  actionId: string;
  nextStatus: ActionStatus;
  evolutionNotes?: string | null;
};

const createActionAudited = withAudit<CreateActionInput, PtsAction>(
  {
    action: 'create',
    entityType: 'pts_action',
    entityId: (_, output) => output?.id,
    metadata: (input) => ({
      planId: input.planId,
      responsibleUnitId: input.responsibleUnitId,
      assignedProfessionalId: input.assignedProfessionalId,
    }),
  },
  async (ctx: TenantContext, input: CreateActionInput): Promise<PtsAction> => {
    requireAnyRole(ctx, ['MANAGER', 'PROFESSIONAL']);

    if (!ctx.activeUnitId) {
      throw new ForbiddenError('Acesso negado: o profissional técnico precisa ter uma unidade ativa selecionada.');
    }

    return await withTransactionContext(ctx.userId, ctx.tenantId, async (tx) => {
      const repo = new PtsActionRepository(ctx, tx);
      return await repo.createAction({
        planId: input.planId,
        responsibleUnitId: input.responsibleUnitId,
        assignedProfessionalId: input.assignedProfessionalId || null,
        deadline: input.deadline,
        status: 'pactuada',
        description: input.description,
      });
    });
  }
);

const transitionActionAudited = withAudit<TransitionActionInput, PtsAction>(
  {
    action: 'update',
    entityType: 'pts_action',
    entityId: (input) => input.actionId,
    metadata: (input) => ({
      nextStatus: input.nextStatus,
    }),
  },
  async (ctx: TenantContext, input: TransitionActionInput): Promise<PtsAction> => {
    requireAnyRole(ctx, ['MANAGER', 'PROFESSIONAL']);

    if (!ctx.activeUnitId) {
      throw new ForbiddenError('Acesso negado: o profissional técnico precisa ter uma unidade ativa selecionada.');
    }

    return await withTransactionContext(ctx.userId, ctx.tenantId, async (tx) => {
      const repo = new PtsActionRepository(ctx, tx);
      const action = await repo.findById(input.actionId);
      if (!action) {
        throw new Error('Ação pactuada não encontrada ou fora do escopo deste município.');
      }

      // Validação de Transição Estrita usando FSM do @pts/domain
      assertActionTransition(action.status, input.nextStatus);

      const updated = await repo.updateActionStatus(input.actionId, input.nextStatus, input.evolutionNotes);
      if (!updated) {
        throw new Error('Falha ao atualizar o status da ação.');
      }
      return updated;
    });
  }
);

export class RecordActionService extends BaseService {
  async createAction(input: CreateActionInput): Promise<PtsAction> {
    return createActionAudited(this.ctx, input);
  }

  async transitionAction(input: TransitionActionInput): Promise<PtsAction> {
    return transitionActionAudited(this.ctx, input);
  }
}
