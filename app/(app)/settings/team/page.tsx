import { redirect } from 'next/navigation';
import { getActiveTenantContext } from '@/lib/auth/get-tenant-context';
import { hasRole } from '@/lib/auth/authorization';
import { MemberRepository } from '@/modules/members/member.repository';
import { ROLE_LABELS } from '@/modules/members/member.dto';
import { RemoveMemberButton } from '@/modules/members/components/remove-member-button';
import { MemberRoleForm } from './member-role-form';
import { InviteForm } from './invite-form';

export const metadata = { title: 'Equipe' };

export default async function TeamPage() {
  const ctx = await getActiveTenantContext();
  if (!ctx) redirect('/login');

  const members = await new MemberRepository(ctx).list();
  const canManage = hasRole(ctx.role, 'admin');

  return (
    <div className="space-y-6">
      <div className="rounded-lg border">
        <div className="divide-y">
          {members.map((m) => {
            const isOwner = m.role === 'owner';
            const isSelf = m.userId === ctx.userId;
            const canEdit = canManage && !isOwner && !isSelf;

            return (
              <div key={m.userId} className="flex items-center gap-4 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{m.fullName ?? m.email}</p>
                  {m.fullName && (
                    <p className="text-muted-foreground truncate text-xs">{m.email}</p>
                  )}
                </div>
                {canEdit ? (
                  <MemberRoleForm userId={m.userId} currentRole={m.role} />
                ) : (
                  <span className="text-muted-foreground text-sm">{ROLE_LABELS[m.role]}</span>
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
          <h3 className="mb-4 text-sm font-medium">Convidar membro</h3>
          <InviteForm />
        </div>
      )}
    </div>
  );
}
