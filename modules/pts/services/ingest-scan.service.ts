/**
 * IngestScanService — Monitoramento contínuo (Ajuste C).
 *
 * Roda dentro do job-processor (fila 'ingest_scan'), enfileirado por tenant pelo
 * cron /api/jobs/scan-ingestion. Para cada caso ativo cujo registro-fonte mais
 * recente é posterior à última derivação de dimensões, re-roda o pipeline de
 * ingestão (re-deriva as 5 Dimensões, faz fan-out de sinalizações com dedupe e
 * roda os gatilhos G1/G2/G3). É o que torna a análise da IA contínua, sem clique.
 *
 * Padrão de worker global (como NonComplianceAlertService): usa getDb()
 * (superusuário, RLS bypass) com filtro de tenant manual, e executa o pipeline
 * dentro de getDb().transaction (tx explícito passado aos repositórios).
 * Idempotente: só reprocessa casos com derivação desatualizada; o fan-out já
 * deduplica sinalizações ativas para o mesmo caso+necessidade.
 */
import { and, eq, desc, inArray } from 'drizzle-orm';
import { getDb } from '@/lib/db/client';
import { getLogger } from '@/lib/logger';
import { ptsCases, ptsDimensions, sourceHealthRecords, sourceSocialRecords } from '@/lib/db/schema';
import { runIngestionPipeline } from '@/lib/pts/ingestion-pipeline.service';
import type { TenantContext } from '@/lib/tenant-context';
import type { CaseStatus } from '@pts/domain';

const log = getLogger({ service: 'IngestScanService' });

/** Status de caso "vivo" monitorados continuamente. */
const ACTIVE_CASE_STATUSES: CaseStatus[] = ['radar', 'observacao', 'acompanhamento', 'pts_ativo', 'pia_ativo'];

export async function runIngestScan(tenantId: string): Promise<{ scanned: number; rederived: number }> {
  const db = getDb();

  const cases = await db
    .select({ id: ptsCases.id, patientId: ptsCases.patientId })
    .from(ptsCases)
    .where(
      and(
        eq(ptsCases.tenantId, tenantId),
        inArray(ptsCases.status, ACTIVE_CASE_STATUSES),
        eq(ptsCases.arquivado, false),
      ),
    );

  if (cases.length === 0) return { scanned: 0, rederived: 0 };

  // Worker global: sem usuário logado nem unidade ativa. A autoria das sinalizações
  // é resolvida pela matrícula do registro-fonte (Ajuste B); sem matrícula vinculável,
  // a sinalização fica sem autor (não crasha — authorId é nullable).
  const ctx: TenantContext = { tenantId, userId: '', role: 'PROFESSIONAL', activeUnitId: null };

  let rederived = 0;

  for (const c of cases) {
    try {
      // Registro-fonte mais recente (saúde ou social) do paciente.
      const [latestHealth] = await db
        .select({ at: sourceHealthRecords.recordedAt })
        .from(sourceHealthRecords)
        .where(and(eq(sourceHealthRecords.patientId, c.patientId), eq(sourceHealthRecords.tenantId, tenantId)))
        .orderBy(desc(sourceHealthRecords.recordedAt))
        .limit(1);
      const [latestSocial] = await db
        .select({ at: sourceSocialRecords.recordedAt })
        .from(sourceSocialRecords)
        .where(and(eq(sourceSocialRecords.patientId, c.patientId), eq(sourceSocialRecords.tenantId, tenantId)))
        .orderBy(desc(sourceSocialRecords.recordedAt))
        .limit(1);

      const latestSourceAt = [latestHealth?.at, latestSocial?.at]
        .filter((d): d is Date => !!d)
        .sort((a, b) => b.getTime() - a.getTime())[0];

      if (!latestSourceAt) continue; // sem dado-fonte para este caso — nada a derivar

      // Última derivação de dimensões deste caso.
      const [latestDim] = await db
        .select({ at: ptsDimensions.createdAt })
        .from(ptsDimensions)
        .where(and(eq(ptsDimensions.caseId, c.id), eq(ptsDimensions.tenantId, tenantId)))
        .orderBy(desc(ptsDimensions.createdAt))
        .limit(1);

      // Em dia: a derivação é igual/mais recente que o último relato.
      if (latestDim?.at && latestDim.at >= latestSourceAt) continue;

      // Desatualizado → re-roda o pipeline numa transação de worker (superusuário).
      await db.transaction(async (tx) => {
        await runIngestionPipeline(ctx, tx, c.patientId, c.id);
      });
      rederived++;
    } catch (err) {
      log.error({ err, caseId: c.id, tenantId }, 'IngestScan: erro ao reprocessar caso');
    }
  }

  return { scanned: cases.length, rederived };
}
