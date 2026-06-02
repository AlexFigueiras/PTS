/**
 * IntensityLevelService — §5.8 do plano
 *
 * Governa a transição de nível de intensidade do cuidado:
 *   intensivo → manutencao_semestral → manutencao_anual → alta_continuidade
 *
 * Regras:
 *  1. Apenas o RT do plano (ownerId) pode confirmar uma transição.
 *  2. Transições são validadas contra NIVEL_TRANSITIONS (progressão ou regressão para intensivo).
 *  3. Ao atingir alta_continuidade, o caso é ARQUIVADO (nunca deletado — trilha preservada).
 *  4. A sugestão de transição (quando todas as metas do período foram cumpridas) gera uma
 *     sinalização `sugerida` no motor existente — humano-no-loop: RT confirma com um clique.
 */
import { withTransactionContext } from '@/lib/db/client';
import { withAudit } from '@/lib/audit/with-audit';
import { requireAnyRole, ForbiddenError } from '@/lib/auth/authorization';
import { BaseService } from '@/services/base.service';
import type { TenantContext } from '@/lib/tenant-context';
import type { PtsPlan } from '@/lib/db/schema';
import {
  NIVEL_TRANSITIONS,
  NIVEL_INTENSIDADE_LABELS,
  type NivelIntensidade,
} from '@pts/domain';
import { PtsPlanRepository } from '../repositories/pts-plan.repository';
import { PtsCaseRepository } from '../repositories/pts-case.repository';
import { PtsSignalRepository } from '../repositories/pts-signal.repository';
import { PtsActionRepository } from '../repositories/pts-action.repository';
import { getLogger } from '@/lib/logger';

const log = getLogger({ service: 'IntensityLevelService' });

export type TransitionInput = {
  planId: string;
  toNivel: NivelIntensidade;
};

export type SuggestTransitionInput = {
  planId: string;
};

const transitionAudited = withAudit<TransitionInput, PtsPlan>(
  {
    action: 'update',
    entityType: 'pts_plan_nivel_intensidade',
    entityId: (_, output) => output?.id,
    metadata: (input) => ({ planId: input.planId, toNivel: input.toNivel }),
  },
  async (ctx: TenantContext, input: TransitionInput): Promise<PtsPlan> => {
    requireAnyRole(ctx, ['MANAGER', 'PROFESSIONAL']);

    return await withTransactionContext(ctx.userId, ctx.tenantId, async (tx) => {
      const planRepo = new PtsPlanRepository(ctx, tx);
      const caseRepo = new PtsCaseRepository(ctx, tx);

      const plan = await planRepo.findById(input.planId);
      if (!plan) {
        throw new Error('Plano não encontrado ou fora do escopo deste município.');
      }

      // Only the RT (plan owner) can confirm a nivel transition
      if (plan.ownerId && plan.ownerId !== ctx.userId) {
        throw new ForbiddenError(
          'Somente o Técnico de Referência (RT) do plano pode confirmar a transição de nível.',
        );
      }

      const allowed = NIVEL_TRANSITIONS[plan.nivelIntensidade];
      if (!allowed.includes(input.toNivel)) {
        throw new Error(
          `Transição inválida: ${NIVEL_INTENSIDADE_LABELS[plan.nivelIntensidade]} → ${NIVEL_INTENSIDADE_LABELS[input.toNivel]}. ` +
          `Transições permitidas: ${allowed.map((n) => NIVEL_INTENSIDADE_LABELS[n]).join(', ') || 'nenhuma (estado terminal)'}.`,
        );
      }

      const updated = await planRepo.updateNivelIntensidade(input.planId, input.toNivel);
      if (!updated) throw new Error('Falha ao atualizar nível de intensidade.');

      // If reaching alta_continuidade, archive the case (terminal state)
      if (input.toNivel === 'alta_continuidade') {
        await caseRepo.archiveCase(plan.caseId);
        log.info({ planId: input.planId, caseId: plan.caseId }, 'Caso arquivado por alta por continuidade');
      }

      return updated;
    });
  },
);

/**
 * Checks if all active actions in the plan have been completed (cumpriu/cumpriu_parcial)
 * within the current intensity period, and if so creates a suggestion signal for RT.
 * Called by the cron (daily) or after a reavaliação concludes.
 */
async function suggestTransitionIfEligible(
  ctx: TenantContext,
  planId: string,
): Promise<boolean> {
  const db = (await import('@/lib/db/client')).getDb();

  const planRepo = new PtsPlanRepository(ctx);
  const plan = await planRepo.findById(planId);
  if (!plan) return false;

  // No suggestion for terminal state or if no RT is assigned
  if (plan.nivelIntensidade === 'alta_continuidade') return false;
  const nextNivel = NIVEL_TRANSITIONS[plan.nivelIntensidade][0];
  if (!nextNivel) return false;

  // Check if all active actions are concluded
  const actionRepo = new PtsActionRepository(ctx);
  const actions = await actionRepo.findByPlanId(planId);
  const activeActions = actions.filter((a) => a.status === 'pactuada' || a.status === 'em_andamento');

  // Only suggest when all actions are settled (zero active)
  if (activeActions.length > 0) return false;

  // Check if there's already an open transition suggestion signal for this plan
  const signalRepo = new PtsSignalRepository(ctx);
  const existingCaseSigs = await signalRepo.findByCaseId(plan.caseId);
  const alreadySuggested = existingCaseSigs.some(
    (s) =>
      s.abstractReason.includes('Sugestão de transição') &&
      !['descartada', 'resolvida'].includes(s.status),
  );
  if (alreadySuggested) return false;

  // Determine RT or fallback author
  const authorId = plan.ownerId ?? ctx.userId;
  const fromLabel = NIVEL_INTENSIDADE_LABELS[plan.nivelIntensidade];
  const toLabel = NIVEL_INTENSIDADE_LABELS[nextNivel];

  await signalRepo.create({
    caseId: plan.caseId,
    authorId,
    sourceUnitId: ctx.activeUnitId ?? '',
    needTypeId: 'acompanhamento_terapeutico',
    destinationComponent: 'CAPS', // RT confirms; destination is symbolic
    destinationUnitId: null,
    priority: 'pactuada',
    abstractReason:
      `Sugestão de transição de nível: ${fromLabel} → ${toLabel}. ` +
      `Todas as metas do período foram concluídas. O Técnico de Referência deve confirmar ou descartar.`,
    signalSubtype: null,
  });

  log.info({ planId, fromLabel, toLabel }, 'Sugestão de transição de nível criada');
  return true;
}

export class IntensityLevelService extends BaseService {
  async transitionNivel(input: TransitionInput): Promise<PtsPlan> {
    return transitionAudited(this.ctx, input);
  }

  async suggestTransitionIfEligible(planId: string): Promise<boolean> {
    return suggestTransitionIfEligible(this.ctx, planId);
  }
}
