import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getActiveTenantContext } from '@/lib/auth/get-tenant-context';
import { ForbiddenError, hasRole } from '@/lib/auth/authorization';
import { ListPatientsService } from '@/modules/patients';
import { patientFiltersSchema } from '@/modules/patients/patient.dto';
import { PatientsTable } from '@/modules/patients/components/patients-table';

import { Plus, Search, X } from 'lucide-react';

export const metadata = { title: 'Pacientes | CAPS' };

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
    <div className="min-h-full bg-background/50 text-foreground selection:bg-primary/20">
      <div className="mx-auto max-w-6xl space-y-10 p-16 animate-reveal">
        {/* Header Section */}
        <div className="flex flex-col justify-between gap-8 md:flex-row md:items-end">
          <div className="space-y-2">
            <h1 className="text-4xl font-black uppercase italic tracking-tighter text-foreground">
              Pacientes
            </h1>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/40">
              Gestão da base de usuários do CAPS
            </p>
          </div>
          
          {canCreate && (
            <Link
              href="/patients/new"
              className="group flex items-center gap-3 rounded-2xl bg-primary px-8 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-primary-foreground shadow-[0_0_30px_rgba(var(--primary),0.2)] transition-all hover:scale-105 active:scale-95"
            >
              <Plus size={16} className="transition-transform group-hover:rotate-90" />
              Novo paciente
            </Link>
          )}
        </div>

        {/* Filters & Search */}
        <div className="overflow-hidden rounded-3xl border border-border bg-card p-10 shadow-diffusion backdrop-blur-xl">
          <form method="GET" className="flex flex-col gap-4 md:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-muted-foreground/30" size={18} />
              <input
                name="search"
                defaultValue={search}
                placeholder="Buscar por nome ou CPF..."
                className="w-full rounded-2xl border border-border bg-background/30 py-4 pl-14 pr-6 text-sm font-medium text-foreground placeholder:text-muted-foreground/20 focus:border-primary focus:ring-4 focus:ring-primary/10 focus:outline-none transition-all duration-300"
              />
            </div>
            
            <button
              type="submit"
              className="rounded-2xl bg-secondary px-10 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-secondary-foreground transition-all hover:bg-secondary/80 active:scale-95"
            >
              Buscar
            </button>

            {search && (
              <Link
                href="/patients"
                className="flex items-center justify-center gap-2 rounded-2xl border border-border bg-background/30 px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground transition-all hover:bg-destructive/10 hover:text-destructive hover:border-destructive/20 active:scale-95"
              >
                <X size={14} /> Limpar
              </Link>
            )}
          </form>
        </div>

        {/* Patients List */}
        <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-diffusion backdrop-blur-sm">
          <PatientsTable result={result} search={search} />
        </div>
      </div>
    </div>
  );
}
