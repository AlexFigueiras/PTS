/**
 * POST /api/ingest — Fase 3.
 *
 * Pipeline de ingestão zero-trust:
 * 1. Valida JWT (getActiveTenantContext) — tenantId/userId do servidor, nunca do body.
 * 2. Confirma que o caso pertence ao tenant.
 * 3. Delega ao pipeline compartilhado (lib/pts/ingestion-pipeline.service):
 *    tokeniza/pseudonimiza → deriva 5 Dimensões → fan-out de sinalizações → gatilhos.
 *
 * O mesmo pipeline alimenta a Server Action manual e o job de monitoramento contínuo.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getActiveTenantContext } from '@/lib/auth/get-tenant-context';
import { withTransactionContext } from '@/lib/db/client';
import { ptsCases } from '@/lib/db/schema';
import { and, eq } from 'drizzle-orm';
import { runIngestionPipeline } from '@/lib/pts/ingestion-pipeline.service';

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
        .select({ id: ptsCases.id })
        .from(ptsCases)
        .where(and(eq(ptsCases.id, caseId), eq(ptsCases.tenantId, ctx.tenantId)))
        .limit(1);

      if (!activeCase) {
        throw new Error('Caso não encontrado ou fora do escopo do município.');
      }

      // 4. Pipeline compartilhado
      return runIngestionPipeline(ctx, tx, patientId, caseId);
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
