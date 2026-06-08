'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { getActiveTenantContext } from '@/lib/auth/get-tenant-context';
import { revalidateTenantResource } from '@/lib/cache';
import { getLogger } from '@/lib/logger';
import { ForbiddenError, hasTier } from '@/lib/auth/authorization';
import { IntersectoralTaskService } from './services/intersectoral-task.service';
import { InitializeCaseService } from './services/initialize-case.service';
import { RecordActionService } from './services/record-action.service';
import { ReavaliacaoService } from './services/reavaliacao.service';
import { SignalService } from './services/signal.service';
import { IntensityLevelService } from './services/intensity-level.service';
import { CaseStatusService } from './services/case-status.service';
import { EncontroService } from './services/encontro.service';
import { PtsRepository } from './pts.repository';
import { PtsPlanRepository } from './repositories/pts-plan.repository';
import { PtsEncontroRepository } from './repositories/pts-encontro.repository';
import { intersectoralTaskInsertSchema, type TaskStatus } from './pts.dto';
import { NIVEL_INTENSIDADE_VALORES } from '@pts/domain';



export type CreateTaskInput = {
  patientId: string;
  intent?: 'proposal' | 'plan' | 'order' | 'original-order';
  priority?: 'routine' | 'urgent' | 'stat' | 'asap';
  description: string;
  targetUnitId: string;
};

/**
 * Cria um novo encaminhamento intersetorial protegido contra Client-Input Spoofing.
 * Delega toda a inteligência transacional de persistência e Transactional Outbox (RNDS) para a camada de serviços.
 */
export async function createIntersectoralTaskAction(input: CreateTaskInput) {
  const ctx = await getActiveTenantContext();
  if (!ctx) {
    return { success: false, error: 'Sessão expirada. Faça login novamente.' };
  }

  if (!ctx.activeUnitId) {
    return {
      success: false,
      error: 'Acesso negado: o profissional precisa ter uma unidade ativa selecionada para realizar encaminhamentos.',
    };
  }

  // 1. Sanitiza e injeta os dados confiáveis do servidor no input
  const combinedInput = {
    patientId: input.patientId,
    intent: input.intent || 'order',
    priority: input.priority || 'routine',
    description: input.description,
    targetUnitId: input.targetUnitId,
    tenantId: ctx.tenantId,
    requesterId: ctx.userId,
    sourceUnitId: ctx.activeUnitId, // Resolvido de forma segura do servidor
    history: [], // Inicializado no serviço
  };

  // 2. Validação estrita via Zod Schema
  const parsed = intersectoralTaskInsertSchema.safeParse(combinedInput);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? 'Dados de encaminhamento inválidos.',
    };
  }

  try {
    // 3. Invoca o serviço de domínio de PTS para persistir a tarefa de forma transacional
    const service = new IntersectoralTaskService(ctx);
    const task = await service.createTask(parsed.data);

    // 4. Invalida os caches do tenant
    revalidateTenantResource(ctx.tenantId, 'intersectoral_tasks');
    revalidateTenantResource(ctx.tenantId, 'patients');

    return { success: true, data: task };
  } catch (err: any) {
    getLogger().error({ err, input, tenantId: ctx.tenantId }, 'createIntersectoralTaskAction failed');
    return { success: false, error: err?.message || 'Erro ao criar encaminhamento intersetorial.' };
  }
}

/**
 * Transiciona o status de um encaminhamento validando as regras de FSM e governança no servidor.
 */
export async function transitionIntersectoralTaskAction(
  taskId: string,
  nextStatus: TaskStatus,
  notes?: string | null
) {
  const ctx = await getActiveTenantContext();
  if (!ctx) {
    return { success: false, error: 'Sessão expirada. Faça login novamente.' };
  }

  try {
    const service = new IntersectoralTaskService(ctx);
    const updatedTask = await service.transitionTaskStatus(
      taskId,
      nextStatus,
      {
        userId: ctx.userId,
        activeUnitId: ctx.activeUnitId,
        userRole: ctx.role,
      },
      notes
    );

    revalidateTenantResource(ctx.tenantId, 'intersectoral_tasks');
    return { success: true, data: updatedTask };
  } catch (err: any) {
    getLogger().error({ err, taskId, nextStatus, tenantId: ctx.tenantId }, 'transitionIntersectoralTaskAction failed');
    return { success: false, error: err?.message || 'Erro ao transicionar status da tarefa.' };
  }
}

