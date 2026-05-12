import { notFound, redirect } from 'next/navigation';
import { getActiveTenantContext } from '@/lib/auth/get-tenant-context';
import { GroupRepository } from '@/modules/groups/group.repository';
import { SessionRepository } from '@/modules/groups/session.repository';
import { SessionForm } from '@/modules/groups/components/session-form';
import { recordSessionAction } from '@/modules/groups/group.actions';

export const metadata = { title: 'Nova Chamada de Grupo | MentalGest' };

export default async function NewSessionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await getActiveTenantContext();
  if (!ctx) redirect('/login');

  const repo = new GroupRepository(ctx.tenantId);
  const sessionRepo = new SessionRepository(ctx.tenantId);
  
  const group = await repo.getById(id);
  if (!group) notFound();

  const members = await sessionRepo.getInitialAttendance(id);

  return (
    <div className="min-h-full bg-slate-50/50 p-12 animate-reveal">
      <div className="mx-auto max-w-4xl space-y-12">
        <div className="space-y-2">
          <h1 className="text-5xl font-bold tracking-tighter text-slate-900">Registro de Chamada</h1>
          <p className="text-lg text-slate-500">Grupo: <span className="font-bold text-primary">{group.name}</span></p>
        </div>

        <SessionForm 
          groupId={id}
          members={members}
          onSubmit={recordSessionAction}
        />
      </div>
    </div>
  );
}
