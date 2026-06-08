import { and, eq, inArray } from 'drizzle-orm';
import { withTransactionContext } from '@/lib/db/client';
import {
  ptsCases,
  ptsPlans,
  serviceUnits,
  type PtsSignal,
} from '@/lib/db/schema';
import { withAudit } from '@/lib/audit/with-audit';
import { requireRole, requireAnyRole, ForbiddenError } from '@/lib/auth/authorization';
import { BaseService } from '@/services/base.service';
import type { TenantContext } from '@/lib/tenant-context';
import { BackgroundJobsRepository } from '@/modules/jobs/repositories/background-jobs.repository';
import { PtsSignalRepository } from '../repositories/pts-signal.repository';
import {
  assertSignalTransition,
  getComponentsForNeed,
  type SignalPriority,
  type SignalStatus,
} from '@pts/domain';

const ACTIVE_CASE_STATUSES = [
  'radar',
  'observacao',
  'acompanhamento',
  'pts_ativo',
  'pia_ativo',
] as const;

const SIGNAL_NOTIFICATION_QUEUE = 'signal_notifications';

export type CreateSignalInput = {
  caseId: string;
  needTypeId: string;
  priority: SignalPriority;
  abstractReason: string;
};

/**
 * Resultado de uma transição. Devolve o sinal atualizado (último estado).
 */
type SignalResult = PtsSignal;

/* ------------------------------------------------------------------ */
/*  Helpers internos                                                   */
/* ------------------------------------------------------------------ */

/**
 * Resolve o owner (Técnico de Referência) do plano do caso.
 */
async function resolveRtUserId(tx: any, ctx: TenantContext, caseId: string): Promise<string | null> {
  const plans = await tx
    .select({ ownerId: ptsPlans.ownerId, type: ptsPlans.type })
    .from(ptsPlans)
    .where(and(eq(ptsPlans.caseId, caseId), eq(ptsPlans.tenantId, ctx.tenantId)));
  const pts = plans.find((p: any) => p.type === 'PTS') ?? plans[0];
  return pts?.ownerId ?? null;
}

/**
 * Carrega um sinal e valida que pertence ao tenant. Lança se ausente.
 */
async function loadSignal(repo: PtsSignalRepository, signalId: string): Promise<PtsSignal> {
  const signal = await repo.findById(signalId);
  if (!signal) {
    throw new Error('Sinalização não encontrada ou fora do escopo deste município.');
  }
  return signal;
}

/* ------------------------------------------------------------------ */
/*  Operações auditadas                                                */
/* ------------------------------------------------------------------ */

const createSignalAudited = withAudit<CreateSignalInput, PtsSignal>(
  {
    action: 'create',
    entityType: 'pts_signal',
    entityId: (_, output) => output?.id,
    metadata: (input) => ({ caseId: input.caseId, needTypeId: input.needTypeId, priority: input.priority }),
  },
  async (ctx: TenantContext, input: CreateSignalInput): Promise<PtsSignal> => {
    requireAnyRole(ctx, ['MANAGER', 'PROFESSIONAL']);

    if (!ctx.activeUnitId) {
      throw new ForbiddenError(
        'Acesso negado: o profissional precisa ter uma unidade de atuação ativa para criar sinalizações.',
      );
    }

    // 1. Caso ativo do tenant
    const [activeCase] = await ctx.tx
      .select()
      .from(ptsCases)
      .where(
        and(
          eq(ptsCases.id, input.caseId),
          eq(ptsCases.tenantId, ctx.tenantId),
          inArray(ptsCases.status, [...ACTIVE_CASE_STATUSES]),
        ),
      )
      .limit(1);

    if (!activeCase) {
      throw new Error('Caso intersetorial não encontrado ou não está ativo.');
    }

    // 2. Roteamento: necessidade -> componentes -> unidade da rede no tenant
    const components = getComponentsForNeed(input.needTypeId);
    if (components.length === 0) {
      throw new Error('Tipo de necessidade desconhecido — sem componente da rede mapeado.');
    }

    const candidateUnits = await ctx.tx
      .select({ id: serviceUnits.id, componentId: serviceUnits.componentId })
      .from(serviceUnits)
      .where(
        and(
          eq(serviceUnits.tenantId, ctx.tenantId),
          inArray(serviceUnits.componentId, [...components]),
        ),
      );

    // Escolhe a unidade respeitando a ordem de preferência do catálogo.
    let destinationComponent = components[0];
    let destinationUnitId: string | null = null;
    for (const component of components) {
      const match = candidateUnits.find((u: any) => u.componentId === component);
      if (match) {
        destinationComponent = component;
        destinationUnitId = match.id;
        break;
      }
    }

    const repo = new PtsSignalRepository(ctx);
    return await repo.create({
      caseId: input.caseId,
      authorId: ctx.userId,
      sourceUnitId: ctx.activeUnitId!,
      needTypeId: input.needTypeId,
      destinationComponent,
      destinationUnitId,
      priority: input.priority,
      abstractReason: input.abstractReason,
    });
  }
);

