/**
 * Cron diário de reavaliação: enfileira um job `reavaliacao_check` por tenant.
 * Disparado por Vercel Cron (ex.: schedule "0 8 * * *"). Autenticado via CRON_SECRET
 * (idem /api/jobs/process).
 *
 * O handler `reavaliacao_check` (JobProcessorService) notifica o Técnico de
 * Referência das ações cuja reavaliação formal vence no dia — fecha o loop
 * temporal das metas. Ver modules/pts/services/reavaliacao-reminder.service.ts.
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
      await jobsRepo.enqueueJob('reavaliacao_check', { tenantId: tenant.id });
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
