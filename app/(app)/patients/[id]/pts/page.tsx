import { notFound, redirect } from 'next/navigation';
import { getActiveTenantContext } from '@/lib/auth/get-tenant-context';
import { GetPatientService } from '@/modules/patients';
import { PtsForm } from '@/components/pts/pts-form';
import { loadPtsDocument } from './actions';
import type { PtsFormData } from '@/components/pts/pts-form';

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  const ctx = await getActiveTenantContext();
  if (!ctx) return { title: 'PTS' };
  const service = new GetPatientService(ctx);
  const patient = await service.execute(id);
  return { title: patient ? `PTS — ${patient.fullName}` : 'PTS' };
}

export default async function PtsPage({ params }: Props) {
  const { id } = await params;

  const ctx = await getActiveTenantContext();
  if (!ctx) redirect('/login');

  const service = new GetPatientService(ctx);
  const patient = await service.execute(id);
  if (!patient) notFound();

  const doc = await loadPtsDocument(id);
  const savedData = doc?.data as Partial<PtsFormData> | null;

  // Pre-fill from patient record so the form opens with existing data
  const initialData: Partial<PtsFormData> = {
    fullName: patient.fullName,
    cpf: patient.cpf ?? '',
    phone: patient.phone ?? '',
    email: patient.email ?? '',
    birthDate: patient.birthDate ?? '',
    gender: patient.gender ?? '',
    socialName: patient.socialName ?? '',
    fullAddress: patient.fullAddress ?? '',
    lat: patient.lat ?? null,
    lon: patient.lon ?? null,
    ...savedData,
  };

  return (
    <PtsForm
      patientId={id}
      patientName={patient.fullName}
      initialData={initialData}
      initialStatus={doc?.status}
    />
  );
}
