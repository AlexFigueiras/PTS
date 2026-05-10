import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getActiveTenantContext } from '@/lib/auth/get-tenant-context';
import { requireRole, ForbiddenError } from '@/lib/auth/authorization';
import { PatientForm } from '@/modules/patients/components/patient-form';

export const metadata = { title: 'Novo Paciente' };

export default async function NewPatientPage() {
  const ctx = await getActiveTenantContext();
  if (!ctx) redirect('/login');

  try {
    requireRole(ctx, 'professional');
  } catch (err) {
    if (err instanceof ForbiddenError) redirect('/unauthorized');
    throw err;
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-6">
      <div>
        <Link
          href="/patients"
          className="text-muted-foreground hover:text-foreground mb-4 inline-flex items-center gap-1 text-sm"
        >
          ← Voltar para pacientes
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">Novo paciente</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Preencha os dados básicos do paciente.
        </p>
      </div>

      <div className="rounded-lg border p-6">
        <PatientForm mode="create" />
      </div>
    </div>
  );
}