/**
 * Constrói uma operação de transição auditada genérica.
 */
function buildTransition(
  computeTarget: (signal: PtsSignal, ctx: TenantContext, rtUserId: string | null) => {
    to: SignalStatus;
    actorIsAuthor: boolean;
    actorIsRt: boolean;
    extras?: Parameters<PtsSignalRepository['updateStatus']>[2];
    /** Se true, enfileira notificação no outbox após chegar a `encaminhada`. */
    notify?: boolean;
    /** Transição extra encadeada (ex.: imediata colapsa para `encaminhada`). */
    chain?: (signal: PtsSignal) => { to: SignalStatus; actorIsAuthor: boolean; actorIsRt: boolean; notify?: boolean } | null;
  },
  guard?: (ctx: TenantContext) => void,
) {
  return async (ctx: TenantContext, signalId: string): Promise<SignalResult> => {
    if (guard) guard(ctx);

    const repo = new PtsSignalRepository(ctx);
    const signal = await loadSignal(repo, signalId);
    const rtUserId = await resolveRtUserId(ctx.tx, ctx, signal.caseId);

    const target = computeTarget(signal, ctx, rtUserId);

    // Valida FSM + gate de papéis no domínio puro.
    assertSignalTransition(signal.status, target.to, {
      priority: signal.priority,
      actorIsAuthor: target.actorIsAuthor,
      actorIsRt: target.actorIsRt,
    });

    let updated = await repo.updateStatus(signalId, target.to, target.extras ?? {});
    if (!updated) throw new Error('Falha ao atualizar a sinalização.');

    if (target.notify && updated.destinationUnitId) {
      await new BackgroundJobsRepository(ctx).enqueueJob(
        SIGNAL_NOTIFICATION_QUEUE,
        { signalId: updated.id, destinationUnitId: updated.destinationUnitId, caseId: updated.caseId },
        { tx: ctx.tx },
      );
    }

    // Encadeamento (via imediata: confirmada -> encaminhada num único passo).
    const chained = target.chain?.(updated);
    if (chained) {
      assertSignalTransition(updated.status, chained.to, {
        priority: updated.priority,
        actorIsAuthor: chained.actorIsAuthor,
        actorIsRt: chained.actorIsRt,
      });
      const next = await repo.updateStatus(signalId, chained.to);
      if (!next) throw new Error('Falha ao encaminhar a sinalização.');
      updated = next;

      if (chained.notify && updated.destinationUnitId) {
        await new BackgroundJobsRepository(ctx).enqueueJob(
          SIGNAL_NOTIFICATION_QUEUE,
          { signalId: updated.id, destinationUnitId: updated.destinationUnitId, caseId: updated.caseId },
          { tx: ctx.tx },
        );
      }
    }

    return updated;
  };
}

const auditTransition = (action: 'update', fn: (ctx: TenantContext, signalId: string) => Promise<SignalResult>) =>
  withAudit<string, SignalResult>(
    {
      action,
      entityType: 'pts_signal',
      entityId: (signalId) => signalId,
      metadata: (_, output) => ({ status: output?.status }),
    },
    fn,
  );

const confirmSignalFn = buildTransition((signal, ctx) => ({
  to: 'confirmada_pelo_autor' as SignalStatus,
  actorIsAuthor: signal.authorId === ctx.userId,
  actorIsRt: false,
  // Via imediata colapsa direto para encaminhada (RT notificada, não bloqueia).
  chain: (s) =>
    s.priority === 'imediata'
      ? { to: 'encaminhada' as SignalStatus, actorIsAuthor: true, actorIsRt: false, notify: true }
      : null,
}));

const discardSignalFn = buildTransition((signal, ctx) => ({
  to: 'descartada' as SignalStatus,
  actorIsAuthor: signal.authorId === ctx.userId,
  actorIsRt: false,
}));

const submitForRtFn = buildTransition((signal, ctx, rtUserId) => ({
  to: 'aguardando_validacao_rt' as SignalStatus,
  actorIsAuthor: signal.authorId === ctx.userId,
  actorIsRt: rtUserId != null && rtUserId === ctx.userId,
}));

const validateByRtFn = buildTransition((signal, ctx, rtUserId) => ({
  to: 'encaminhada' as SignalStatus,
  actorIsAuthor: signal.authorId === ctx.userId,
  actorIsRt: rtUserId != null && rtUserId === ctx.userId,
  extras: { rtValidatorId: ctx.userId },
  notify: true,
}));

