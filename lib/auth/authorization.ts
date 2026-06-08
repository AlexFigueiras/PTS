import type { UserRole, PlanTier } from '@/lib/db/schema';
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
export type { UserRole, PlanTier };

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

/* ================================================================== */
/*  Entitlement por tier de produto (Básico vs Premium)                */
/* ================================================================== */

/**
 * Hierarquia de tiers do município (tenant). BASICO < PREMIUM.
 *
 * Básico  = monitoramento + sinalizações/encaminhamentos (caso até `acompanhamento`).
 * Premium = desbloqueia o ciclo PTS/PIA (ativar plano, RT, encontros, metas, reavaliações).
 */
export const PLAN_TIER_HIERARCHY: PlanTier[] = ['BASICO', 'PREMIUM'];

export const PLAN_TIER_LABELS: Record<PlanTier, string> = {
  BASICO: 'Básico',
  PREMIUM: 'Premium',
};

export class TierError extends Error {
  constructor(message = 'Recurso disponível apenas no plano Premium do município.') {
    super(message);
    this.name = 'TierError';
  }
}

/**
 * Retorna true se o tier do contexto atende ao mínimo exigido.
 *
 * Fail-closed: um `planTier` ausente (contextos de worker/teste que não o
 * populam) é tratado como `BASICO` — o menor privilégio. Entitlement nunca
 * "abre" por omissão.
 */
export function hasTier(ctx: TenantContext, minimumTier: PlanTier): boolean {
  const tier = ctx.planTier ?? 'BASICO';
  return PLAN_TIER_HIERARCHY.indexOf(tier) >= PLAN_TIER_HIERARCHY.indexOf(minimumTier);
}

/**
 * Lança TierError se o município não possuir ao menos `minimumTier`.
 *
 * Uso: requireTier(ctx, 'PREMIUM') — trava o ciclo PTS/PIA para tenants Básico.
 */
export function requireTier(ctx: TenantContext, minimumTier: PlanTier): void {
  if (!hasTier(ctx, minimumTier)) {
    throw new TierError();
  }
}
