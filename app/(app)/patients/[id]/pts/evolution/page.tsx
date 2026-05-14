import { notFound, redirect } from 'next/navigation';
import { getActiveTenantContext } from '@/lib/auth/get-tenant-context';
import { GetPatientService } from '@/modules/patients';
import { loadPtsDocument, getPtsEvolutions } from '../actions';
import { EvolutionTracker } from '@/components/pts/evolution-tracker';

export default async function PtsEvolutionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const ctx = await getActiveTenantContext();
  if (!ctx) redirect('/login');

  const service = new GetPatientService(ctx);
  const patient = await service.execute(id);
  if (!patient) notFound();

  const doc = await loadPtsDocument(id);
  if (!doc) redirect(`/patients/${id}/pts`); // No baseline yet

  const evolutions = await getPtsEvolutions(doc.id);

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <EvolutionTracker 
        patientId={id}
        patientName={patient.fullName}
        baseline={doc}
        evolutions={evolutions}
      />
    </div>
  );
}
