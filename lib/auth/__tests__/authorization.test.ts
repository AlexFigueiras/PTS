import { describe, it, expect } from 'vitest';
import {
  hasRole,
  requireRole,
  requireAnyRole,
  ForbiddenError,
  ROLE_HIERARCHY,
  hasTier,
  requireTier,
  TierError,
  PLAN_TIER_HIERARCHY,
  type UserRole,
  type PlanTier,
} from '../authorization';
import type { TenantContext } from '@/lib/tenant-context';

function ctx(role: UserRole): TenantContext {
  return { tenantId: 'tenant-1', userId: 'user-1', role, activeUnitId: null };
}

function tierCtx(planTier?: PlanTier): TenantContext {
  return { tenantId: 'tenant-1', userId: 'user-1', role: 'PROFESSIONAL', planTier, activeUnitId: null };
}

describe('ROLE_HIERARCHY', () => {
  it('tem 3 níveis em ordem crescente de privilégio', () => {
    expect(ROLE_HIERARCHY).toEqual(['PROFESSIONAL', 'MANAGER', 'ADMIN']);
  });
});

describe('hasRole', () => {
  it('ADMIN passa em todos os níveis', () => {
    for (const role of ROLE_HIERARCHY) {
      expect(hasRole('ADMIN', role)).toBe(true);
    }
  });

  it('PROFESSIONAL só passa no próprio nível', () => {
    expect(hasRole('PROFESSIONAL', 'PROFESSIONAL')).toBe(true);
    expect(hasRole('PROFESSIONAL', 'MANAGER')).toBe(false);
    expect(hasRole('PROFESSIONAL', 'ADMIN')).toBe(false);
  });

  it('MANAGER passa em MANAGER e PROFESSIONAL, mas não ADMIN', () => {
    expect(hasRole('MANAGER', 'PROFESSIONAL')).toBe(true);
    expect(hasRole('MANAGER', 'MANAGER')).toBe(true);
    expect(hasRole('MANAGER', 'ADMIN')).toBe(false);
  });
});

describe('requireRole', () => {
  it('não lança quando role é suficiente', () => {
    expect(() => requireRole(ctx('PROFESSIONAL'), 'PROFESSIONAL')).not.toThrow();
    expect(() => requireRole(ctx('MANAGER'), 'PROFESSIONAL')).not.toThrow();
    expect(() => requireRole(ctx('ADMIN'), 'MANAGER')).not.toThrow();
  });

  it('lança ForbiddenError quando role é insuficiente', () => {
    expect(() => requireRole(ctx('PROFESSIONAL'), 'MANAGER')).toThrow(ForbiddenError);
    expect(() => requireRole(ctx('MANAGER'), 'ADMIN')).toThrow(ForbiddenError);
  });

  it('ForbiddenError tem name correto e não vaza detalhes do role', () => {
    try {
      requireRole(ctx('PROFESSIONAL'), 'ADMIN');
    } catch (err) {
      expect(err).toBeInstanceOf(ForbiddenError);
      expect((err as Error).name).toBe('ForbiddenError');
      expect((err as Error).message).not.toContain('PROFESSIONAL');
      expect((err as Error).message).not.toContain('ADMIN');
    }
  });
});

describe('requireAnyRole', () => {
  it('passa quando usuário tem um dos roles via hierarquia', () => {
    expect(() => requireAnyRole(ctx('PROFESSIONAL'), ['MANAGER', 'PROFESSIONAL'])).not.toThrow();
    expect(() => requireAnyRole(ctx('MANAGER'), ['MANAGER', 'PROFESSIONAL'])).not.toThrow();
    expect(() => requireAnyRole(ctx('ADMIN'), ['MANAGER', 'PROFESSIONAL'])).not.toThrow();
  });

  it('lança ForbiddenError quando usuário não tem nenhum dos roles', () => {
    expect(() => requireAnyRole(ctx('PROFESSIONAL'), ['MANAGER', 'ADMIN'])).toThrow(ForbiddenError);
  });

  it('ADMIN sempre passa em qualquer lista de roles', () => {
    expect(() => requireAnyRole(ctx('ADMIN'), ['MANAGER'])).not.toThrow();
    expect(() => requireAnyRole(ctx('ADMIN'), ['PROFESSIONAL'])).not.toThrow();
  });
});

describe('regras de governança intersetorial', () => {
  it('Profissional Técnico não gerencia equipe', () => {
    expect(() => requireRole(ctx('PROFESSIONAL'), 'MANAGER')).toThrow(ForbiddenError);
  });

  it('Gerente de Unidade gerencia a equipe local', () => {
    expect(() => requireRole(ctx('MANAGER'), 'MANAGER')).not.toThrow();
  });

  it('só o Administrador Geral altera configurações do tenant', () => {
    expect(() => requireRole(ctx('MANAGER'), 'ADMIN')).toThrow(ForbiddenError);
    expect(() => requireRole(ctx('ADMIN'), 'ADMIN')).not.toThrow();
  });

  it('todos os níveis operam o fluxo de cidadãos e PTS', () => {
    for (const role of ROLE_HIERARCHY) {
      expect(() => requireRole(ctx(role), 'PROFESSIONAL')).not.toThrow();
    }
  });
});

describe('PLAN_TIER_HIERARCHY', () => {
  it('tem 2 tiers em ordem crescente de capacidade', () => {
    expect(PLAN_TIER_HIERARCHY).toEqual(['BASICO', 'PREMIUM']);
  });
});

describe('hasTier', () => {
  it('PREMIUM atende BASICO e PREMIUM', () => {
    expect(hasTier(tierCtx('PREMIUM'), 'BASICO')).toBe(true);
    expect(hasTier(tierCtx('PREMIUM'), 'PREMIUM')).toBe(true);
  });

  it('BASICO atende só BASICO', () => {
    expect(hasTier(tierCtx('BASICO'), 'BASICO')).toBe(true);
    expect(hasTier(tierCtx('BASICO'), 'PREMIUM')).toBe(false);
  });

  it('tier ausente é tratado como BASICO (fail-closed)', () => {
    expect(hasTier(tierCtx(undefined), 'BASICO')).toBe(true);
    expect(hasTier(tierCtx(undefined), 'PREMIUM')).toBe(false);
  });
});

describe('requireTier', () => {
  it('não lança quando o tier do município atende', () => {
    expect(() => requireTier(tierCtx('PREMIUM'), 'PREMIUM')).not.toThrow();
    expect(() => requireTier(tierCtx('PREMIUM'), 'BASICO')).not.toThrow();
    expect(() => requireTier(tierCtx('BASICO'), 'BASICO')).not.toThrow();
  });

  it('lança TierError quando o município Básico exige Premium (gate do ciclo PTS/PIA)', () => {
    expect(() => requireTier(tierCtx('BASICO'), 'PREMIUM')).toThrow(TierError);
  });

  it('fail-closed: tier ausente exigindo Premium lança TierError', () => {
    expect(() => requireTier(tierCtx(undefined), 'PREMIUM')).toThrow(TierError);
  });
});
