/**
 * Tenant context — passado explicitamente para repositories e services.
 *
 * Regra de ouro: NUNCA construir um TenantContext a partir de input do usuário.
 * Ele deve ser derivado da sessão autenticada (Supabase auth) + checagem de
 * tenant_members. Ver `services/auth-context.service.ts` (Fase 3).
 */
export type TenantContext = {
  tenantId: string;
  userId: string;
  role: 'owner' | 'admin' | 'professional' | 'assistant';
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