/**
 * Lista as tarefas direcionadas para a Unidade Ativa selecionada pelo profissional no servidor.
 */
export async function getTargetUnitQueueAction(filters: {
  status?: TaskStatus;
  page?: number;
  pageSize?: number;
}) {
  const ctx = await getActiveTenantContext();
  if (!ctx) {
    return { success: false, error: 'Sessão expirada. Faça login novamente.' };
  }

  if (!ctx.activeUnitId) {
    return { success: false, error: 'Nenhuma unidade de atuação ativa selecionada no momento.' };
  }

  try {
    const repo = new PtsRepository(ctx);
    const result = await repo.listTasksByTargetUnit(ctx.activeUnitId, {
      status: filters.status,
      page: filters.page ?? 1,
      pageSize: filters.pageSize ?? 10,
    });

    return { success: true, data: result };
  } catch (err: any) {
    getLogger().error({ err, tenantId: ctx.tenantId }, 'getTargetUnitQueueAction failed');
    return { success: false, error: err?.message || 'Erro ao carregar a fila de entrada da unidade.' };
  }
}

const initializeCaseInputSchema = z.object({
  patientId: z.string().uuid('ID do cidadão inválido.'),
  legalMeasure: z.string().optional().nullable(),
  mandatoryReviewDate: z.preprocess(
    (arg) => (typeof arg === 'string' && arg ? new Date(arg) : arg),
    z.date().optional().nullable()
  ),
});

export async function initializeCaseAction(
  input: { patientId: string; legalMeasure?: string | null; mandatoryReviewDate?: Date | null | string } | FormData
) {
  const ctx = await getActiveTenantContext();
  if (!ctx) {
    return { error: 'Sessão expirada. Faça login novamente.', success: null };
  }

  let rawInput: any = {};
  if (input instanceof FormData) {
    rawInput = {
      patientId: input.get('patientId'),
      legalMeasure: input.get('legalMeasure'),
      mandatoryReviewDate: input.get('mandatoryReviewDate'),
    };
  } else {
    rawInput = input;
  }

  const parsed = initializeCaseInputSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? 'Dados de inicialização inválidos.',
      success: null,
    };
  }

  try {
    const service = new InitializeCaseService(ctx);
    const result = await service.execute(parsed.data);

    // Invalida os caches do tenant
    revalidateTenantResource(ctx.tenantId, 'patients');
    revalidatePath(`/patients/${parsed.data.patientId}/pts`);
    revalidatePath(`/patients/${parsed.data.patientId}`);
    revalidatePath('/dashboard');

    return { error: null, success: result };
  } catch (err: any) {
    getLogger().error({ err, patientId: parsed.data.patientId, tenantId: ctx.tenantId }, 'initializeCaseAction failed');
    if (err instanceof ForbiddenError) {
      return { error: 'Acesso negado: permissão insuficiente ou unidade não selecionada.', success: null };
    }
    return { error: err?.message || 'Erro interno ao inicializar o caso.', success: null };
  }
}

/**
 * Wrapper específico para compatibilidade com o atributo `action` do React 19/Next.js 16.
 * Aceita FormData e retorna Promise<void> para satisfazer o compilador estrito de tipos do JSX.
 */
export async function initializeCaseFormAction(formData: FormData): Promise<void> {
  await initializeCaseAction(formData);
}

// Mensagem educativa do §5.6: bloqueio sem prazo/frequência/reavaliação.
const PACTUAR_GATE_MSG =
  'Toda ação pactuada precisa de prazo, frequência e data de reavaliação — sem isso vira rol de atividades, não PTS.';

const dateString = z.preprocess(
  (arg) => (typeof arg === 'string' && arg ? arg : arg),
  z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida (use AAAA-MM-DD).')
);

