import { and, type SQL } from 'drizzle-orm';

/**
 * Compose multiple optional Drizzle conditions into a single WHERE clause.
 * Undefined conditions are ignored — no need to guard each one at call site.
 *
 * Usage:
 *   .where(buildFilters(
 *     eq(table.tenantId, ctx.tenantId),
 *     search ? ilike(table.name, `%${search}%`) : undefined,
 *   ))
 */
export function buildFilters(...conditions: (SQL | undefined)[]): SQL | undefined {
  const active = conditions.filter((c): c is SQL => c !== undefined);
  if (active.length === 0) return undefined;
  if (active.length === 1) return active[0];
  return and(...active);
}
