import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getActiveTenantContext } from '@/lib/auth/get-tenant-context';
import { ForbiddenError, hasRole } from '@/lib/auth/authorization';
import { ListPatientsService } from '@/modules/patients';
import { patientFiltersSchema } from '@/modules/patients/patient.dto';
import { PatientsTable } from '@/modules/patients/components/patients-table';

export const metadata = { title: 'Pacientes' };

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function PatientsPage({ searchParams }: Props) {
  const ctx = await getActiveTenantContext();
  if (!ctx) redirect('/login');

  const params = await searchParams;
  const search = typeof params.search === 'string' ? params.search : undefined;

  const filters = patientFiltersSchema.parse({
    search,
    status: typeof params.status === 'string' ? params.status : undefined,
    page: params.page,
    pageSize: params.pageSize,
  });

  let result;
  try {
    const service = new ListPatientsService(ctx);
    result = await service.execute(filters);
  } catch (err) {
    if (err instanceof ForbiddenError) redirect('/unauthorized');
    throw err;
  }

  const canCreate = hasRole(ctx.role, 'professional');

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Pacientes</h1>
        {canCreate && (
          <Link
            href="/patients/new"
            className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-md px-4 py-2 text-sm font-medium transition-colors"
          >
            Novo paciente
          </Link>
        )}
      </div>

      <form method="GET" className="flex gap-2">
        <input
          name="search"
          defaultValue={search}
          placeholder="Buscar por nome..."
          className="border-input bg-background focus-visible:ring-ring flex-1 rounded-md border px-3 py-2 text-sm outline-none focus-visible:ring-2"
        />
        <button
          type="submit"
          className="bg-secondary text-secondary-foreground hover:bg-secondary/80 rounded-md px-4 py-2 text-sm font-medium"
        >
          Buscar
        </button>
        {search && (
          <Link
            href="/patients"
            className="text-muted-foreground hover:text-foreground rounded-md px-3 py-2 text-sm"
          >
            Limpar
          </Link>
        )}
      </form>

      <PatientsTable result={result} search={search} />
    </div>
  );
}
