/**
 * Núcleo do pipeline de ingestão (Fase 3), reutilizável por três chamadores:
 *  - Server Action manual (`runIngestAction`)
 *  - Endpoint `POST /api/ingest`
 *  - Job agendado de monitoramento contínuo (`ingest_scan`)
 *
 * Recebe um `tx` explícito: o chamador decide a estratégia de transação/RLS —
 * `withTransactionContext` (requisição autenticada, role `authenticated`, RLS ativa)
 * ou `getDb().transaction` (worker global, superusuário, filtro de tenant manual).
 *
 * Lê os registros-fonte, tokeniza/pseudonimiza antes de qualquer chamada à IA,
 * deriva as 5 Dimensões, faz o fan-out de sinalizações (estado `sugerida`,
 * humano-no-loop, atribuídas por matrícula) e roda os gatilhos G1/G2/G3.
 */
import { and, eq, desc } from 'drizzle-orm';
import {
  sourceHealthRecords,
  sourceSocialRecords,
  patients,
  type DimensionSourceRef,
  type DimensionSensitivity,
  type SourceHealthRecord,
  type SourceSocialRecord,
} from '@/lib/db/schema';
import { pseudonymize, DIMENSIONS, type Dimension } from '@pts/domain';
import { HealthAdapter } from '@pts/adapters/health.adapter';
import { SocialAdapter } from '@pts/adapters/social.adapter';
import { deriveDimensions } from '@/lib/pts/dimension-derivation.service';
import { analyzeClinicalText } from '@/lib/nlp/nlp-engine';
import { fanOutSignals } from '@/lib/pts/signal-fanout.service';
import { runTriggerDetectors } from '@/lib/pts/trigger-detector.service';
import { PtsDimensionRepository } from '@/modules/pts/repositories/pts-dimension.repository';
import { TokenVaultService } from '@/modules/patients/services/token-vault.service';
import { createHash } from 'crypto';
import type { TenantContext } from '@/lib/tenant-context';

export type IngestionPipelineResult = {
  dimensions: number;
  signalsCreated: number;
  triggered: boolean;
};

export async function runIngestionPipeline(
  ctx: TenantContext,
  tx: any,
  patientId: string,
  caseId: string,
): Promise<IngestionPipelineResult> {
  const [healthRows, socialRows] = await Promise.all([
    tx
      .select()
      .from(sourceHealthRecords)
      .where(and(eq(sourceHealthRecords.patientId, patientId), eq(sourceHealthRecords.tenantId, ctx.tenantId)))
      .orderBy(desc(sourceHealthRecords.recordedAt)),
    tx
      .select()
      .from(sourceSocialRecords)
      .where(and(eq(sourceSocialRecords.patientId, patientId), eq(sourceSocialRecords.tenantId, ctx.tenantId)))
      .orderBy(desc(sourceSocialRecords.recordedAt)),
  ]);

  const healthAdapter = new HealthAdapter();
  const socialAdapter = new SocialAdapter();

  const healthNormalized = await healthAdapter.normalize(
    (healthRows as SourceHealthRecord[]).map((r) => ({ id: r.id, unitLabel: r.unitLabel, rawText: r.rawText, recordedAt: r.recordedAt.toISOString() })),
  );
  const socialNormalized = await socialAdapter.normalize(
    (socialRows as SourceSocialRecord[]).map((r) => ({ id: r.id, unitLabel: r.unitLabel, rawText: r.rawText, recordedAt: r.recordedAt.toISOString() })),
  );

  const rawHealthText = (healthNormalized.find((n) => n.dimension === 'saude')?.payload as any)?.rawText ?? '';
  const rawSocialText = (socialNormalized.find((n) => n.dimension === 'social')?.payload as any)?.rawText ?? '';

  const [patient] = await tx
    .select()
    .from(patients)
    .where(and(eq(patients.id, patientId), eq(patients.tenantId, ctx.tenantId)))
    .limit(1);

  if (!patient) throw new Error('Cidadão não encontrado.');

  const tokenVault = new TokenVaultService(ctx, tx);
  const nameToken = await tokenVault.getOrCreateToken(patientId, 'fullName');

  let processedHealthText = rawHealthText;
  let processedSocialText = rawSocialText;

  const escapedName = patient.fullName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  processedHealthText = processedHealthText.replace(new RegExp(escapedName, 'gi'), nameToken);
  processedSocialText = processedSocialText.replace(new RegExp(escapedName, 'gi'), nameToken);

  if (patient.socialName) {
    const socialToken = await tokenVault.getOrCreateToken(patientId, 'socialName');
    const escapedSocial = patient.socialName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    processedHealthText = processedHealthText.replace(new RegExp(escapedSocial, 'gi'), socialToken);
    processedSocialText = processedSocialText.replace(new RegExp(escapedSocial, 'gi'), socialToken);
  }

  const { masked: maskedHealth } = pseudonymize(processedHealthText, []);
  const { masked: maskedSocial } = pseudonymize(processedSocialText, []);

  const nlpEntities = analyzeClinicalText([maskedHealth, maskedSocial].join(' '));
  const derivedDimensions = await deriveDimensions({ maskedHealthText: maskedHealth, maskedSocialText: maskedSocial });

  const dimRepo = new PtsDimensionRepository(ctx, tx);
  const allRecordIds = [...(healthRows as SourceHealthRecord[]).map((r) => r.id), ...(socialRows as SourceSocialRecord[]).map((r) => r.id)];
  const sourceRef: DimensionSourceRef = { source: 'health', recordIds: allRecordIds, derivedAt: new Date().toISOString() };

  for (const dim of DIMENSIONS) {
    const payload = derivedDimensions[dim as Dimension];
    const sensitivity: DimensionSensitivity = dim === 'psiquico' ? 'abstracted' : 'normal';
    const versionHash = createHash('sha256').update(JSON.stringify(payload)).digest('hex').slice(0, 16);
    await dimRepo.upsertDimension({ caseId, dimension: dim as Dimension, payload, sensitivity, sourceRef, versionHash });
  }

  const latestSourceRow = healthRows[0] ?? socialRows[0];
  const latestSourceRecordId = latestSourceRow?.id;
  const fanOutResult = await fanOutSignals(ctx, tx, {
    caseId,
    sourceRecordId: latestSourceRecordId,
    authorMunicipalRegistry: latestSourceRow?.authorMunicipalRegistry ?? null,
    originUnitId: latestSourceRow?.originUnitId ?? null,
    nlpEntities,
    derivedDimensions,
  });

  const triggerResult = await runTriggerDetectors(ctx, tx, patientId, caseId);

  return { dimensions: DIMENSIONS.length, signalsCreated: fanOutResult.created, triggered: triggerResult.triggered };
}
