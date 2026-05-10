import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getActiveTenantContext } from '@/lib/auth/get-tenant-context';
import { ForbiddenError, requireRole } from '@/lib/auth/authorization';
import { GetPatientService } from '@/modules/patients';
import { RecordForm } from '@/modules/records/components/record-form';

type Props = { params: Promise<{ id: string }> };

export const metadata = { title: 'Nova entrada clínica' };

export default async function NewRecordPage({ params }: Props) {
  const { id } = await params;
  const ctx = await getActiveTenantContext();
  if (!ctx) redirect('/login');

  try {
    requireRole(ctx, 'professional');
  } catch (err) {
    if (err instanceof ForbiddenError) redirect('/unauthorized');
    throw err;
  }

  let patient;
  try {
    patient = await new GetPatientService(ctx).execute(id);
  } catch (err) {
    if (err instanceof ForbiddenError) redirect('/unauthorized');
    throw err;
  }
  if (!patient) notFound();

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <div>
        <Link
          href={`/patients/${id}/records`}
          className="text-muted-foreground hover:text-foreground mb-4 inline-flex items-center gap-1 text-sm"
        >
          ← Prontuário de {patient.preferredName ?? patient.fullName}
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">Nova entrada clínica</h1>
      </div>

      <div className="rounded-lg border p-6">
        <RecordForm mode="create" patientId={id} />
      </div>
    </div>
  );
}
