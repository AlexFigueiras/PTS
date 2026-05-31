/**
 * Gatilhos de elevação G1/G2/G3 — Fase 3 §4B.
 *
 * Detectores de padrão sobre eventos de ingestão acumulados.
 * Funções puras sem I/O — testáveis de forma isolada.
 *
 * G1 — Recorrência: N ocorrências da mesma necessidade em janela T.
 * G2 — Abandono: expectativa registrada não cumprida no prazo.
 * G3 — Cruzamento de esferas: coincidência temporal de fatores de esferas diferentes.
 *
 * Limiares parametrizáveis por tenant (C1).
 * Defaults conservadores (C2) — sinalizar de menos é melhor que sinalizar demais.
 */

export type IngestEvent = {
  id: string;
  patientId: string;
  source: 'health' | 'social';
  needTypeId: string;
  sphere: 'HEALTH' | 'SOCIAL' | 'LEGAL' | 'EDUCATION';
  recordedAt: Date;
};

export type ExpectedFollowUp = {
  id: string;
  patientId: string;
  expectedBy: Date;
  completedAt: Date | null;
};

export type TriggerThresholds = {
  /** G1: mínimo de ocorrências para disparar (default 3) */
  g1MinOccurrences: number;
  /** G1: janela de tempo em dias (default 180) */
  g1WindowDays: number;
  /** G2: dias de atraso antes de disparar (default 7) */
  g2GraceDays: number;
  /** G3: janela de coincidência em dias entre esferas diferentes (default 14) */
  g3WindowDays: number;
};

export const DEFAULT_THRESHOLDS: TriggerThresholds = {
  g1MinOccurrences: 3,
  g1WindowDays: 180,
  g2GraceDays: 7,
  g3WindowDays: 14,
};

export type TriggerResult = {
  triggered: boolean;
  trigger: 'G1' | 'G2' | 'G3';
  patientId: string;
  reason: string;
  involvedEventIds: string[];
  involvedSpheres: string[];
};

/**
 * G1 — Recorrência.
 * Detecta N+ ocorrências da mesma needTypeId em janela de T dias.
 */
export function detectG1(
  events: IngestEvent[],
  patientId: string,
  thresholds: TriggerThresholds = DEFAULT_THRESHOLDS,
): TriggerResult | null {
  const now = new Date();
  const windowMs = thresholds.g1WindowDays * 24 * 60 * 60 * 1000;
  const cutoff = new Date(now.getTime() - windowMs);

  const patientEvents = events.filter(
    (e) => e.patientId === patientId && e.recordedAt >= cutoff,
  );

  // Agrupa por needTypeId
  const byNeed = new Map<string, IngestEvent[]>();
  for (const e of patientEvents) {
    const list = byNeed.get(e.needTypeId) ?? [];
    list.push(e);
    byNeed.set(e.needTypeId, list);
  }

  for (const [needTypeId, occurrences] of byNeed.entries()) {
    if (occurrences.length >= thresholds.g1MinOccurrences) {
      return {
        triggered: true,
        trigger: 'G1',
        patientId,
        reason: `Necessidade "${needTypeId}" registrada ${occurrences.length}x em ${thresholds.g1WindowDays} dias — recorrência detectada.`,
        involvedEventIds: occurrences.map((e) => e.id),
        involvedSpheres: [...new Set(occurrences.map((e) => e.sphere))],
      };
    }
  }

  return null;
}

/**
 * G2 — Abandono.
 * Detecta follow-ups esperados não cumpridos após prazo + margem de tolerância.
 */
export function detectG2(
  followUps: ExpectedFollowUp[],
  patientId: string,
  thresholds: TriggerThresholds = DEFAULT_THRESHOLDS,
  now: Date = new Date(),
): TriggerResult | null {
  const graceMs = thresholds.g2GraceDays * 24 * 60 * 60 * 1000;

  const abandoned = followUps.filter(
    (f) =>
      f.patientId === patientId &&
      f.completedAt === null &&
      now.getTime() - f.expectedBy.getTime() > graceMs,
  );

  if (abandoned.length === 0) return null;

  return {
    triggered: true,
    trigger: 'G2',
    patientId,
    reason: `${abandoned.length} acompanhamento(s) esperado(s) não realizado(s) — abandono de tratamento detectado.`,
    involvedEventIds: abandoned.map((f) => f.id),
    involvedSpheres: [],
  };
}

/**
 * G3 — Cruzamento de esferas.
 * Detecta coincidência temporal de fatores de esferas DIFERENTES.
 * Maior diferencial e maior risco jurídico: com dados reais exige T1 (§10).
 */
export function detectG3(
  events: IngestEvent[],
  patientId: string,
  thresholds: TriggerThresholds = DEFAULT_THRESHOLDS,
): TriggerResult | null {
  const windowMs = thresholds.g3WindowDays * 24 * 60 * 60 * 1000;
  const patientEvents = events.filter((e) => e.patientId === patientId);

  // Testa pares de eventos de esferas diferentes dentro da janela
  for (let i = 0; i < patientEvents.length; i++) {
    for (let j = i + 1; j < patientEvents.length; j++) {
      const a = patientEvents[i];
      const b = patientEvents[j];

      if (a.sphere === b.sphere) continue;

      const diff = Math.abs(a.recordedAt.getTime() - b.recordedAt.getTime());
      if (diff <= windowMs) {
        return {
          triggered: true,
          trigger: 'G3',
          patientId,
          reason: `Fatores de esferas ${a.sphere} e ${b.sphere} detectados em ${thresholds.g3WindowDays} dias — cruzamento intersetorial.`,
          involvedEventIds: [a.id, b.id],
          involvedSpheres: [a.sphere, b.sphere],
        };
      }
    }
  }

  return null;
}

/**
 * Executa os 3 detectores em sequência; retorna o primeiro gatilho disparado.
 * Ordem: G3 (maior urgência intersetorial) > G1 > G2.
 */
export function detectTriggers(
  events: IngestEvent[],
  followUps: ExpectedFollowUp[],
  patientId: string,
  thresholds: TriggerThresholds = DEFAULT_THRESHOLDS,
  now?: Date,
): TriggerResult | null {
  return (
    detectG3(events, patientId, thresholds) ??
    detectG1(events, patientId, thresholds) ??
    detectG2(followUps, patientId, thresholds, now)
  );
}
