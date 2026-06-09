/**
 * Cron de monitoramento contínuo: enfileira um job `ingest_scan` por tenant.
 * Disparado periodicamente por Vercel Cron (ou equivalente).
 *
 * Para cada tenant, o handler `ingest_scan` (JobProcessorService) reprocessa os
 * casos ativos com derivação de dimensões desatualizada — a IA analisando de
 * forma contínua, sem clique manual. Autenticado via CRON_SECRET (idem /api/jobs/process).
 *
 * Em produção, configure o intervalo no vercel.json (ex.: a cada 6 horas,
 * schedule "0 0,6,12,18 * * *").
 */
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db/client';
import { tenants } from '@/lib/db/schema';
import { BackgroundJobsRepository } from '@/modules/jobs/repositories/background-jobs.repository';

export async function GET(request: NextRequest) {
  return handleCron(request);
}

export async function POST(request: NextRequest) {
  return handleCron(request);
}

async function handleCron(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get('Authorization');

  if (process.env.NODE_ENV === 'production' && cronSecret) {
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ ok: false, error: 'Não autorizado.' }, { status: 401 });
    }
  }

  try {
    const db = getDb();
    const allTenants = await db.select({ id: tenants.id }).from(tenants);

    let enqueued = 0;
    for (const tenant of allTenants) {
      const jobsRepo = new BackgroundJobsRepository({ tenantId: tenant.id, userId: '', role: 'ADMIN', activeUnitId: null });
      await jobsRepo.enqueueJob('ingest_scan', { tenantId: tenant.id });
      enqueued++;
    }

    return NextResponse.json({ ok: true, tenantsEnqueued: enqueued });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message ?? String(err) },
      { status: 500 },
    );
  }
}
