import { cache } from 'react';
import { and, eq } from 'drizzle-orm';
import { getDb } from '@/lib/db/client';
import { tenantMembers } from '@/lib/db/schema';
import { TenantAccessError, type TenantContext } from '@/lib/tenant-context';
import { getAuthUser, requireAuthUser } from './get-user';

/**
 * Resolve o `TenantContext` a partir do usuário autenticado + um tenantId.
 * Falha se o usuário não for membro do tenant.
 *
 * O `tenantId` deve vir de uma fonte confiável: cookie de tenant ativo,
 * subdomínio, parâmetro de rota validado etc. NUNCA de input arbitrário.
 */
export const getTenantContext = cache(async (tenantId: string): Promise<TenantContext> => {
  const user = await requireAuthUser();

  const [member] = await getDb()
    .select({ role: tenantMembers.role })
    .from(tenantMembers)
    .where(and(eq(tenantMembers.tenantId, tenantId), eq(tenantMembers.userId, user.id)))
    .limit(1);

  if (!member) {
    throw new TenantAccessError(`Usuário ${user.id} não é membro do tenant ${tenantId}`);
  }

  return { tenantId, userId: user.id, role: member.role };
});

/**
 * Versão que lê o tenant ativo do cookie `active_tenant_id`.
 * O cookie é setado após login/troca de tenant pelo fluxo de UI (Fase 5).
 */
export async function getActiveTenantContext(): Promise<TenantContext | null> {
  const { cookies } = await import('next/headers');
  const cookieStore = await cookies();
  const tenantId = cookieStore.get('active_tenant_id')?.value;

  console.log('[getActiveTenantContext] active_tenant_id cookie:', tenantId ?? 'NOT SET');

  if (tenantId) {
    try {
      const ctx = await getTenantContext(tenantId);
      console.log('[getActiveTenantContext] resolved from cookie, role:', ctx.role);
      return ctx;
    } catch (err) {
      console.error('[getActiveTenantContext] cookie tenantId rejected:', err);
      // fall through to auto-select
    }
  }

  // Fallback: auto-select first tenant membership (handles sessions without cookie)
  const user = await getAuthUser();
  console.log('[getActiveTenantContext] auth user:', user?.id ?? 'NOT AUTHENTICATED');
  if (!user) return null;

  const [membership] = await getDb()
    .select({ tenantId: tenantMembers.tenantId, role: tenantMembers.role })
    .from(tenantMembers)
    .where(eq(tenantMembers.userId, user.id))
    .limit(1);

  console.log('[getActiveTenantContext] fallback membership:', membership ?? 'NONE');

  if (!membership) return null;

  return { tenantId: membership.tenantId, userId: user.id, role: membership.role };
}
