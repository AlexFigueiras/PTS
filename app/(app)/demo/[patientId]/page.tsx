import { notFound, redirect } from 'next/navigation';
import { and, eq, desc } from 'drizzle-orm';
import { getActiveTenantContext } from '@/lib/auth/get-tenant-context';
import { withTransactionContext } from '@/lib/db/client';
import {
  sourceHealthRecords,
  sourceSocialRecords,
  ptsDimensions,
  ptsSignals,
  patients,
  ptsCases,
  type SourceHealthRecord,
  type SourceSocialRecord,
  type PtsSignal,
} from '@/lib/db/schema';
import { DIMENSION_LABELS, type Dimension, DIMENSIONS } from '@pts/domain';
import { DemoPanelSplit } from '@/components/pts/demo/demo-panel-split';

type Props = { params: Promise<{ patientId: string }> };

export default async function DemoSplitPage({ params }: Props) {
  const { patientId } = await params;
  const ctx = await getActiveTenantContext();
  if (!ctx) redirect('/login');

  const data = await withTransactionContext(ctx.userId, ctx.tenantId, async (tx) => {
    // Paciente
    const [patient] = await tx
      .select({ id: patients.id, fullName: patients.fullName })
      .from(patients)
      .where(and(eq(patients.id, patientId), eq(patients.tenantId, ctx.tenantId)))
      .limit(1);
    if (!patient) return null;

    // Caso ativo
    const [activeCase] = await tx
      .select({ id: ptsCases.id, status: ptsCases.status })
      .from(ptsCases)
      .where(and(eq(ptsCases.patientId, patientId), eq(ptsCases.tenantId, ctx.tenantId)))
      .orderBy(desc(ptsCases.createdAt))
      .limit(1);

    // Fontes
    const [healthRows, socialRows] = await Promise.all([
      tx
        .select({ id: sourceHealthRecords.id, unitLabel: sourceHealthRecords.unitLabel, rawText: sourceHealthRecords.rawText, recordedAt: sourceHealthRecords.recordedAt })
        .from(sourceHealthRecords)
        .where(and(eq(sourceHealthRecords.patientId, patientId), eq(sourceHealthRecords.tenantId, ctx.tenantId)))
        .orderBy(desc(sourceHealthRecords.recordedAt)),
      tx
        .select({ id: sourceSocialRecords.id, unitLabel: sourceSocialRecords.unitLabel, rawText: sourceSocialRecords.rawText, recordedAt: sourceSocialRecords.recordedAt })
        .from(sourceSocialRecords)
        .where(and(eq(sourceSocialRecords.patientId, patientId), eq(sourceSocialRecords.tenantId, ctx.tenantId)))
        .orderBy(desc(sourceSocialRecords.recordedAt)),
    ]);

    // Dimensões derivadas (mais recentes por dimensão)
    const dimensionRows = activeCase
      ? await tx
          .select()
          .from(ptsDimensions)
          .where(and(eq(ptsDimensions.caseId, activeCase.id), eq(ptsDimensions.tenantId, ctx.tenantId)))
          .orderBy(desc(ptsDimensions.createdAt))
      : [];

    // Pega a mais recente por dimensão
    const latestDimensions: Partial<Record<Dimension, (typeof dimensionRows)[0]>> = {};
    for (const row of dimensionRows) {
      const dim = row.dimension as Dimension;
      if (!latestDimensions[dim]) latestDimensions[dim] = row;
    }

    // Sinalizações recentes
    const signals = activeCase
      ? await tx
          .select({ id: ptsSignals.id, needTypeId: ptsSignals.needTypeId, status: ptsSignals.status, priority: ptsSignals.priority, destinationComponent: ptsSignals.destinationComponent, createdAt: ptsSignals.createdAt })
          .from(ptsSignals)
          .where(and(eq(ptsSignals.caseId, activeCase.id), eq(ptsSignals.tenantId, ctx.tenantId)))
          .orderBy(desc(ptsSignals.createdAt))
          .limit(10)
      : [];

    return { patient, activeCase, healthRows, socialRows, latestDimensions, signals };
  });

  if (!data) notFound();

  return (
    <DemoPanelSplit
      patientId={patientId}
      patient={data.patient}
      caseId={data.activeCase?.id ?? null}
      caseStatus={data.activeCase?.status ?? null}
      healthRecords={(data.healthRows as SourceHealthRecord[]).map((r) => ({ ...r, recordedAt: r.recordedAt.toISOString() }))}
      socialRecords={(data.socialRows as SourceSocialRecord[]).map((r) => ({ ...r, recordedAt: r.recordedAt.toISOString() }))}
      dimensions={DIMENSIONS.map((dim) => {
        const row = data.latestDimensions[dim];
        return {
          dimension: dim,
          label: DIMENSION_LABELS[dim],
          payload: row ? (row.payload as any) : null,
          sensitivity: row ? (row.sensitivity as string) : 'normal',
          derivedAt: row ? row.createdAt.toISOString() : null,
        };
      })}
      signals={(data.signals as PtsSignal[]).map((s) => ({
        id: s.id,
        needTypeId: s.needTypeId ?? '',
        status: s.status,
        priority: s.priority,
        destinationComponent: s.destinationComponent,
        createdAt: s.createdAt.toISOString(),
      }))}
    />
  );
}
