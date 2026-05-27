import { NextRequest, NextResponse } from 'next/server';
import { JobProcessorService } from '@/modules/jobs/services/job-processor.service';

export async function POST(request: NextRequest) {
  return processJobs(request);
}

export async function GET(request: NextRequest) {
  return processJobs(request);
}

async function processJobs(request: NextRequest) {
  // 1. Segurança: validação do token do Cron
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get('Authorization');

  // Em produção, a proteção por token é estritamente obrigatória
  if (process.env.NODE_ENV === 'production' && cronSecret) {
    const expectedAuth = `Bearer ${cronSecret}`;
    if (authHeader !== expectedAuth) {
      return NextResponse.json({ ok: false, error: 'Não autorizado.' }, { status: 401 });
    }
  }

  const processor = new JobProcessorService();
  const results: any[] = [];
  
  // Limite de processamento por invocação para evitar timeouts do servidor/gateway
  const BATCH_LIMIT = 15;
  let processedCount = 0;

  try {
    // 1. Executa o Reaper para limpar jobs zumbis (presos em 'processing' por mais de 5 minutos)
    const reapedCount = await processor.reapStuckJobs(5);

    // 2. Loop de processamento em lote
    while (processedCount < BATCH_LIMIT) {
      const res = await processor.processNextJob();
      
      if (!res.processed) {
        // Fila de jobs imediatos pendentes esvaziada
        break;
      }

      results.push({
        jobId: res.jobId,
        queueName: res.queueName,
        status: res.status,
        error: res.error,
      });

      processedCount++;
    }

    return NextResponse.json({
      ok: true,
      reapedJobsCount: reapedCount,
      processedJobsCount: processedCount,
      results,
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        ok: false,
        error: err?.message ?? String(err),
        processedJobsCount: processedCount,
        results,
      },
      { status: 500 }
    );
  }
}
