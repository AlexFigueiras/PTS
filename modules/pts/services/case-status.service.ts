import { withTransactionContext } from '@/lib/db/client';
import { withAudit } from '@/lib/audit/with-audit';
import { requireAnyRole, ForbiddenError } from '@/lib/auth/authorization';
import { BaseService } from '@/services/base.service';
import type { TenantContext } from '@/lib/tenant-context';
import type { PtsCase } from '@/lib/db/schema';
import { assertCaseTransition, type CaseStatus } from '@pts/domain';
import { PtsCaseRepository } from '../repositories/pts-case.repository';
import { PtsPlanRepository } from '../repositories/pts-plan.repository';

export type TransitionCaseStatusInput = {
  caseId: string;
  nextStatus: CaseStatus;
};

const transitionCaseStatusAudited = withAudit<TransitionCaseStatusInput, PtsCase>(
  {
    action: 'update',
    entityType: 'pts_case',
    entityId: (input) => input.caseId,
    metadata: (input) => ({
      nextStatus: input.nextStatus,
    }),
  },
  async (ctx: TenantContext, input: TransitionCaseStatusInput): Promise<PtsCase> => {
    requireAnyRole(ctx, ['MANAGER', 'PROFESSIONAL']);

    if (!ctx.activeUnitId) {
      throw new ForbiddenError('Acesso negado: o profissional técnico precisa ter uma unidade ativa selecionada.');
    }

    return await withTransactionContext(ctx.userId, ctx.tenantId, async (tx) => {
      const caseRepo = new PtsCaseRepository(ctx, tx);
      const planRepo = new PtsPlanRepository(ctx, tx);

      const ptsCase = await caseRepo.findById(input.caseId);
      if (!ptsCase) {
        throw new Error('Caso intersetorial não encontrado ou fora do escopo deste município.');
      }

      // Resolve minimum owner
      const plans = await planRepo.findByCaseId(input.caseId);
      const hasMinimumOwner = plans.some((p) => p.ownerId !== null);

      // FSM Transition Validation
      assertCaseTransition(ptsCase.status as CaseStatus, input.nextStatus, { hasMinimumOwner });

      // Gate de ativação do Plano
      if (input.nextStatus === 'pts_ativo' || input.nextStatus === 'pia_ativo') {
        const plan = plans.find((p) => p.type === 'PTS') ?? plans[0];
        if (!plan) {
          throw new Error('Plano terapêutico associado ao caso não encontrado.');
        }

        if (!plan.participacaoUsuario) {
          throw new Error('PTS não existe sem o usuário. Registre a participação antes de ativar.');
        }

        if (
          plan.participacaoUsuario === 'dispensado_por_incapacidade' &&
          (!plan.participacaoJustificativa || plan.participacaoJustificativa.trim() === '')
        ) {
          throw new Error('PTS não existe sem o usuário. Registre a participação antes de ativar.');
        }
      }

      const updated = await caseRepo.updateStatus(input.caseId, input.nextStatus);
      if (!updated) {
        throw new Error('Falha ao atualizar o status do caso.');
      }

      return updated;
    });
  }
);

export class CaseStatusService extends BaseService {
  async transitionCaseStatus(input: TransitionCaseStatusInput): Promise<PtsCase> {
    return transitionCaseStatusAudited(this.ctx, input);
  }
}
