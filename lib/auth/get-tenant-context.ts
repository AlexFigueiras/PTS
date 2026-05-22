import { cache } from 'react';
import { and, desc, eq } from 'drizzle-orm';
import { getDb } from '@/lib/db/client';
import { tenantMembers, profiles, professionalsToUnits, serviceUnits } from '@/lib/db/schema';
import { TenantAccessError, type TenantContext } from '@/lib/tenant-context';
import { getAuthUser, requireAuthUser } from './get-user';

/**
 * Resolve a unidade de atuação ativa do usuário no tenant.
 * Prioriza o cookie `active_unit_id` (se for um vínculo válido); cai para a
 * unidade `isPrimary`, depois para a primeira unidade. Null se não houver vínculo.
 */
async function resolveActiveUnitId(userId: string, tenantId: string): Promise<string | null> {
  const { cookies } = await import('next/headers');
  const cookieStore = await cookies();
  const cookieUnit = cookieStore.get('active_unit_id')?.value ?? null;

  const units = await getDb()
    .select({ unitId: professionalsToUnits.unitId, isPrimary: professionalsToUnits.isPrimary })
    .from(professionalsToUnits)
    .innerJoin(serviceUnits, eq(serviceUnits.id, professionalsToUnits.unitId))
    .where(
      and(
        eq(professionalsToUnits.professionalId, userId),
        eq(serviceUnits.tenantId, tenantId),
      ),
    )
    .orderBy(desc(professionalsToUnits.isPrimary));

  if (units.length === 0) return null;
  if (cookieUnit && units.some((u) => u.unitId === cookieUnit)) return cookieUnit;
  return units[0].unitId;
}

/**
 * Resolve o `TenantContext` a partir do usuário autenticado + um tenantId.
 * Falha se o usuário não for membro do tenant.
 *
 * O papel (`role`) é o papel hierárquico global em `profiles.role`.
 * O `tenantId` deve vir de fonte confiável (cookie, subdomínio, rota validada).
 */
export const getTenantContext = cache(async (tenantId: string): Promise<TenantContext> => {
  const user = await requireAuthUser();

  const [row] = await getDb()
    .select({ role: profiles.role })
    .from(tenantMembers)
    .innerJoin(profiles, eq(tenantMembers.userId, profiles.id))
    .where(and(eq(tenantMembers.tenantId, tenantId), eq(tenantMembers.userId, user.id)))
    .limit(1);

  if (!row) {
    throw new TenantAccessError(`Usuário ${user.id} não é membro do tenant ${tenantId}`);
  }

  const activeUnitId = await resolveActiveUnitId(user.id, tenantId);

  return { tenantId, userId: user.id, role: row.role, activeUnitId };
});

/**
 * Versão que lê o tenant ativo do cookie `active_tenant_id`.
 * O cookie é setado após login/troca de tenant.
 */
export async function getActiveTenantContext(): Promise<TenantContext | null> {
  const { cookies } = await import('next/headers');
  const cookieStore = await cookies();
  const tenantId = cookieStore.get('active_tenant_id')?.value;

  if (tenantId) {
    try {
      return await getTenantContext(tenantId);
    } catch {
      // cookie inválido — cai para auto-seleção
    }
  }

  // Fallback: primeira associação de tenant do usuário.
  const user = await getAuthUser();
  if (!user) return null;

  const [membership] = await getDb()
    .select({ tenantId: tenantMembers.tenantId })
    .from(tenantMembers)
    .where(eq(tenantMembers.userId, user.id))
    .limit(1);

  if (!membership) return null;

  try {
    return await getTenantContext(membership.tenantId);
  } catch {
    return null;
  }
}
