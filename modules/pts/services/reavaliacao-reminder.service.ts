/**
 * ReavaliacaoReminderService — Scheduler de reavaliação (Ajuste D — maturidade do PTS).
 *
 * Roda na fila 'reavaliacao_check' (cron /api/jobs/check-reavaliacoes). Para cada
 * ação ativa cuja `data_proxima_reavaliacao` é hoje, notifica o Técnico de Referência
 * (in-app) de que a reavaliação formal está vencendo — fecha o loop temporal das metas
 * (distinto do alerta de descumprimento, que olha `proximo_retorno`/comparecimento).
 *
 * Padrão de worker global (getDb, superusuário, filtro de tenant manual).
 * Idempotente na prática: dispara só no dia exato do vencimento (cron diário).
 */
import { and, eq, inArray } from 'drizzle-orm';
import { getDb } from '@/lib/db/client';
import { getLogger } from '@/lib/logger';
import { ptsActions, ptsPlans } from '@/lib/db/schema';
import { NotificationService } from '@/modules/jobs/services/notification.service';
import type { TenantContext } from '@/lib/tenant-context';

const log = getLogger({ service: 'ReavaliacaoReminderService' });

export async function runReavaliacaoReminders(tenantId: string): Promise<{ due: number; notified: number }> {
  const db = getDb();
  const todayStr = new Date().toISOString().split('T')[0];

  const dueActions = await db
    .select({
      id: ptsActions.id,
      planId: ptsActions.planId,
      description: ptsActions.description,
    })
    .from(ptsActions)
    .where(
      and(
        eq(ptsActions.tenantId, tenantId),
        inArray(ptsActions.status, ['pactuada', 'em_andamento']),
        eq(ptsActions.dataProximaReavaliacao, todayStr),
      ),
    );

  if (dueActions.length === 0) return { due: 0, notified: 0 };

  let notified = 0;

  for (const action of dueActions) {
    try {
      const [plan] = await db
        .select({ ownerId: ptsPlans.ownerId, caseId: ptsPlans.caseId })
        .from(ptsPlans)
        .where(and(eq(ptsPlans.id, action.planId), eq(ptsPlans.tenantId, tenantId)))
        .limit(1);

      if (!plan?.ownerId) continue; // sem RT para notificar

      const ctx: TenantContext = { tenantId, userId: plan.ownerId, role: 'PROFESSIONAL', activeUnitId: null };
      const notifService = new NotificationService(ctx);
      await notifService.createNotification({
        userId: plan.ownerId,
        title: 'Reavaliação de meta vencendo hoje',
        message: `A ação "${action.description.slice(0, 80)}" tem reavaliação prevista para hoje. Registre o resultado e defina a próxima reavaliação.`,
        type: 'warning',
        metadata: { actionId: action.id, caseId: plan.caseId },
      });
      notified++;
    } catch (err) {
      log.error({ err, actionId: action.id, tenantId }, 'ReavaliacaoReminder: erro ao notificar');
    }
  }

  return { due: dueActions.length, notified };
}
