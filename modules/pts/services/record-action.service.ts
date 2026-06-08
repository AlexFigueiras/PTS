import { withTransactionContext } from '@/lib/db/client';
import { ptsActions, type PtsAction } from '@/lib/db/schema';
import { withAudit } from '@/lib/audit/with-audit';
import { requireAnyRole, ForbiddenError } from '@/lib/auth/authorization';
import { BaseService } from '@/services/base.service';
import type { TenantContext } from '@/lib/tenant-context';
import { PtsActionRepository } from '../repositories/pts-action.repository';
import { assertActionTransition, type ActionStatus, type FrequenciaTipo, type HorizonteTipo, type AceiteUsuario } from '@pts/domain';

export type CreateActionInput = {
  planId: string;
  responsibleUnitId: string;
  assignedProfessionalId?: string | null;
  deadline: Date;
  description: string;
  // Campos temporais obrigatórios ao pactuar (§5.6)
  dataInicio?: string | null;
  prazofim?: string | null;
  frequenciaTipo?: FrequenciaTipo | null;
  frequenciaDetalhe?: string | null;
  proximoRetorno?: string | null;
  dataProximaReavaliacao?: string | null;
  horizonteTipo?: HorizonteTipo | null;
  aceiteUsuario?: AceiteUsuario | null;
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
      prazofim: input.prazofim,
      frequenciaTipo: input.frequenciaTipo,
      dataProximaReavaliacao: input.dataProximaReavaliacao,
    }),
  },
  async (ctx: TenantContext, input: CreateActionInput): Promise<PtsAction> => {
    requireAnyRole(ctx, ['MANAGER', 'PROFESSIONAL']);

    if (!ctx.activeUnitId) {
      throw new ForbiddenError('Acesso negado: o profissional técnico precisa ter uma unidade ativa selecionada.');
    }

    const repo = new PtsActionRepository(ctx);
    const isRefused = input.aceiteUsuario === 'recusa' || input.aceiteUsuario === 'repactuar';
    const status = isRefused ? 'bloqueada' : 'pactuada';
    const notes = isRefused ? 'Repactuação pendente' : null;

    return await repo.createAction({
      planId: input.planId,
      responsibleUnitId: input.responsibleUnitId,
      assignedProfessionalId: input.assignedProfessionalId || null,
      deadline: input.deadline,
      status,
      description: input.description,
      dataInicio: input.dataInicio,
      prazofim: input.prazofim,
      frequenciaTipo: input.frequenciaTipo,
      frequenciaDetalhe: input.frequenciaDetalhe,
      proximoRetorno: input.proximoRetorno,
      dataProximaReavaliacao: input.dataProximaReavaliacao,
      horizonteTipo: input.horizonteTipo,
      aceiteUsuario: input.aceiteUsuario,
      evolutionNotes: notes,
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

    const repo = new PtsActionRepository(ctx);
    const action = await repo.findById(input.actionId);
    if (!action) {
      throw new Error('Ação pactuada não encontrada ou fora do escopo deste município.');
    }

    if (
      (action.aceiteUsuario === 'recusa' || action.aceiteUsuario === 'repactuar') &&
      (input.nextStatus === 'pactuada' || input.nextStatus === 'em_andamento')
    ) {
      throw new Error('Ação bloqueada: o aceite do usuário é recusa ou pendente de repactuação.');
    }

    assertActionTransition(action.status, input.nextStatus);

    const updated = await repo.updateActionStatus(input.actionId, input.nextStatus, input.evolutionNotes);
    if (!updated) {
      throw new Error('Falha ao atualizar o status da ação.');
    }
    return updated;
  }
);

export class RecordActionService extends BaseService {
  async createAction(input: CreateActionInput): Promise<PtsAction> {
    return await withTransactionContext(this.ctx.userId, this.ctx.tenantId, async (tx) => {
      const txCtx = { ...this.ctx, tx };
      return createActionAudited(txCtx, input);
    });
  }

  async transitionAction(input: TransitionActionInput): Promise<PtsAction> {
    return await withTransactionContext(this.ctx.userId, this.ctx.tenantId, async (tx) => {
      const txCtx = { ...this.ctx, tx };
      return transitionActionAudited(txCtx, input);
    });
  }
}
