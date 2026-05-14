import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getActiveTenantContext } from '@/lib/auth/get-tenant-context';
import { ForbiddenError } from '@/lib/auth/authorization';
import { GetPatientService } from '@/modules/patients';
import { PatientForm } from '@/modules/patients/components/patient-form';
import { PatientStatusBadge } from '@/modules/patients/components/patient-status-badge';
import { PatientFilesCard } from '@/modules/files/components/patient-files-card';
import { ArrowLeft, ChevronRight, AlertTriangle } from 'lucide-react';
import { loadPtsDocument } from './pts/actions';

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

  const doc = await loadPtsDocument(id);
  const isPastDue = doc?.nextReviewAt && new Date(doc.nextReviewAt) < new Date();
  const ptsLink = doc?.isLocked ? `/patients/${id}/pts/evolution` : `/patients/${id}/pts`;
  const ptsLabel = doc?.isLocked ? 'Evolução PTS' : 'Abrir PTS';

  return (
    <div className="min-h-full bg-background/50 text-foreground selection:bg-primary/20">
      <div className="mx-auto max-w-5xl space-y-10 p-16 animate-reveal">
        {/* Header Section */}
        <div className="relative overflow-hidden rounded-3xl border border-border bg-card p-12 shadow-diffusion backdrop-blur-xl">
          <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-primary/5 blur-[100px]" />
          
          <Link
            href="/patients"
            className="mb-8 inline-flex items-center gap-3 text-[10px] font-black uppercase tracking-widest text-slate-500 transition-colors hover:text-blue-400"
          >
            <ArrowLeft size={14} /> Voltar para pacientes
          </Link>

          <div className="flex flex-col justify-between gap-8 md:flex-row md:items-end">
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <h1 className="text-4xl font-black uppercase italic tracking-tight text-foreground">
                  {patient.preferredName ?? patient.fullName}
                </h1>
                <div className="mt-1">
                  <PatientStatusBadge status={patient.status} />
                </div>
              </div>
              
              <div className="space-y-1">
                {patient.preferredName && (
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground italic">
                    {patient.fullName}
                  </p>
                )}
                {birthDateFormatted && (
                  <p className="text-[10px] font-black uppercase tracking-[0.1em] text-muted-foreground/60">
                    Nascimento: <span className="text-foreground/80">{birthDateFormatted}</span>
                  </p>
                )}
                {isPastDue && (
                  <div className="mt-4 inline-flex items-center gap-2 rounded-xl border border-rose-500/20 bg-rose-500/10 px-3 py-1.5 text-[9px] font-black uppercase tracking-widest text-rose-500">
                    <AlertTriangle size={12} />
                    Revisão do PTS Vencida
                  </div>
                )}
              </div>
            </div>

            <div className="flex shrink-0 gap-4">
              <Link
                href={ptsLink}
                className="flex items-center gap-3 rounded-2xl bg-primary px-8 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-primary-foreground shadow-[0_0_30px_rgba(var(--primary),0.2)] transition-all hover:scale-105 active:scale-95"
              >
                {ptsLabel} <ChevronRight size={16} />
              </Link>
              <Link
                href={`/patients/${id}/records`}
                className="flex items-center gap-3 rounded-2xl border border-border bg-secondary/30 px-8 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-secondary-foreground transition-all hover:bg-secondary active:scale-95"
              >
                Prontuário <ArrowLeft size={16} className="rotate-180" />
              </Link>
            </div>
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-12">
          <div className="lg:col-span-8">
            <div className="overflow-hidden rounded-3xl border border-border bg-card p-12 shadow-diffusion backdrop-blur-sm">
              <h2 className="mb-10 text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground/50 italic">
                Dados Cadastrais
              </h2>
              <PatientForm mode="edit" patient={patient} />
            </div>
          </div>

          <div className="lg:col-span-4">
            <div className="h-full overflow-hidden rounded-3xl border border-border bg-card shadow-diffusion backdrop-blur-sm">
              <PatientFilesCard ctx={ctx} patientId={patient.id} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