const createActionInputSchema = z
  .object({
    planId: z.string().uuid('ID do plano inválido.'),
    responsibleUnitId: z.string().uuid('ID da unidade responsável inválido.'),
    assignedProfessionalId: z.string().uuid().optional().nullable(),
    deadline: z.preprocess(
      (arg) => (typeof arg === 'string' && arg ? new Date(arg) : arg),
      z.date({ message: 'Prazo limite deve ser uma data válida.' })
    ),
    description: z.string().min(3, 'A descrição da ação deve ter ao menos 3 caracteres.').max(1000),
    // Campos temporais obrigatórios ao pactuar (§5.6)
    dataInicio: dateString.optional().nullable(),
    prazofim: dateString.optional().nullable(),
    frequenciaTipo: z
      .enum(['semanal', 'quinzenal', 'mensal', 'bimestral', 'trimestral', 'outro'])
      .optional()
      .nullable(),
    frequenciaDetalhe: z.string().max(200).optional().nullable(),
    proximoRetorno: dateString.optional().nullable(),
    dataProximaReavaliacao: dateString.optional().nullable(),
    horizonteTipo: z.enum(['curto_prazo', 'medio_prazo', 'longo_prazo']).optional().nullable(),
    aceiteUsuario: z.enum(['aceita', 'recusa', 'repactuar']).optional().nullable(),
  })
  .superRefine((data, ctx) => {
    // Gate §5.6: ao pactuar, os três campos temporais são obrigatórios.
    if (!data.prazofim) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: PACTUAR_GATE_MSG, path: ['prazofim'] });
    }
    if (!data.frequenciaTipo) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: PACTUAR_GATE_MSG, path: ['frequenciaTipo'] });
    }
    if (!data.dataProximaReavaliacao) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: PACTUAR_GATE_MSG, path: ['dataProximaReavaliacao'] });
    }
  });

const createReavaliacaoInputSchema = z.object({
  acaoId: z.string().uuid('ID da ação inválido.'),
  data: dateString,
  resultado: z.enum(['cumpriu', 'cumpriu_parcial', 'nao_cumpriu']),
  nota: z.string().max(2000).optional().nullable(),
  proximaAcao: z.enum(['continuar', 'repactuar', 'encerrar', 'escalar']),
  // Se proximaAcao = continuar, nova data de reavaliação é obrigatória
  novaDataReavaliacao: dateString.optional().nullable(),
});

const transitionActionInputSchema = z.object({
  actionId: z.string().uuid('ID da ação inválido.'),
  currentStatus: z.enum(['pactuada', 'em_andamento', 'concluida', 'bloqueada']).optional(),
  nextStatus: z.enum(['pactuada', 'em_andamento', 'concluida', 'bloqueada']),
  evolutionNotes: z.string().optional().nullable(),
});

export async function createActionAction(
  input: {
    planId: string;
    responsibleUnitId: string;
    assignedProfessionalId?: string | null;
    deadline: Date | string;
    description: string;
    dataInicio?: string | null;
    prazofim?: string | null;
    frequenciaTipo?: string | null;
    frequenciaDetalhe?: string | null;
    proximoRetorno?: string | null;
    dataProximaReavaliacao?: string | null;
    horizonteTipo?: string | null;
    aceiteUsuario?: string | null;
  } | FormData
) {
  const ctx = await getActiveTenantContext();
  if (!ctx) {
    return { error: 'Sessão expirada. Faça login novamente.', success: null };
  }

  if (!hasTier(ctx, 'PREMIUM')) {
    return { error: 'O ciclo PTS/PIA está disponível apenas no plano Premium do município.', success: null };
  }

  let rawInput: any = {};
  if (input instanceof FormData) {
    rawInput = {
      planId: input.get('planId'),
      responsibleUnitId: input.get('responsibleUnitId'),
      assignedProfessionalId: input.get('assignedProfessionalId'),
      deadline: input.get('deadline'),
      description: input.get('description'),
      dataInicio: input.get('dataInicio'),
      prazofim: input.get('prazofim'),
      frequenciaTipo: input.get('frequenciaTipo'),
      frequenciaDetalhe: input.get('frequenciaDetalhe'),
      proximoRetorno: input.get('proximoRetorno'),
      dataProximaReavaliacao: input.get('dataProximaReavaliacao'),
      horizonteTipo: input.get('horizonteTipo'),
      aceiteUsuario: input.get('aceiteUsuario'),
    };
  } else {
    rawInput = input;
  }

  const parsed = createActionInputSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? 'Dados de ação inválidos.',
      success: null,
    };
  }

  try {
    const service = new RecordActionService(ctx);
    const result = await service.createAction(parsed.data);

    revalidateTenantResource(ctx.tenantId, 'patients');
    revalidatePath('/dashboard');

    return { error: null, success: result };
  } catch (err: any) {
    getLogger().error({ err, planId: parsed.data.planId, tenantId: ctx.tenantId }, 'createActionAction failed');
    if (err instanceof ForbiddenError) {
      return { error: 'Acesso negado: permissão insuficiente ou unidade não selecionada.', success: null };
    }
    return { error: err?.message || 'Erro interno ao pactuar ação.', success: null };
  }
}

