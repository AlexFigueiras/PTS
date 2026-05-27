import { redirect } from 'next/navigation';
import { getActiveTenantContext } from '@/lib/auth/get-tenant-context';
import { requireRole } from '@/lib/auth/authorization';
import { BackgroundJobsRepository } from '@/modules/jobs/repositories/background-jobs.repository';
import { DlqPanel } from '@/modules/jobs/components/dlq-panel';
import { parsePaginationParams } from '@/lib/pagination';

export const metadata = { title: 'DLQ Humana | Painel Administrativo' };

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function DlqPage({ searchParams }: Props) {
  const ctx = await getActiveTenantContext();
  if (!ctx) redirect('/login');

  // Apenas coordenação (MANAGER ou superior) tem permissão para visualizar e gerenciar a DLQ
  try {
    requireRole(ctx, 'MANAGER');
  } catch {
    redirect('/unauthorized');
  }

  const params = await searchParams;
  // Usamos 10 itens por página por padrão na DLQ para visualização mais rica de logs
  const { page, pageSize } = parsePaginationParams(params, { page: 1, pageSize: 10 });
  const queue = typeof params.queue === 'string' ? params.queue : undefined;

  const repo = new BackgroundJobsRepository(ctx);
  const result = await repo.listJobs({
    status: 'dead_letter',
    queueName: queue,
    page,
    pageSize,
  });

  return (
    <DlqPanel
      initialResult={result}
      currentQueue={queue}
      currentPage={page}
    />
  );
}
