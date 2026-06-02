/**
 * NonComplianceAlertService — §5.7 do plano
 *
 * Roda dentro do job-processor (fila 'non_compliance_check') disparado
 * diariamente pelo cron. Para cada ação ativa com proximo_retorno vencido,
 * calcula quantos meses de atraso há e, nos marcos de 1, 2 e 3 meses:
 *   1. Cria uma sinalização `alerta_descumprimento` no motor existente.
 *   2. Gera uma ação de busca ativa sugerida (status `pactuada`, subtipo marcado).
 *   3. Envia notificação in-app + e-mail ao RT/responsável via canais já existentes.
 *
 * Não cria sistema paralelo — reutiliza motor de sinalização (§5 do plano).
 * Idempotente: verifica se já existe alerta aberto para o mesmo marco antes de criar.
 */
import { and, eq, inArray, isNotNull, lte } from 'drizzle-orm';
import { getDb } from '@/lib/db/client';
import { getLogger } from '@/lib/logger';
import {
  ptsActions,
  ptsPlans,
  ptsSignals,
  ptsCases,
  profiles,
  serviceUnits,
} from '@/lib/db/schema';
import { monthsOverdue } from '@pts/domain';
import { EmailService } from '@/modules/email/email.service';
import { NotificationService } from '@/modules/jobs/services/notification.service';
import type { TenantContext } from '@/lib/tenant-context';

const log = getLogger({ service: 'NonComplianceAlertService' });

/** Marcos (em meses) em que o alerta escala (§5.7). */
const ALERT_MILESTONES = [1, 2, 3] as const;

/**
 * Processa um tenant: detecta ações ativas cujo proximo_retorno já passou
 * e emite alertas nos marcos de 1/2/3 meses se ainda não houver alerta aberto.
 */