export async function createReavaliacaoAction(input: {
  acaoId: string;
  data: string;
  resultado: string;
  nota?: string | null;
  proximaAcao: string;
  novaDataReavaliacao?: string | null;
}) {
  const ctx = await getActiveTenantContext();
  if (!ctx) {
    return { error: 'Sessão expirada. Faça login novamente.', success: null };
  }

  if (!hasTier(ctx, 'PREMIUM')) {
    return { error: 'O ciclo PTS/PIA está disponível apenas no plano Premium do município.', success: null };
  }

  const parsed = createReavaliacaoInputSchema.safeParse(input);
  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? 'Dados de reavaliação inválidos.',
      success: null,
    };
  }

  try {
    const service = new ReavaliacaoService(ctx);
    const result = await service.createReavaliacao(parsed.data);

    revalidateTenantResource(ctx.tenantId, 'patients');
    revalidatePath('/dashboard');

    return { error: null, success: result };
  } catch (err: any) {
    getLogger().error({ err, acaoId: parsed.data.acaoId, tenantId: ctx.tenantId }, 'createReavaliacaoAction failed');
    if (err instanceof ForbiddenError) {
      return { error: 'Acesso negado: permissão insuficiente ou unidade não selecionada.', success: null };
    }
    return { error: err?.message || 'Erro interno ao registrar reavaliação.', success: null };
  }
}

export async function transitionActionStatusAction(
  input: {
    actionId: string;
    currentStatus?: 'pactuada' | 'em_andamento' | 'concluida' | 'bloqueada';
    nextStatus: 'pactuada' | 'em_andamento' | 'concluida' | 'bloqueada';
    evolutionNotes?: string | null;
  } | FormData
) {
  const ctx = await getActiveTenantContext();
  if (!ctx) {
    return { error: 'Sessão expirada. Faça login novamente.', success: null };
  }

  let rawInput: any = {};
  if (input instanceof FormData) {
    rawInput = {
      actionId: input.get('actionId'),
      currentStatus: input.get('currentStatus'),
      nextStatus: input.get('nextStatus'),
      evolutionNotes: input.get('evolutionNotes'),
    };
  } else {
    rawInput = input;
  }

  const parsed = transitionActionInputSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? 'Dados de transição inválidos.',
      success: null,
    };
  }

  try {
    const service = new RecordActionService(ctx);
    const result = await service.transitionAction({
      actionId: parsed.data.actionId,
      nextStatus: parsed.data.nextStatus,
      evolutionNotes: parsed.data.evolutionNotes,
    });

    revalidateTenantResource(ctx.tenantId, 'patients');
    revalidatePath('/dashboard');

    return { error: null, success: result };
  } catch (err: any) {
    getLogger().error({ err, actionId: parsed.data.actionId, tenantId: ctx.tenantId }, 'transitionActionStatusAction failed');
    if (err instanceof ForbiddenError) {
      return { error: 'Acesso negado: permissão insuficiente ou unidade não selecionada.', success: null };
    }
    return { error: err?.message || 'Erro interno ao transicionar status da ação.', success: null };
  }
}


export async function listReavaliacoesAction(acaoId: string) {
  const ctx = await getActiveTenantContext();
  if (!ctx) {
    return { error: 'Sessão expirada. Faça login novamente.', success: null };
  }

  const acaoIdParsed = z.string().uuid().safeParse(acaoId);
  if (!acaoIdParsed.success) {
    return { error: 'ID de ação inválido.', success: null };
  }

  try {
    const { PtsReavaliacaoRepository } = await import('./repositories/pts-reavaliacao.repository');
    const repo = new PtsReavaliacaoRepository(ctx);
    const rows = await repo.findByAcaoId(acaoIdParsed.data);
    return { error: null, success: rows };
  } catch (err: any) {
    getLogger().error({ err, acaoId, tenantId: ctx.tenantId }, 'listReavaliacoesAction failed');
    return { error: err?.message || 'Erro ao listar reavaliações.', success: null };
  }
}

