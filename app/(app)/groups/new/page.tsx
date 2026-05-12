import { redirect } from 'next/navigation';
import { getActiveTenantContext } from '@/lib/auth/get-tenant-context';
import { getDb } from '@/lib/db/client';
import { profiles, patients, tenantMembers } from '@/lib/db/schema';
import { eq, and, isNull } from 'drizzle-orm';
import { GroupForm } from '@/modules/groups/components/group-form';
import { createGroupAction } from '@/modules/groups/group.actions';

export const metadata = { title: 'Novo Grupo Terapêutico | MentalGest' };

export default async function NewGroupPage() {
  const ctx = await getActiveTenantContext();
  if (!ctx) redirect('/login');

  // Buscar profissionais do tenant
  const facilitators = await getDb()
    .select({
      id: profiles.id,
      fullName: profiles.fullName,
    })
    .from(tenantMembers)
    .innerJoin(profiles, eq(tenantMembers.userId, profiles.id))
    .where(eq(tenantMembers.tenantId, ctx.tenantId));

  // Buscar pacientes do tenant
  const allPatients = await getDb()
    .select({
      id: patients.id,
      fullName: patients.fullName,
    })
    .from(patients)
    .where(and(eq(patients.tenantId, ctx.tenantId), eq(patients.status, 'active')));

  const facilitatorOptions = facilitators.map(f => ({
    label: f.fullName || 'Profissional sem nome',
    value: f.id
  }));

  const patientOptions = allPatients.map(p => ({
    label: p.fullName,
    value: p.id
  }));

  return (
    <div className="min-h-full bg-slate-50/50 p-12 animate-reveal">
      <div className="mx-auto max-w-[1400px] space-y-12">
        <div className="space-y-2">
          <h1 className="text-5xl font-bold tracking-tighter text-slate-900">Configurar Novo Grupo</h1>
          <p className="text-lg text-slate-500">Defina os detalhes, horários e membros do seu grupo terapêutico.</p>
        </div>

        <GroupForm 
          facilitatorOptions={facilitatorOptions}
          patientOptions={patientOptions}
          onSubmit={createGroupAction}
        />
      </div>
    </div>
  );
}
