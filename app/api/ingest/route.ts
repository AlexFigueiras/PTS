/**
 * POST /api/ingest — Fase 3.
 *
 * Pipeline de ingestão zero-trust:
 * 1. Valida JWT (getActiveTenantContext) — tenantId/userId do servidor, nunca do body.
 * 2. Lê registros-fonte (RLS garante escopo de tenant).
 * 3. Pseudonimiza antes de qualquer chamada à IA.
 * 4. Deriva as 5 Dimensões (IA + regra fixa de sensibilidade para Psíquico).
 * 5. Persiste em pts_dimensions.
 * 6. Fan-out de sinalizações cruzadas (estado `sugerida`, humano-no-loop).
 * 7. Executa detectores de gatilho G1/G2/G3.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getActiveTenantContext } from '@/lib/auth/get-tenant-context';
import { withTransactionContext } from '@/lib/db/client';
import {
  sourceHealthRecords,
  sourceSocialRecords,
  ptsCases,
  ptsDimensions,
  type DimensionSourceRef,
  type SourceHealthRecord,
  type SourceSocialRecord,
} from '@/lib/db/schema';
import { and, eq, desc } from 'drizzle-orm';
import { pseudonymize } from '@pts/domain';
import { HealthAdapter } from '@pts/adapters/health.adapter';
import { SocialAdapter } from '@pts/adapters/social.adapter';
import { deriveDimensions } from '@/lib/pts/dimension-derivation.service';
import { analyzeClinicalText } from '@/lib/nlp/nlp-engine';
import { fanOutSignals } from '@/lib/pts/signal-fanout.service';
import { runTriggerDetectors } from '@/lib/pts/trigger-detector.service';
import { PtsDimensionRepository } from '@/modules/pts/repositories/pts-dimension.repository';
import { createHash } from 'crypto';
import { DIMENSIONS, type Dimension } from '@pts/domain';

const ingestBodySchema = z.object({
  patientId: z.string().uuid(),
  caseId: z.string().uuid(),
});

export async function POST(request: NextRequest) {
  // 1. Auth — zero trust: TenantContext do servidor
  const ctx = await getActiveTenantContext();
  if (!ctx) {
    return NextResponse.json({ ok: false, error: 'Não autenticado.' }, { status: 401 });
  }

  // 2. Validação do body
  let body: z.infer<typeof ingestBodySchema>;
  try {
    body = ingestBodySchema.parse(await request.json());
  } catch {
    return NextResponse.json({ ok: false, error: 'Parâmetros inválidos.' }, { status: 400 });
  }

  const { patientId, caseId } = body;

  try {
    const result = await withTransactionContext(ctx.userId, ctx.tenantId, async (tx) => {
      // 3. Verifica caso pertence ao tenant
      const [activeCase] = await tx
        .select({ id: ptsCases.id, status: ptsCases.status })
        .from(ptsCases)
        .where(and(eq(ptsCases.id, caseId), eq(ptsCases.tenantId, ctx.tenantId)))
        .limit(1);

      if (!activeCase) {
        throw new Error('Caso não encontrado ou fora do escopo do município.');
      }

      // 4. Lê registros-fonte (RLS + tenantId)
      const [healthRows, socialRows] = await Promise.all([
        tx
          .select()
          .from(sourceHealthRecords)
          .where(
            and(
              eq(sourceHealthRecords.patientId, patientId),
              eq(sourceHealthRecords.tenantId, ctx.tenantId),
            ),
          )
          .orderBy(desc(sourceHealthRecords.recordedAt)),
        tx
          .select()
          .from(sourceSocialRecords)
          .where(
            and(
              eq(sourceSocialRecords.patientId, patientId),
              eq(sourceSocialRecords.tenantId, ctx.tenantId),
            ),
          )
          .orderBy(desc(sourceSocialRecords.recordedAt)),
      ]);

      // 5. Normaliza via adapters
      const healthAdapter = new HealthAdapter();
      const socialAdapter = new SocialAdapter();

      const healthNormalized = await healthAdapter.normalize(
        (healthRows as SourceHealthRecord[]).map((r) => ({
          id: r.id,
          unitLabel: r.unitLabel,
          rawText: r.rawText,
          recordedAt: r.recordedAt.toISOString(),
        })),
      );
      const socialNormalized = await socialAdapter.normalize(
        (socialRows as SourceSocialRecord[]).map((r) => ({
          id: r.id,
          unitLabel: r.unitLabel,
          rawText: r.rawText,
          recordedAt: r.recordedAt.toISOString(),
        })),
      );

      // 6. Pseudonimiza — nenhum identificador vai à IA
      const rawHealthText = (healthNormalized.find((n) => n.dimension === 'saude')?.payload as any)?.rawText ?? '';
      const rawSocialText = (socialNormalized.find((n) => n.dimension === 'social')?.payload as any)?.rawText ?? '';

      const { masked: maskedHealth } = pseudonymize(rawHealthText, []);
      const { masked: maskedSocial } = pseudonymize(rawSocialText, []);

      // 7. NLP — detecção rápida de necessidades (offline, zero latência)
      const nlpEntities = analyzeClinicalText([maskedHealth, maskedSocial].join(' '));

      // 8. Derivação de Dimensões via IA (com fallback NLP)
      const derivedDimensions = await deriveDimensions({
        maskedHealthText: maskedHealth,
        maskedSocialText: maskedSocial,
      });

      // 9. Persiste as 5 Dimensões em pts_dimensions
      const dimRepo = new PtsDimensionRepository(ctx, tx);
      const allRecordIds = [
        ...(healthRows as SourceHealthRecord[]).map((r) => r.id),
        ...(socialRows as SourceSocialRecord[]).map((r) => r.id),
      ];

      const sourceRef: DimensionSourceRef = {
        source: 'health',
        recordIds: allRecordIds,
        derivedAt: new Date().toISOString(),
      };

      for (const dim of DIMENSIONS) {
        const payload = derivedDimensions[dim];
        const sensitivity = dim === 'psiquico' ? 'abstracted' : 'normal';
        const versionHash = createHash('sha256')
          .update(JSON.stringify(payload))
          .digest('hex')
          .slice(0, 16);

        await dimRepo.upsertDimension({
          caseId,
          dimension: dim as Dimension,
          payload,
          sensitivity,
          sourceRef,
          versionHash,
        });
      }

      // 10. Fan-out de sinalizações cruzadas (estado `sugerida`, humano-no-loop)
      const latestSourceRecordId = healthRows[0]?.id ?? socialRows[0]?.id;
      const fanOutResult = await fanOutSignals(ctx, tx, {
        caseId,
        sourceRecordId: latestSourceRecordId,
        nlpEntities,
        derivedDimensions,
      });

      // 11. Detectores de gatilho G1/G2/G3
      const triggerResult = await runTriggerDetectors(ctx, tx, patientId, caseId);

      return {
        dimensions: DIMENSIONS.length,
        signals: fanOutResult,
        trigger: triggerResult.triggered
          ? { trigger: triggerResult.triggerResult?.trigger, newStatus: triggerResult.newStatus }
          : null,
      };
    });

    return NextResponse.json({ ok: true, ...result });
  } catch (err: any) {
    console.error('[POST /api/ingest]', err);
    return NextResponse.json(
      { ok: false, error: err?.message ?? 'Erro interno.' },
      { status: 500 },
    );
  }
}
