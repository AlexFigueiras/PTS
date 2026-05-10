import { cache } from 'react';
import { and, eq } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { tenantMembers } from '@/lib/db/schema';
import { TenantAccessError, type TenantContext } from '@/lib/tenant-context';
import { requireAuthUser } from './get-user';

/**
 * Resolve o `TenantContext` a partir do usuário autenticado + um tenantId.
 * Falha se o usuário não for membro do tenant.
 *
 * O `tenantId` deve vir de uma fonte confiável: cookie de tenant ativo,
 * subdomínio, parâmetro de rota validado etc. NUNCA de input arbitrário.
 */
export const getTenantContext = cache(async (tenantId: string): Promise<TenantContext> => {
  const user = await requireAuthUser();

  const [member] = await db
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
  if (!tenantId) return null;
  try {
    return await getTenantContext(tenantId);
  } catch {
    return null;
  }
}