/* ================================================================== */
/*  Motor de Sinalização Cruzada (Fase 2)                              */
/* ================================================================== */

const createSignalInputSchema = z.object({
  caseId: z.string().uuid('ID do caso inválido.'),
  needTypeId: z.string().min(1, 'Selecione um tipo de necessidade.'),
  priority: z.enum(['imediata', 'pactuada']),
  abstractReason: z
    .string()
    .min(3, 'O motivo deve ter ao menos 3 caracteres.')
    .max(1000, 'O motivo é muito longo.'),
});

const signalIdSchema = z.object({ signalId: z.string().uuid('ID da sinalização inválido.') });

const resolveSignalInputSchema = z.object({
  signalId: z.string().uuid('ID da sinalização inválido.'),
  notes: z.string().max(1000).optional().nullable(),
});

const assignSignalInputSchema = z.object({
  signalId: z.string().uuid('ID da sinalização inválido.'),
  professionalId: z.string().uuid('ID do profissional inválido.'),
});

/**
 * Helper zero-trust: resolve contexto, valida via Zod, invoca o serviço e
 * revalida os caches relevantes. Nunca aceita identidade/escopo do cliente.
 */
async function runSignalAction<T>(
  schema: z.ZodTypeAny,
  rawInput: unknown,
  run: (service: SignalService, data: any, ctx: NonNullable<Awaited<ReturnType<typeof getActiveTenantContext>>>) => Promise<T>,
  logLabel: string,
) {
  const ctx = await getActiveTenantContext();
  if (!ctx) return { error: 'Sessão expirada. Faça login novamente.', success: null };

  const parsed = schema.safeParse(rawInput);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Dados inválidos.', success: null };
  }

  try {
    const service = new SignalService(ctx);
    const result = await run(service, parsed.data, ctx);

    revalidateTenantResource(ctx.tenantId, 'pts_signals');
    revalidatePath('/dashboard');

    return { error: null, success: result };
  } catch (err: any) {
    getLogger().error({ err, tenantId: ctx.tenantId }, `${logLabel} failed`);
    if (err instanceof ForbiddenError) {
      return { error: 'Acesso negado: permissão insuficiente ou unidade não selecionada.', success: null };
    }
    return { error: err?.message || 'Erro interno na sinalização.', success: null };
  }
}

export async function createSignalAction(input: {
  caseId: string;
  needTypeId: string;
  priority: 'imediata' | 'pactuada';
  abstractReason: string;
}) {
  return runSignalAction(
    createSignalInputSchema,
    input,
    (service, data) => service.createSignal(data),
    'createSignalAction',
  );
}

export async function confirmSignalAction(input: { signalId: string }) {
  return runSignalAction(signalIdSchema, input, (s, d) => s.confirmSignal(d.signalId), 'confirmSignalAction');
}

export async function discardSignalAction(input: { signalId: string }) {
  return runSignalAction(signalIdSchema, input, (s, d) => s.discardSignal(d.signalId), 'discardSignalAction');
}

export async function submitSignalForRtAction(input: { signalId: string }) {
  return runSignalAction(signalIdSchema, input, (s, d) => s.submitForRtValidation(d.signalId), 'submitSignalForRtAction');
}

export async function validateSignalByRtAction(input: { signalId: string }) {
  return runSignalAction(signalIdSchema, input, (s, d) => s.validateByRt(d.signalId), 'validateSignalByRtAction');
}

export async function receiveSignalAction(input: { signalId: string }) {
  return runSignalAction(signalIdSchema, input, (s, d) => s.receiveSignal(d.signalId), 'receiveSignalAction');
}

export async function treatSignalAction(input: { signalId: string }) {
  return runSignalAction(signalIdSchema, input, (s, d) => s.startTreatment(d.signalId), 'treatSignalAction');
}

export async function resolveSignalAction(input: { signalId: string; notes?: string | null }) {
  return runSignalAction(resolveSignalInputSchema, input, (s, d) => s.resolveSignal(d.signalId, d.notes), 'resolveSignalAction');
}

export async function assignSignalProfessionalAction(input: { signalId: string; professionalId: string }) {
  return runSignalAction(
    assignSignalInputSchema,
    input,
    (s, d) => s.assignProfessional(d.signalId, d.professionalId),
    'assignSignalProfessionalAction',
  );
}