const receiveSignalFn = buildTransition((_signal) => ({
  to: 'recebida' as SignalStatus,
  actorIsAuthor: false,
  actorIsRt: false,
}));

const startTreatmentFn = buildTransition((_signal) => ({
  to: 'em_tratamento' as SignalStatus,
  actorIsAuthor: false,
  actorIsRt: false,
}));

/* ------------------------------------------------------------------ */
/*  Serviço                                                            */
/* ------------------------------------------------------------------ */

export class SignalService extends BaseService {
  async createSignal(input: CreateSignalInput): Promise<PtsSignal> {
    return await withTransactionContext(this.ctx.userId, this.ctx.tenantId, async (tx) => {
      const txCtx = { ...this.ctx, tx };
      return createSignalAudited(txCtx, input);
    });
  }

  async confirmSignal(signalId: string): Promise<PtsSignal> {
    return await withTransactionContext(this.ctx.userId, this.ctx.tenantId, async (tx) => {
      const txCtx = { ...this.ctx, tx };
      return auditTransition('update', confirmSignalFn)(txCtx, signalId);
    });
  }

  async discardSignal(signalId: string): Promise<PtsSignal> {
    return await withTransactionContext(this.ctx.userId, this.ctx.tenantId, async (tx) => {
      const txCtx = { ...this.ctx, tx };
      return auditTransition('update', discardSignalFn)(txCtx, signalId);
    });
  }

  async submitForRtValidation(signalId: string): Promise<PtsSignal> {
    return await withTransactionContext(this.ctx.userId, this.ctx.tenantId, async (tx) => {
      const txCtx = { ...this.ctx, tx };
      return auditTransition('update', submitForRtFn)(txCtx, signalId);
    });
  }

  async validateByRt(signalId: string): Promise<PtsSignal> {
    return await withTransactionContext(this.ctx.userId, this.ctx.tenantId, async (tx) => {
      const txCtx = { ...this.ctx, tx };
      return auditTransition('update', validateByRtFn)(txCtx, signalId);
    });
  }

  async receiveSignal(signalId: string): Promise<PtsSignal> {
    return await withTransactionContext(this.ctx.userId, this.ctx.tenantId, async (tx) => {
      const txCtx = { ...this.ctx, tx };
      return auditTransition('update', receiveSignalFn)(txCtx, signalId);
    });
  }

  async startTreatment(signalId: string): Promise<PtsSignal> {
    return await withTransactionContext(this.ctx.userId, this.ctx.tenantId, async (tx) => {
      const txCtx = { ...this.ctx, tx };
      return auditTransition('update', startTreatmentFn)(txCtx, signalId);
    });
  }

  async resolveSignal(signalId: string, notes?: string | null): Promise<PtsSignal> {
    const fn = buildTransition(() => ({
      to: 'resolvida' as SignalStatus,
      actorIsAuthor: false,
      actorIsRt: false,
      extras: { resolvedAt: new Date(), resolutionNotes: notes ?? null },
    }));
    return await withTransactionContext(this.ctx.userId, this.ctx.tenantId, async (tx) => {
      const txCtx = { ...this.ctx, tx };
      return auditTransition('update', fn)(txCtx, signalId);
    });
  }

  /**
   * Gerente distribui a sinalização a um profissional da unidade destino.
   * Não altera o status da FSM — apenas a atribuição.
   */
  async assignProfessional(signalId: string, professionalId: string): Promise<PtsSignal> {
    const fn = withAudit<{ signalId: string; professionalId: string }, PtsSignal>(
      {
        action: 'update',
        entityType: 'pts_signal',
        entityId: (input) => input.signalId,
        metadata: (input) => ({ assignedProfessionalId: input.professionalId }),
      },
      async (c, input): Promise<PtsSignal> => {
        requireRole(c, 'MANAGER');
        if (!c.activeUnitId) {
          throw new ForbiddenError('Acesso negado: selecione a unidade ativa para distribuir sinalizações.');
        }

        const repo = new PtsSignalRepository(c);
        const signal = await loadSignal(repo, input.signalId);

        if (signal.destinationUnitId !== c.activeUnitId) {
          throw new ForbiddenError(
            'Acesso negado: só é possível distribuir sinalizações direcionadas à sua unidade ativa.',
          );
        }

        const updated = await repo.assignProfessional(input.signalId, input.professionalId);
        if (!updated) throw new Error('Falha ao atribuir o profissional.');
        return updated;
      },
    );
    return await withTransactionContext(this.ctx.userId, this.ctx.tenantId, async (tx) => {
      const txCtx = { ...this.ctx, tx };
      return fn(txCtx, { signalId, professionalId });
    });
  }
}
