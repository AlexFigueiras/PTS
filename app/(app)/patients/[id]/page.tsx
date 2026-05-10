import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getActiveTenantContext } from '@/lib/auth/get-tenant-context';
import { ForbiddenError } from '@/lib/auth/authorization';
import { GetPatientService } from '@/modules/patients';
import { PatientForm } from '@/modules/patients/components/patient-form';
import { PatientStatusBadge } from '@/modules/patients/components/patient-status-badge';
import { PatientFilesCard } from '@/modules/files/components/patient-files-card';

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  const ctx = await getActiveTenantContext();
  if (!ctx) return { title: 'Paciente' };

  const service = new GetPatientService(ctx);
  const patient = await service.execute(id);
  return { title: patient ? patient.fullName : 'Paciente não encontrado' };
}

export default async function PatientPage({ params }: Props) {
  const { id } = await params;

  const ctx = await getActiveTenantContext();
  if (!ctx) redirect('/login');

  let patient;
  try {
    const service = new GetPatientService(ctx);
    patient = await service.execute(id);
  } catch (err) {
    if (err instanceof ForbiddenError) redirect('/unauthorized');
    throw err;
  }

  if (!patient) notFound();

  const birthDateFormatted = patient.birthDate
    ? new Date(patient.birthDate + 'T00:00:00').toLocaleDateString('pt-BR')
    : null;

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-6">
      <div>
        <Link
          href="/patients"
          className="text-muted-foreground hover:text-foreground mb-4 inline-flex items-center gap-1 text-sm"
        >
          ← Voltar para pacientes
        </Link>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">
            {patient.preferredName ?? patient.fullName}
          </h1>
          <PatientStatusBadge status={patient.status} />
        </div>
        {patient.preferredName && (
          <p className="text-muted-foreground mt-0.5 text-sm">{patient.fullName}</p>
        )}
        {birthDateFormatted && (
          <p className="text-muted-foreground mt-1 text-xs">
            Nascimento: {birthDateFormatted}
          </p>
        )}
      </div>

      <div className="rounded-lg border p-6">
        <h2 className="mb-4 text-sm font-medium">Dados do paciente</h2>
        <PatientForm mode="edit" patient={patient} />
      </div>

      <PatientFilesCard ctx={ctx} patientId={patient.id} />
    </div>
  );
}
