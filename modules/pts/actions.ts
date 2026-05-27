'use server';

import { getActiveTenantContext } from '@/lib/auth/get-tenant-context';
import { revalidateTenantResource } from '@/lib/cache';
import { getLogger } from '@/lib/logger';
import { IntersectoralTaskService } from './services/intersectoral-task.service';
import { PtsRepository } from './pts.repository';
import { intersectoralTaskInsertSchema, type TaskStatus } from './pts.dto';
import { pullSyncInputSchema, pushSyncInputSchema, type PullSyncInput, type PushSyncInput } from './dtos/sync.dto';
import { SyncService } from './services/sync.service';

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

/**
 * Puxa o lote líquido de alterações (Pull API) ocorridas após a data de referência no campo.
 * Proteção e governança multi-tenant estrita.
 */
export async function pullDeltaSyncAction(input: PullSyncInput) {
  const ctx = await getActiveTenantContext();
  if (!ctx) {
    return { success: false, error: 'Sessão expirada. Faça login novamente.' };
  }

  // Validação estrita via Zod Schema
  const parsed = pullSyncInputSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? 'Parâmetros de sincronização pull inválidos.',
    };
  }

  try {
    const service = new SyncService(ctx);
    const result = await service.pullDelta(parsed.data);

    return { success: true, data: result };
  } catch (err: any) {
    getLogger().error({ err, input, tenantId: ctx.tenantId }, 'pullDeltaSyncAction failed');
    return { success: false, error: err?.message || 'Erro ao processar sincronização delta pull.' };
  }
}

/**
 * Envia e processa em lote atômico (Push API) as mutações geradas offline.
 * Proteção e governança multi-tenant estrita.
 */
export async function pushDeltaSyncAction(input: PushSyncInput) {
  const ctx = await getActiveTenantContext();
  if (!ctx) {
    return { success: false, error: 'Sessão expirada. Faça login novamente.' };
  }

  // Validação estrita via Zod Schema
  const parsed = pushSyncInputSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? 'Dados de sincronização push inválidos.',
    };
  }

  try {
    const service = new SyncService(ctx);
    const result = await service.pushDelta(parsed.data);

    // Invalida os caches do tenant
    revalidateTenantResource(ctx.tenantId, 'intersectoral_tasks');
    revalidateTenantResource(ctx.tenantId, 'pts_evolutions');
    revalidateTenantResource(ctx.tenantId, 'pts_responses');

    return { success: true, data: result };
  } catch (err: any) {
    getLogger().error({ err, input, tenantId: ctx.tenantId }, 'pushDeltaSyncAction failed');
    return { success: false, error: err?.message || 'Erro ao processar sincronização delta push.' };
  }
}
