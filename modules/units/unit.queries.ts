import { and, asc, desc, eq } from 'drizzle-orm';
import { getDb } from '@/lib/db/client';
import { professionalsToUnits, serviceUnits } from '@/lib/db/schema';
import type { ServiceUnitType } from '@/lib/db/schema';
import type { TenantContext } from '@/lib/tenant-context';

export type UnitOption = {
  id: string;
  name: string;
  type: ServiceUnitType;
  isPrimary: boolean;
};

/**
 * Lista as unidades em que o profissional atua dentro do tenant ativo.
 * Ordena pela unidade primária e depois por nome. Base do seletor de
 * "Local de Atuação Ativo" (multi-vínculo).
 */
export async function listUserUnits(ctx: TenantContext): Promise<UnitOption[]> {
  const rows = await getDb()
    .select({
      id: serviceUnits.id,
      name: serviceUnits.name,
      type: serviceUnits.type,
      isPrimary: professionalsToUnits.isPrimary,
    })
    .from(professionalsToUnits)
    .innerJoin(serviceUnits, eq(serviceUnits.id, professionalsToUnits.unitId))
    .where(
      and(
        eq(professionalsToUnits.professionalId, ctx.userId),
        eq(serviceUnits.tenantId, ctx.tenantId),
      ),
    )
    .orderBy(desc(professionalsToUnits.isPrimary), asc(serviceUnits.name));

  return rows;
}

/**
 * Lista todas as unidades intersetoriais do tenant — usada pelo Administrador
 * Geral ao convidar Gerentes/Profissionais para qualquer unidade.
 */
export async function listTenantUnits(ctx: TenantContext): Promise<UnitOption[]> {
  const rows = await getDb()
    .select({
      id: serviceUnits.id,
      name: serviceUnits.name,
      type: serviceUnits.type,
    })
    .from(serviceUnits)
    .where(eq(serviceUnits.tenantId, ctx.tenantId))
    .orderBy(asc(serviceUnits.name));

  return rows.map((r) => ({ ...r, isPrimary: false }));
}
