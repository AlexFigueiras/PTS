import { redirect } from 'next/navigation';
import { getActiveTenantContext } from '@/lib/auth/get-tenant-context';
import { ListRecordsService } from '@/modules/records';
import { recordFiltersSchema } from '@/modules/records/record.dto';
import { RecordsList } from '@/modules/records/components/records-list';

export const metadata = { title: 'Prontuários | MentalGest' };

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function GlobalRecordsPage({ searchParams }: Props) {
  const ctx = await getActiveTenantContext();
  if (!ctx) redirect('/login');

  const sp = await searchParams;
  const filters = recordFiltersSchema.parse({
    type: typeof sp.type === 'string' ? sp.type : undefined,
    status: typeof sp.status === 'string' ? sp.status : undefined,
    page: sp.page,
    pageSize: sp.pageSize,
  });

  const result = await new ListRecordsService(ctx).execute(filters);

  return (
    <div className="mx-auto max-w-4xl space-y-8 p-12 animate-reveal">
      <div className="space-y-2">
        <h1 className="text-4xl font-semibold tracking-tight">Prontuários Clínicos</h1>
        <p className="text-muted-foreground">Listagem de todos os registros do tenant.</p>
      </div>

      <RecordsList result={result} />
    </div>
  );
}
