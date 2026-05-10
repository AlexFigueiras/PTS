import type { TenantContext } from '@/lib/tenant-context';

/**
 * Roles oficiais do sistema clínico, do menor para o maior privilégio.
 *
 * assistant   — secretária/auxiliar: leitura de pacientes e arquivos
 * professional — profissional clínico: cria/edita pacientes, faz uploads
 * admin       — administrador da clínica: tudo acima + exclui arquivos, gerencia membros
 * owner       — proprietário do tenant: privilégios totais
 *
 * Hierarquia estrita: owner > admin > professional > assistant
 */
export type TenantRole = 'owner' | 'admin' | 'professional' | 'assistant';

export const ROLE_HIERARCHY: TenantRole[] = ['assistant', 'professional', 'admin', 'owner'];

export class ForbiddenError extends Error {
  constructor(message = 'Acesso negado: permissão insuficiente') {
    super(message);
    this.name = 'ForbiddenError';
  }
}

/**
 * Retorna true se `userRole` possui ao menos o nível `minimumRole` na hierarquia.
 * Útil para condicionais sem lançar exceção.
 */
export function hasRole(userRole: TenantRole, minimumRole: TenantRole): boolean {
  return ROLE_HIERARCHY.indexOf(userRole) >= ROLE_HIERARCHY.indexOf(minimumRole);
}

/**
 * Lança ForbiddenError se o usuário não possuir ao menos `minimumRole`.
 *
 * Uso: requireRole(ctx, 'professional') — passa para professional, admin e owner.
 */
export function requireRole(ctx: TenantContext, minimumRole: TenantRole): void {
  if (!hasRole(ctx.role as TenantRole, minimumRole)) {
    throw new ForbiddenError();
  }
}

/**
 * Lança ForbiddenError se o usuário não possuir nenhum dos roles listados (hierarquia inclusa).
 *
 * Uso: requireAnyRole(ctx, ['admin', 'professional']) — passa para professional, admin e owner.
 */
export function requireAnyRole(ctx: TenantContext, allowedRoles: TenantRole[]): void {
  const allowed = allowedRoles.some((role) => hasRole(ctx.role as TenantRole, role));
  if (!allowed) {
    throw new ForbiddenError();
  }
}
