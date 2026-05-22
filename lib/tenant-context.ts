import type { UserRole } from '@/lib/db/schema';

/**
 * Tenant context — passado explicitamente para repositories e services.
 *
 * Regra de ouro: NUNCA construir um TenantContext a partir de input do usuário.
 * Ele deve ser derivado da sessão autenticada (Supabase auth) + checagem de
 * tenant_members. Ver `lib/auth/get-tenant-context.ts`.
 */
export type TenantContext = {
  tenantId: string;
  userId: string;
  /** Papel hierárquico global do usuário (RBAC). */
  role: UserRole;
  /** Unidade de atuação ativa no multi-vínculo. Null se o usuário não tem unidade. */
  activeUnitId: string | null;
};

export class TenantAccessError extends Error {
  constructor(message = 'Acesso negado: tenant inválido ou ausente') {
    super(message);
    this.name = 'TenantAccessError';
  }
}

export function assertTenantContext(
  ctx: TenantContext | null | undefined,
): asserts ctx is TenantContext {
  if (!ctx?.tenantId || !ctx?.userId) {
    throw new TenantAccessError();
  }
}
