import type { UserRole } from '@/lib/db/schema';
import type { TenantContext } from '@/lib/tenant-context';

/**
 * Hierarquia de governança da plataforma de PTS Intersetorial.
 *
 * PROFESSIONAL — Profissional Técnico (ponta): opera cidadãos e ciclos de PTS.
 * MANAGER      — Gerente de Unidade: gerencia a equipe local e convida técnicos.
 * ADMIN        — Administrador Geral (Município): dono do tenant, cria unidades
 *                e convida Gerentes.
 *
 * Hierarquia estrita: ADMIN > MANAGER > PROFESSIONAL.
 */
export type { UserRole };

export const ROLE_HIERARCHY: UserRole[] = ['PROFESSIONAL', 'MANAGER', 'ADMIN'];

export const ROLE_LABELS: Record<UserRole, string> = {
  ADMIN: 'Administrador Geral',
  MANAGER: 'Gerente de Unidade',
  PROFESSIONAL: 'Profissional Técnico',
};

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
export function hasRole(userRole: UserRole, minimumRole: UserRole): boolean {
  return ROLE_HIERARCHY.indexOf(userRole) >= ROLE_HIERARCHY.indexOf(minimumRole);
}

/**
 * Lança ForbiddenError se o usuário não possuir ao menos `minimumRole`.
 *
 * Uso: requireRole(ctx, 'MANAGER') — passa para MANAGER e ADMIN.
 */
export function requireRole(ctx: TenantContext, minimumRole: UserRole): void {
  if (!hasRole(ctx.role, minimumRole)) {
    throw new ForbiddenError();
  }
}

/**
 * Lança ForbiddenError se o usuário não possuir nenhum dos roles listados
 * (hierarquia inclusa).
 */
export function requireAnyRole(ctx: TenantContext, allowedRoles: UserRole[]): void {
  const allowed = allowedRoles.some((role) => hasRole(ctx.role, role));
  if (!allowed) {
    throw new ForbiddenError();
  }
}
