'use server';

import { revalidatePath } from 'next/cache';
import { getActiveTenantContext } from '@/lib/auth/get-tenant-context';
import { withTransactionContext } from '@/lib/db/client';
import { and, eq } from 'drizzle-orm';
import { ptsCases } from '@/lib/db/schema';
import { PtsDimensionRepository } from '@/modules/pts/repositories/pts-dimension.repository';
import type { Dimension } from '@pts/domain';
import { createHash } from 'crypto';

type SaveDimensionInput = {
  caseId: string;
  dimension: Dimension;
  estado: string;
  fragilidades: string[];
  potencialidades: string[];
  risco: 'baixo' | 'medio' | 'alto' | 'critico';
};

export async function saveDimensionManuallyAction(
  input: SaveDimensionInput,
): Promise<{ ok: boolean; error?: string }> {
  const ctx = await getActiveTenantContext();
  if (!ctx) return { ok: false, error: 'Não autenticado.' };

  try {
    await withTransactionContext(ctx.userId, ctx.tenantId, async (tx) => {
      const [activeCase] = await tx
        .select({ id: ptsCases.id })
        .from(ptsCases)
        .where(and(eq(ptsCases.id, input.caseId), eq(ptsCases.tenantId, ctx.tenantId)))
        .limit(1);

      if (!activeCase) throw new Error('Caso não encontrado.');

      const payload = {
        estado: input.estado,
        fragilidades: input.fragilidades,
        potencialidades: input.potencialidades,
        risco: input.risco,
        observacoes: 'Dimensão preenchida manualmente (transição — ingestão automática pendente de contrato).',
      };

      const versionHash = createHash('sha256').update(JSON.stringify(payload)).digest('hex').slice(0, 16);

      const repo = new PtsDimensionRepository(ctx, tx);
      await repo.upsertDimension({
        caseId: input.caseId,
        dimension: input.dimension,
        payload,
        sensitivity: input.dimension === 'psiquico' ? 'abstracted' : 'normal',
        sourceRef: { source: 'manual', recordIds: [], derivedAt: new Date().toISOString() },
        versionHash,
      });
    });

    revalidatePath(`/patients/${input.caseId}/caso`);
    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err?.message ?? 'Erro interno.' };
  }
}