export async function runNonComplianceCheck(tenantId: string): Promise<{
  checked: number;
  alertsCreated: number;
}> {
  const db = getDb();
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];

  // 1. Busca ações ativas com proximo_retorno vencido deste tenant
  const overdueActions = await db
    .select({
      id: ptsActions.id,
      planId: ptsActions.planId,
      tenantId: ptsActions.tenantId,
      responsibleUnitId: ptsActions.responsibleUnitId,
      assignedProfessionalId: ptsActions.assignedProfessionalId,
      proximoRetorno: ptsActions.proximoRetorno,
      description: ptsActions.description,
      status: ptsActions.status,
    })
    .from(ptsActions)
    .where(
      and(
        eq(ptsActions.tenantId, tenantId),
        inArray(ptsActions.status, ['pactuada', 'em_andamento']),
        isNotNull(ptsActions.proximoRetorno),
        lte(ptsActions.proximoRetorno, todayStr),
      ),
    );

  if (overdueActions.length === 0) return { checked: 0, alertsCreated: 0 };

  let alertsCreated = 0;

  for (const action of overdueActions) {
    try {
      const months = monthsOverdue(today, action.proximoRetorno);
      // Only act on the configured milestones
      if (!(ALERT_MILESTONES as readonly number[]).includes(months)) continue;

      // 2. Idempotency: check if an open alerta_descumprimento already exists
      //    for this action at this milestone.
      const existingAlerts = await db
        .select({ id: ptsSignals.id })
        .from(ptsSignals)
        .where(
          and(
            eq(ptsSignals.tenantId, tenantId),
            eq(ptsSignals.sourceRecordId, action.id),
            eq(ptsSignals.signalSubtype, 'alerta_descumprimento'),
            inArray(ptsSignals.status, ['sugerida', 'confirmada_pelo_autor', 'aguardando_validacao_rt', 'encaminhada', 'recebida', 'em_tratamento']),
          ),
        )
        .limit(1);

      if (existingAlerts.length > 0) continue; // alerta já aberto para esta ação

      // 3. Resolve caseId and RT from plan
      const [plan] = await db
        .select({ caseId: ptsPlans.caseId, ownerId: ptsPlans.ownerId })
        .from(ptsPlans)
        .where(and(eq(ptsPlans.id, action.planId), eq(ptsPlans.tenantId, tenantId)))
        .limit(1);

      if (!plan) continue;

      // 4. Determine priority: if a PTS plan owner (RT) exists, use 'imediata' so it routes to RT
      const priority = plan.ownerId ? 'imediata' : 'pactuada';
      const rtUserId = plan.ownerId;

      // 5. Responsible unit info for destination
      const [unit] = await db
        .select({ id: serviceUnits.id, componentId: serviceUnits.componentId })
        .from(serviceUnits)
        .where(and(eq(serviceUnits.id, action.responsibleUnitId), eq(serviceUnits.tenantId, tenantId)))
        .limit(1);

      const destinationComponent = unit?.componentId ?? 'CAPS';

      const reason =
        `Ação "${action.description.slice(0, 80)}" sem comparecimento há ${months} ${months === 1 ? 'mês' : 'meses'}. ` +
        `Próximo retorno previsto: ${action.proximoRetorno}. Avaliar busca ativa.`;

      // 6. Create alerta_descumprimento signal (enters motor at 'sugerida')
      await db.insert(ptsSignals).values({
        tenantId,
        caseId: plan.caseId,
        sourceRecordId: action.id, // links alert back to the action for idempotency
        sourceUnitId: action.responsibleUnitId,
        authorId: rtUserId ?? action.assignedProfessionalId ?? action.responsibleUnitId,
        needTypeId: 'acompanhamento_terapeutico', // generic need type
        destinationComponent,
        destinationUnitId: action.responsibleUnitId,
        priority,
        status: 'sugerida',
        signalSubtype: 'alerta_descumprimento',
        abstractReason: reason,
      });

      // 7. Create suggested busca-ativa action in the same plan
      await db.insert(ptsActions).values({
        tenantId,
        planId: action.planId,
        responsibleUnitId: action.responsibleUnitId,
        assignedProfessionalId: action.assignedProfessionalId,
        deadline: new Date(Date.now() + 14 * 86_400_000), // 14 days to follow up
        status: 'pactuada',
        description: `[BUSCA ATIVA SUGERIDA] ${months}º mês sem comparecimento — ação: "${action.description.slice(0, 80)}". Localizar o cidadão e verificar barreiras ao comparecimento.`,
      });

      alertsCreated++;

      // 8. In-app notification to RT or responsible professional
      const notifyUserId = rtUserId ?? action.assignedProfessionalId;
      if (notifyUserId) {
        const ctx: TenantContext = {
          tenantId,
          userId: notifyUserId,
          role: 'PROFESSIONAL',
          activeUnitId: null,
        };
        const notifService = new NotificationService(ctx);
        await notifService.createNotification({
          userId: notifyUserId,
          title: `Alerta: ${months}º mês sem comparecimento`,
          message: reason,
          type: 'warning',
          metadata: { actionId: action.id, caseId: plan.caseId, months },
        });

        // 9. E-mail alert (best-effort — error does not abort)
        try {
          const [profile] = await db
            .select({ email: profiles.email, fullName: profiles.fullName })
            .from(profiles)
            .where(eq(profiles.id, notifyUserId))
            .limit(1);

          if (profile?.email) {
            const emailService = new EmailService();
            await emailService.sendNotificationEmail({
              to: profile.email,
              name: profile.fullName ?? 'Profissional',
              title: `Alerta de descumprimento — ${months}º mês`,
              body: reason,
              note: 'Este alerta foi gerado automaticamente pelo sistema de governança do PTS. Acesse o sistema para validar e definir a busca ativa.',
            });
          }
        } catch (emailErr) {
          log.warn({ emailErr, actionId: action.id }, 'NonCompliance: falha no envio do e-mail (não crítico)');
        }
      }
    } catch (err) {
      log.error({ err, actionId: action.id, tenantId }, 'NonCompliance: erro ao processar ação');
    }
  }

  return { checked: overdueActions.length, alertsCreated };
}