/* ================================================================== */
/*  Classificação de risco por horizonte temporal (Bloco 3 / §5.8)    */
/* ================================================================== */

const transitionNivelInputSchema = z.object({
  planId: z.string().uuid('ID do plano inválido.'),
  toNivel: z.enum([...NIVEL_INTENSIDADE_VALORES] as [string, ...string[]]),
});

/**
 * Confirma a transição de nível de intensidade do cuidado.
 * Só o RT do plano pode executar. Ao atingir alta_continuidade, o caso é arquivado.
 */
export async function transitionNivelIntensidadeAction(input: {
  planId: string;
  toNivel: string;
}) {
  const ctx = await getActiveTenantContext();
  if (!ctx) return { error: 'Sessão expirada. Faça login novamente.', success: null };

  if (!hasTier(ctx, 'PREMIUM')) {
    return { error: 'O ciclo PTS/PIA está disponível apenas no plano Premium do município.', success: null };
  }

  const parsed = transitionNivelInputSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Dados inválidos.', success: null };
  }

  try {
    const service = new IntensityLevelService(ctx);
    const result = await service.transitionNivel({
      planId: parsed.data.planId,
      toNivel: parsed.data.toNivel as any,
    });

    revalidateTenantResource(ctx.tenantId, 'patients');
    revalidatePath('/dashboard');

    return { error: null, success: result };
  } catch (err: any) {
    getLogger().error({ err, planId: parsed.data.planId, tenantId: ctx.tenantId }, 'transitionNivelIntensidadeAction failed');
    if (err instanceof ForbiddenError) {
      return { error: err.message, success: null };
    }
    return { error: err?.message || 'Erro ao transicionar nível de intensidade.', success: null };
  }
}

/**
 * Verifica se o plano é elegível para sugestão de transição (todas as metas concluídas)
 * e, se sim, cria uma sinalização sugerida para o RT confirmar.
 */
export async function suggestNivelTransitionAction(input: { planId: string }) {
  const ctx = await getActiveTenantContext();
  if (!ctx) return { error: 'Sessão expirada. Faça login novamente.', success: null };

  if (!hasTier(ctx, 'PREMIUM')) {
    return { error: 'O ciclo PTS/PIA está disponível apenas no plano Premium do município.', success: null };
  }

  const planIdParsed = z.string().uuid().safeParse(input.planId);
  if (!planIdParsed.success) return { error: 'ID do plano inválido.', success: null };

  try {
    const service = new IntensityLevelService(ctx);
    const suggested = await service.suggestTransitionIfEligible(planIdParsed.data);

    if (suggested) {
      revalidateTenantResource(ctx.tenantId, 'pts_signals');
      revalidatePath('/dashboard');
    }

    return { error: null, success: { suggested } };
  } catch (err: any) {
    getLogger().error({ err, planId: input.planId, tenantId: ctx.tenantId }, 'suggestNivelTransitionAction failed');
    return { error: err?.message || 'Erro ao verificar elegibilidade de transição.', success: null };
  }
}

/* ================================================================== */
/*  Protagonismo do Usuário & Encontros (Bloco 4)                      */
/* ================================================================== */

const updatePlanParticipationInputSchema = z
  .object({
    planId: z.string().uuid('ID do plano inválido.'),
    participacaoUsuario: z.enum(['presente', 'representado_familia', 'dispensado_por_incapacidade']),
    participacaoJustificativa: z.string().optional().nullable(),
  })
  .superRefine((data, ctx) => {
    if (
      data.participacaoUsuario === 'dispensado_por_incapacidade' &&
      (!data.participacaoJustificativa || data.participacaoJustificativa.trim() === '')
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'A justificativa é obrigatória para dispensa por incapacidade.',
        path: ['participacaoJustificativa'],
      });
    }
  });

