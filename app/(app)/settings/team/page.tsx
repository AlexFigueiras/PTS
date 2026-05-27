import { redirect } from 'next/navigation';
import { getActiveTenantContext } from '@/lib/auth/get-tenant-context';
import { hasRole } from '@/lib/auth/authorization';
import { MemberRepository } from '@/modules/members/member.repository';
import { RemoveMemberButton } from '@/modules/members/components/remove-member-button';
import { listTenantUnits, listUserUnits } from '@/modules/units/unit.queries';
import { MemberRoleForm } from './member-role-form';
import { InviteForm } from './invite-form';

function getStatusLabel(status: string): string {
  if (status === 'PENDING') return 'Pendente';
  if (status === 'ACTIVE') return 'Ativo';
  if (status === 'INACTIVE') return 'Inativo';
  return status;
}

function getRoleLabel(role: string): string {
  if (role === 'ADMIN') return 'Administrador Geral';
  if (role === 'MANAGER') return 'Gerente de Unidade';
  if (role === 'PROFESSIONAL') return 'Profissional Técnico';
  return role;
}

export const metadata = { title: 'Equipe' };

export default async function TeamPage() {
  const ctx = await getActiveTenantContext();
  if (!ctx) redirect('/login');

  const members = await new MemberRepository(ctx).list();
  const canManage = hasRole(ctx.role, 'MANAGER');
  const isAdmin = ctx.role === 'ADMIN';

  // Admin Geral convida para qualquer unidade; Gerente só para as suas.
  const units = canManage
    ? isAdmin
      ? await listTenantUnits(ctx)
      : await listUserUnits(ctx)
    : [];

  return (
    <div className="space-y-6">
      <div className="rounded-lg border">
        <div className="divide-y">
          {members.map((m) => {
            const isSelf = m.userId === ctx.userId;
            const canEdit = canManage && !isSelf;

            return (
              <div key={m.userId} className="flex items-center gap-4 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-medium">{m.fullName ?? m.email}</p>
                    {m.status !== 'ACTIVE' && (
                      <span
                        className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                          m.status === 'PENDING'
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {getStatusLabel(m.status)}
                      </span>
                    )}
                  </div>
                  <p className="text-muted-foreground truncate text-xs">
                    {m.jobTitle ? `${m.jobTitle} · ` : ''}
                    {m.email}
                  </p>
                </div>
                {canEdit ? (
                  <MemberRoleForm userId={m.userId} currentRole={m.role} />
                ) : (
                  <span className="text-muted-foreground text-sm">{getRoleLabel(m.role)}</span>
                )}
                {canEdit && (
                  <RemoveMemberButton
                    userId={m.userId}
                    userName={m.fullName ?? m.email ?? 'membro'}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {canManage && (
        <div className="rounded-lg border p-5">
          <h3 className="mb-1 text-sm font-medium">Convidar profissional</h3>
          <p className="text-muted-foreground mb-4 text-xs">
            O acesso é controlado: a organização pré-cadastra o profissional e ele recebe um link
            de ativação. Não há auto-cadastro público.
          </p>
          {units.length > 0 ? (
            <InviteForm
              units={units.map((u) => ({ id: u.id, name: u.name }))}
              canInviteManager={isAdmin}
            />
          ) : (
            <p className="text-muted-foreground text-sm">
              Nenhuma unidade intersetorial disponível. Cadastre uma unidade antes de convidar
              profissionais.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
