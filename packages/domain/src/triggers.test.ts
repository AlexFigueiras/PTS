import { describe, it, expect } from 'vitest';
import {
  detectG1,
  detectG2,
  detectG3,
  detectTriggers,
  type IngestEvent,
  type ExpectedFollowUp,
  DEFAULT_THRESHOLDS,
} from './triggers';

const pid = 'patient-1';

function makeEvent(overrides: Partial<IngestEvent> & { daysAgo?: number }): IngestEvent {
  const { daysAgo = 0, ...rest } = overrides;
  const recordedAt = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
  return {
    id: `event-${Math.random()}`,
    patientId: pid,
    source: 'health',
    needTypeId: 'risco_reinternacao',
    sphere: 'HEALTH',
    recordedAt,
    ...rest,
  };
}

describe('G1 — recorrência', () => {
  it('não dispara com menos de 3 ocorrências', () => {
    const events = [makeEvent({ daysAgo: 10 }), makeEvent({ daysAgo: 5 })];
    expect(detectG1(events, pid)).toBeNull();
  });

  it('dispara com 3+ ocorrências da mesma necessidade na janela', () => {
    const events = [
      makeEvent({ daysAgo: 30 }),
      makeEvent({ daysAgo: 60 }),
      makeEvent({ daysAgo: 90 }),
    ];
    const result = detectG1(events, pid);
    expect(result).not.toBeNull();
    expect(result?.trigger).toBe('G1');
    expect(result?.involvedEventIds).toHaveLength(3);
  });

  it('não dispara quando os eventos estão fora da janela', () => {
    const events = [
      makeEvent({ daysAgo: 200 }),
      makeEvent({ daysAgo: 210 }),
      makeEvent({ daysAgo: 220 }),
    ];
    expect(detectG1(events, pid, { ...DEFAULT_THRESHOLDS, g1WindowDays: 180 })).toBeNull();
  });

  it('não dispara para paciente diferente', () => {
    const events = [
      makeEvent({ patientId: 'other', daysAgo: 10 }),
      makeEvent({ patientId: 'other', daysAgo: 20 }),
      makeEvent({ patientId: 'other', daysAgo: 30 }),
    ];
    expect(detectG1(events, pid)).toBeNull();
  });
});

describe('G2 — abandono', () => {
  it('dispara quando follow-up não foi cumprido após o prazo + margem', () => {
    const now = new Date();
    const followUps: ExpectedFollowUp[] = [
      {
        id: 'fu-1',
        patientId: pid,
        expectedBy: new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000),
        completedAt: null,
      },
    ];
    const result = detectG2(followUps, pid, DEFAULT_THRESHOLDS, now);
    expect(result?.trigger).toBe('G2');
  });

  it('não dispara quando dentro da margem de tolerância', () => {
    const now = new Date();
    const followUps: ExpectedFollowUp[] = [
      {
        id: 'fu-2',
        patientId: pid,
        expectedBy: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000),
        completedAt: null,
      },
    ];
    expect(detectG2(followUps, pid, DEFAULT_THRESHOLDS, now)).toBeNull();
  });

  it('não dispara quando completado', () => {
    const now = new Date();
    const followUps: ExpectedFollowUp[] = [
      {
        id: 'fu-3',
        patientId: pid,
        expectedBy: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
        completedAt: new Date(),
      },
    ];
    expect(detectG2(followUps, pid, DEFAULT_THRESHOLDS, now)).toBeNull();
  });
});

describe('G3 — cruzamento de esferas', () => {
  it('dispara com eventos de esferas diferentes dentro da janela', () => {
    const events = [
      makeEvent({ sphere: 'HEALTH', daysAgo: 3 }),
      makeEvent({ sphere: 'SOCIAL', daysAgo: 5, source: 'social' }),
    ];
    const result = detectG3(events, pid);
    expect(result?.trigger).toBe('G3');
    expect(result?.involvedSpheres).toContain('HEALTH');
    expect(result?.involvedSpheres).toContain('SOCIAL');
  });

  it('não dispara com eventos da mesma esfera', () => {
    const events = [
      makeEvent({ sphere: 'HEALTH', daysAgo: 3 }),
      makeEvent({ sphere: 'HEALTH', daysAgo: 5 }),
    ];
    expect(detectG3(events, pid)).toBeNull();
  });

  it('não dispara quando esferas diferentes mas fora da janela', () => {
    const events = [
      makeEvent({ sphere: 'HEALTH', daysAgo: 3 }),
      makeEvent({ sphere: 'SOCIAL', daysAgo: 30, source: 'social' }),
    ];
    expect(detectG3(events, pid, { ...DEFAULT_THRESHOLDS, g3WindowDays: 14 })).toBeNull();
  });
});

describe('detectTriggers — prioridade G3 > G1 > G2', () => {
  it('G3 tem prioridade sobre G1', () => {
    const now = new Date();
    const events = [
      makeEvent({ sphere: 'HEALTH', daysAgo: 3 }),
      makeEvent({ sphere: 'SOCIAL', daysAgo: 5, source: 'social' }),
      makeEvent({ daysAgo: 10 }),
      makeEvent({ daysAgo: 20 }),
      makeEvent({ daysAgo: 30 }),
    ];
    const result = detectTriggers(events, [], pid, DEFAULT_THRESHOLDS, now);
    expect(result?.trigger).toBe('G3');
  });
});
