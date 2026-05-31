/**
 * Detector de gatilhos de elevação (G1/G2/G3) — Fase 3 §4B.
 *
 * Consulta os eventos de ingestão acumulados e executa os detectores puros
 * de @pts/domain/triggers sobre eles. Quando um gatilho dispara, eleva o
 * caso de `radar` para `observacao` (única transição automática, T5) e
 * cria um candidato na fila de observação com o porquê obrigatório.
 *
 * Limiares lidos de tenant_settings (placeholder: usa DEFAULT_THRESHOLDS).
 * G3 com dados reais depende de T1 (termo de autorização) — irrelevante no
 * protótipo com dados fictícios.
 */

import { and, eq, desc } from 'drizzle-orm';
import {
  detectTriggers,
  DEFAULT_THRESHOLDS,
  type IngestEvent,
  type TriggerResult,
} from '@pts/domain';
import {
  ptsCases,
  sourceHealthRecords,
  sourceSocialRecords,
  ptsSignals,
  patientConsents,
  serviceUnits,
} from '@/lib/db/schema';
import type { TenantContext } from '@/lib/tenant-context';

export type TriggerDetectorResult = {
  triggered: boolean;
  triggerResult: TriggerResult | null;
  newStatus: string | null;
};

/**
 * Executa os detectores G1/G2/G3 para o paciente a partir dos registros-fonte
 * acumulados. Se disparar, eleva o caso de `radar` para `observacao`.
 */
export async function runTriggerDetectors(
  ctx: TenantContext,
  tx: any,
  patientId: string,
  caseId: string,
): Promise<TriggerDetectorResult> {
  // Coleta eventos de ingestão acumulados das duas fontes
  const [healthRows, socialRows] = await Promise.all([
    tx
      .select({ id: sourceHealthRecords.id, recordedAt: sourceHealthRecords.recordedAt })
      .from(sourceHealthRecords)
      .where(
        and(
          eq(sourceHealthRecords.patientId, patientId),
          eq(sourceHealthRecords.tenantId, ctx.tenantId),
        ),
      )
      .orderBy(desc(sourceHealthRecords.recordedAt)),
    tx
      .select({ id: sourceSocialRecords.id, recordedAt: sourceSocialRecords.recordedAt })
      .from(sourceSocialRecords)
      .where(
        and(
          eq(sourceSocialRecords.patientId, patientId),
          eq(sourceSocialRecords.tenantId, ctx.tenantId),
        ),
      )
      .orderBy(desc(sourceSocialRecords.recordedAt)),
  ]);

  // Monta eventos no formato do domínio puro
  const events: IngestEvent[] = [
    ...healthRows.map((r: { id: string; recordedAt: Date }) => ({
      id: r.id,
      patientId,
      source: 'health' as const,
      needTypeId: 'risco_reinternacao',
      sphere: 'HEALTH' as const,
      recordedAt: new Date(r.recordedAt),
    })),
    ...socialRows.map((r: { id: string; recordedAt: Date }) => ({
      id: r.id,
      patientId,
      source: 'social' as const,
      needTypeId: 'vulnerabilidade_social_familiar',
      sphere: 'SOCIAL' as const,
      recordedAt: new Date(r.recordedAt),
    })),
  ];

  // 1. Verifica se o caso está em estado de recusa (T2)
  const [currentCase] = await tx
    .select({ id: ptsCases.id, status: ptsCases.status })
    .from(ptsCases)
    .where(and(eq(ptsCases.id, caseId), eq(ptsCases.tenantId, ctx.tenantId)))
    .limit(1);

  if (currentCase?.status === 'recusa') {
    return { triggered: false, triggerResult: null, newStatus: null }; // T2: Caso em recusa não dispara elevação
  }

  // 2. Gate de Consentimento no G3
  const consentEnforced = process.env.CONSENT_ENFORCED === 'true';
  let allowedEvents = events;

  if (consentEnforced) {
    const [consent] = await tx
      .select()
      .from(patientConsents)
      .where(
        and(
          eq(patientConsents.patientId, patientId),
          eq(patientConsents.tenantId, ctx.tenantId),
          eq(patientConsents.type, 'cross_sector'),
          eq(patientConsents.status, 'granted')
        )
      )
      .orderBy(desc(patientConsents.grantedAt))
      .limit(1);

    if (!consent) {
      // Se consentimento cross_sector não foi concedido, filtramos os eventos para conter apenas a esfera do profissional ativo
      if (ctx.activeUnitId) {
        const [activeUnit] = await tx
          .select({ sphere: serviceUnits.type })
          .from(serviceUnits)
          .where(and(eq(serviceUnits.id, ctx.activeUnitId), eq(serviceUnits.tenantId, ctx.tenantId)))
          .limit(1);

        if (activeUnit?.sphere) {
          allowedEvents = events.filter((e) => e.sphere === activeUnit.sphere);
        } else {
          allowedEvents = [];
        }
      } else {
        allowedEvents = [];
      }
    }
  }

  const triggerResult = detectTriggers(allowedEvents, [], patientId, DEFAULT_THRESHOLDS);

  if (!triggerResult?.triggered) {
    return { triggered: false, triggerResult: null, newStatus: null };
  }

  if (currentCase?.status === 'radar') {
    await tx
      .update(ptsCases)
      .set({ status: 'observacao', updatedAt: new Date() })
      .where(and(eq(ptsCases.id, caseId), eq(ptsCases.tenantId, ctx.tenantId)));

    return { triggered: true, triggerResult, newStatus: 'observacao' };
  }

  return { triggered: true, triggerResult, newStatus: currentCase?.status ?? null };
}
