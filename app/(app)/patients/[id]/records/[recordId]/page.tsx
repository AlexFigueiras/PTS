import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getActiveTenantContext } from '@/lib/auth/get-tenant-context';
import { ForbiddenError, hasRole } from '@/lib/auth/authorization';
import { GetPatientService } from '@/modules/patients';
import { GetRecordService } from '@/modules/records';
import { RecordForm } from '@/modules/records/components/record-form';
import { RecordTypeBadge } from '@/modules/records/components/record-type-badge';
import { RecordStatusBadge } from '@/modules/records/components/record-status-badge';
import { finalizeRecordFormAction, deleteRecordFormAction } from '@/modules/records/record.actions';

type Props = { params: Promise<{ id: string; recordId: string }> };

export async function generateMetadata({ params }: Props) {
  const { id, recordId } = await params;
  const ctx = await getActiveTenantContext();
  if (!ctx) return { title: 'Registro clínico' };
  const record = await new GetRecordService(ctx).execute(recordId).catch(() => undefined);
  const patient = await new GetPatientService(ctx).execute(id).catch(() => undefined);
  const title = record?.title ?? new Date(record?.sessionDate + 'T00:00:00').toLocaleDateString('pt-BR') ?? 'Registro';
  return { title: `${title} — ${patient?.fullName ?? 'Paciente'}` };
}

export default async function RecordPage({ params }: Props) {
  const { id, recordId } = await params;
  const ctx = await getActiveTenantContext();
  if (!ctx) redirect('/login');

  let patient, record;
  try {
    [patient, record] = await Promise.all([
      new GetPatientService(ctx).execute(id),
      new GetRecordService(ctx).execute(recordId),
    ]);
  } catch (err) {
    if (err instanceof ForbiddenError) redirect('/unauthorized');
    throw err;
  }

  if (!patient) notFound();
  if (!record) notFound();

  const isDraft = record.status === 'draft';
  const canEdit = isDraft && hasRole(ctx.role, 'professional');
  const canFinalize = isDraft && hasRole(ctx.role, 'professional');
  const canDelete = isDraft && hasRole(ctx.role, 'admin');
  const sessionDateFormatted = new Date(record.sessionDate + 'T00:00:00').toLocaleDateString('pt-BR');

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <div>
        <Link
          href={`/patients/${id}/records`}
          className="text-muted-foreground hover:text-foreground mb-4 inline-flex items-center gap-1 text-sm"
        >
          ← Prontuário de {patient.preferredName ?? patient.fullName}
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">
            {record.title ?? sessionDateFormatted}
          </h1>
          <RecordTypeBadge type={record.type} />
          <RecordStatusBadge status={record.status} />
        </div>
        {record.title && (
          <p className="text-muted-foreground mt-1 text-sm">{sessionDateFormatted}</p>
        )}
      </div>

      <div className="rounded-lg border p-6">
        <RecordForm mode={canEdit ? 'edit' : 'view'} record={record} />
      </div>

      {(canFinalize || canDelete) && (
        <div className="flex items-center gap-3 rounded-lg border p-4">
          <p className="text-muted-foreground flex-1 text-sm">
            {canFinalize && 'Finalizar torna o registro imutável e encerra a edição.'}
          </p>
          {canFinalize && (
            <form action={finalizeRecordFormAction}>
              <input type="hidden" name="id" value={record.id} />
              <input type="hidden" name="patientId" value={id} />
              <button
                type="submit"
                className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-green-700"
              >
                Finalizar registro
              </button>
            </form>
          )}
          {canDelete && (
            <form action={deleteRecordFormAction}>
              <input type="hidden" name="id" value={record.id} />
              <input type="hidden" name="patientId" value={id} />
              <button
                type="submit"
                className="text-destructive hover:text-destructive/80 rounded-md px-3 py-2 text-sm font-medium transition-colors"
                onClick={(e) => {
                  if (!confirm('Tem certeza que deseja excluir este registro?')) e.preventDefault();
                }}
              >
                Excluir
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
