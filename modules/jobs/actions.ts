'use server';

import { getActiveTenantContext } from '@/lib/auth/get-tenant-context';
import { requireRole } from '@/lib/auth/authorization';
import { assertTenantContext } from '@/lib/tenant-context';
import { BackgroundJobsRepository } from './repositories/background-jobs.repository';
import { NotificationService } from './services/notification.service';
import { getLogger } from '@/lib/logger';
import { revalidatePath } from 'next/cache';

/**
 * Server Action protegida por papel de coordenação (MANAGER ou superior).
 * Recupera um job com falha crítica ('dead_letter') limpando o contador de tentativas
 * e recolocando-o na fila ativa ('queued') para execução imediata.
 */
export async function requeueFailedJobAction(jobId: string) {
  const ctx = await getActiveTenantContext();
  if (!ctx) {
    return { success: false, error: 'Sessão expirada. Faça login novamente.' };
  }

  try {
    assertTenantContext(ctx);
    // Valida se o usuário tem ao menos papel de coordenação MANAGER ou superior
    requireRole(ctx, 'MANAGER');

    const repo = new BackgroundJobsRepository(ctx);
    const job = await repo.getJobById(jobId);

    if (!job) {
      return { success: false, error: 'Tarefa não encontrada ou sem permissão de acesso.' };
    }

    let freshPayload = job.payload;

    // Se for um job RNDS, delegamos a reconstrução do payload (anti stale-payload + CNES Sync) à camada de serviço correspondente
    if (job.queueName === 'rnds') {
      const { RndsQueueService } = await import('@/modules/rnds/services/rnds-queue.service');
      const rndsService = new RndsQueueService(ctx);
      freshPayload = await rndsService.rebuildPayload(job);
    }

    const updatedJob = await repo.requeueFailedJob(jobId, freshPayload);

    if (!updatedJob) {
      return { success: false, error: 'Falha ao atualizar o status da tarefa no banco.' };
    }

    getLogger().info(
      { jobId, tenantId: ctx.tenantId, userId: ctx.userId },
      'Job recuperado com sucesso e recolocado na fila ativa com payload atualizado.'
    );

    // Invalida o cache da listagem da DLQ para atualização instantânea na interface
    revalidatePath('/admin/dlq');

    return { success: true, data: updatedJob };
  } catch (err: any) {
    getLogger().error(
      { err, jobId, tenantId: ctx.tenantId, userId: ctx.userId },
      'Erro no requeueFailedJobAction'
    );
    return { success: false, error: err?.message || 'Falha ao re-enfileirar a tarefa.' };
  }
}

/**
 * Obtém as notificações não lidas do usuário atual do tenant ativo.
 */
export async function getUnreadNotificationsAction() {
  const ctx = await getActiveTenantContext();
  if (!ctx) {
    return { success: false, error: 'Sessão expirada. Faça login novamente.' };
  }

  try {
    assertTenantContext(ctx);
    const service = new NotificationService(ctx);
    const notifications = await service.getUnreadNotifications();
    return { success: true, data: notifications };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Falha ao buscar notificações.' };
  }
}

/**
 * Marca uma notificação específica como lida.
 */
export async function markNotificationAsReadAction(id: string) {
  const ctx = await getActiveTenantContext();
  if (!ctx) {
    return { success: false, error: 'Sessão expirada. Faça login novamente.' };
  }

  try {
    assertTenantContext(ctx);
    const service = new NotificationService(ctx);
    const notification = await service.markAsRead(id);
    return { success: true, data: notification };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Falha ao marcar notificação como lida.' };
  }
}

/**
 * Marca todas as notificações não lidas do usuário atual como lidas.
 */
export async function markAllNotificationsAsReadAction() {
  const ctx = await getActiveTenantContext();
  if (!ctx) {
    return { success: false, error: 'Sessão expirada. Faça login novamente.' };
  }

  try {
    assertTenantContext(ctx);
    const service = new NotificationService(ctx);
    const notifications = await service.markAllAsRead();
    return { success: true, data: notifications };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Falha ao limpar notificações.' };
  }
}