export async function updatePlanParticipationAction(input: {
  planId: string;
  participacaoUsuario: 'presente' | 'representado_familia' | 'dispensado_por_incapacidade';
  participacaoJustificativa?: string | null;
}) {
  const ctx = await getActiveTenantContext();
  if (!ctx) return { error: 'Sessão expirada. Faça login novamente.', success: null };

  if (!hasTier(ctx, 'PREMIUM')) {
    return { error: 'O ciclo PTS/PIA está disponível apenas no plano Premium do município.', success: null };
  }

  const parsed = updatePlanParticipationInputSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Dados inválidos.', success: null };
  }

  try {
    const repo = new PtsPlanRepository(ctx);
    const result = await repo.updateParticipation(
      parsed.data.planId,
      parsed.data.participacaoUsuario,
      parsed.data.participacaoJustificativa ?? null
    );

    revalidateTenantResource(ctx.tenantId, 'patients');
    revalidatePath('/dashboard');

    return { error: null, success: result };
  } catch (err: any) {
    getLogger().error({ err, planId: input.planId, tenantId: ctx.tenantId }, 'updatePlanParticipationAction failed');
    return { error: err?.message || 'Erro ao atualizar participação do usuário.', success: null };
  }
}

const transitionCaseStatusInputSchema = z.object({
  caseId: z.string().uuid('ID do caso inválido.'),
  nextStatus: z.string().min(1),
});

export async function transitionCaseStatusAction(input: {
  caseId: string;
  nextStatus: string;
}) {
  const ctx = await getActiveTenantContext();
  if (!ctx) return { error: 'Sessão expirada. Faça login novamente.', success: null };

  const parsed = transitionCaseStatusInputSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Dados inválidos.', success: null };
  }

  try {
    const service = new CaseStatusService(ctx);
    const result = await service.transitionCaseStatus({
      caseId: parsed.data.caseId,
      nextStatus: parsed.data.nextStatus as any,
    });

    revalidateTenantResource(ctx.tenantId, 'patients');
    revalidatePath('/dashboard');

    return { error: null, success: result };
  } catch (err: any) {
    getLogger().error({ err, caseId: input.caseId, tenantId: ctx.tenantId }, 'transitionCaseStatusAction failed');
    return { error: err?.message || 'Erro ao transicionar status do caso.', success: null };
  }
}

const createEncontroInputSchema = z
  .object({
    planoId: z.string().uuid('ID do plano inválido.'),
    tipo: z.enum(['articulacao_rede', 'reuniao_pts']),
    data: z.string().min(1, 'A data é obrigatória.'),
    participantes: z.array(z.string().uuid()).min(1, 'Selecione ao menos um participante.'),
    usuarioPresente: z.boolean(),
  })
  .superRefine((data, ctx) => {
    if (data.tipo === 'reuniao_pts' && !data.usuarioPresente) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Reunião de PTS exige a presença do usuário.',
        path: ['usuarioPresente'],
      });
    }
  });

export async function createEncontroAction(input: {
  planoId: string;
  tipo: 'articulacao_rede' | 'reuniao_pts';
  data: string;
  participantes: string[];
  usuarioPresente: boolean;
}) {
  const ctx = await getActiveTenantContext();
  if (!ctx) return { error: 'Sessão expirada. Faça login novamente.', success: null };

  if (!hasTier(ctx, 'PREMIUM')) {
    return { error: 'O ciclo PTS/PIA está disponível apenas no plano Premium do município.', success: null };
  }

  const parsed = createEncontroInputSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Dados inválidos.', success: null };
  }

  try {
    const service = new EncontroService(ctx);
    const result = await service.createEncontro({
      planoId: parsed.data.planoId,
      tipo: parsed.data.tipo,
      data: parsed.data.data,
      participantes: parsed.data.participantes,
      usuarioPresente: parsed.data.usuarioPresente,
    });

    revalidateTenantResource(ctx.tenantId, 'patients');
    revalidatePath('/dashboard');

    return { error: null, success: result };
  } catch (err: any) {
    getLogger().error({ err, planoId: input.planoId, tenantId: ctx.tenantId }, 'createEncontroAction failed');
    return { error: err?.message || 'Erro ao registrar encontro.', success: null };
  }
}

export async function listEncontrosAction(planId: string) {
  const ctx = await getActiveTenantContext();
  if (!ctx) return { error: 'Sessão expirada. Faça login novamente.', success: null };

  const planIdParsed = z.string().uuid().safeParse(planId);
  if (!planIdParsed.success) {
    return { error: 'ID do plano inválido.', success: null };
  }

  try {
    const repo = new PtsEncontroRepository(ctx);
    const result = await repo.findByPlanId(planIdParsed.data);
    return { error: null, success: result };
  } catch (err: any) {
    getLogger().error({ err, planId, tenantId: ctx.tenantId }, 'listEncontrosAction failed');
    return { error: err?.message || 'Erro ao listar encontros.', success: null };
  }
}
