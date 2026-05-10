import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getActiveTenantContext } from '@/lib/auth/get-tenant-context';
import { ForbiddenError, hasRole } from '@/lib/auth/authorization';
import { GetPatientService } from '@/modules/patients';
import { ListRecordsService } from '@/modules/records';
import { recordFiltersSchema } from '@/modules/records/record.dto';
import { RecordsList } from '@/modules/records/components/records-list';

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  const ctx = await getActiveTenantContext();
  if (!ctx) return { title: 'Prontuário' };
  const patient = await new GetPatientService(ctx).execute(id).catch(() => undefined);
  return { title: patient ? `Prontuário — ${patient.fullName}` : 'Prontuário' };
}

export default async function PatientRecordsPage({ params, searchParams }: Props) {
  const { id } = await params;
  const ctx = await getActiveTenantContext();
  if (!ctx) redirect('/login');

  let patient;
  try {
    patient = await new GetPatientService(ctx).execute(id);
  } catch (err) {
    if (err instanceof ForbiddenError) redirect('/unauthorized');
    throw err;
  }
  if (!patient) notFound();

  const sp = await searchParams;
  const filters = recordFiltersSchema.parse({
    patientId: id,
    type: typeof sp.type === 'string' ? sp.type : undefined,
    status: typeof sp.status === 'string' ? sp.status : undefined,
    page: sp.page,
    pageSize: sp.pageSize,
  });

  let result;
  try {
    result = await new ListRecordsService(ctx).execute(filters);
  } catch (err) {
    if (err instanceof ForbiddenError) redirect('/unauthorized');
    throw err;
  }

  const canCreate = hasRole(ctx.role, 'professional');

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <div>
        <Link
          href={`/patients/${id}`}
          className="text-muted-foreground hover:text-foreground mb-4 inline-flex items-center gap-1 text-sm"
        >
          ← {patient.preferredName ?? patient.fullName}
        </Link>
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold tracking-tight">Prontuário clínico</h1>
          {canCreate && (
            <Link
              href={`/patients/${id}/records/new`}
              className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-md px-4 py-2 text-sm font-medium transition-colors"
            >
              + Nova entrada
            </Link>
          )}
        </div>
      </div>

      <RecordsList result={result} patientId={id} />
    </div>
  );
}
