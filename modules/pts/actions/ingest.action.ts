'use server';

import { revalidatePath } from 'next/cache';
import { getActiveTenantContext } from '@/lib/auth/get-tenant-context';
import { withTransactionContext } from '@/lib/db/client';
import { and, eq } from 'drizzle-orm';
import { sourceHealthRecords, sourceSocialRecords, ptsCases } from '@/lib/db/schema';
import { runIngestionPipeline } from '@/lib/pts/ingestion-pipeline.service';

export type IngestActionResult =
  | { ok: true; dimensions: number; signalsCreated: number; triggered: boolean }
  | { ok: false; error: string };

export async function runIngestAction(patientId: string, caseId: string): Promise<IngestActionResult> {
  const ctx = await getActiveTenantContext();
  if (!ctx) return { ok: false, error: 'Não autenticado.' };

  try {
    const result = await withTransactionContext(ctx.userId, ctx.tenantId, async (tx) => {
      const [activeCase] = await tx
        .select({ id: ptsCases.id })
        .from(ptsCases)
        .where(and(eq(ptsCases.id, caseId), eq(ptsCases.tenantId, ctx.tenantId)))
        .limit(1);

      if (!activeCase) throw new Error('Caso não encontrado.');

      return runIngestionPipeline(ctx, tx, patientId, caseId);
    });

    revalidatePath(`/demo/${patientId}`);
    revalidatePath(`/patients/${patientId}/caso`);
    return { ok: true, ...result };
  } catch (err: any) {
    return { ok: false, error: err?.message ?? 'Erro interno.' };
  }
}

export type UpdateSourceRecordInput = {
  id: string;
  rawText: string;
  source: 'health' | 'social';
};

export async function updateSourceRecordAction(input: UpdateSourceRecordInput): Promise<{ ok: boolean; error?: string }> {
  const ctx = await getActiveTenantContext();
  if (!ctx) return { ok: false, error: 'Não autenticado.' };

  try {
    await withTransactionContext(ctx.userId, ctx.tenantId, async (tx) => {
      const table = input.source === 'health' ? sourceHealthRecords : sourceSocialRecords;
      await tx
        .update(table)
        .set({ rawText: input.rawText })
        .where(and(eq(table.id, input.id), eq(table.tenantId, ctx.tenantId)));
    });
    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err?.message ?? 'Erro interno.' };
  }
}
