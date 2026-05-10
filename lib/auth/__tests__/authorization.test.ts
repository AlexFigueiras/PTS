import { describe, it, expect } from 'vitest';
import {
  hasRole,
  requireRole,
  requireAnyRole,
  ForbiddenError,
  ROLE_HIERARCHY,
  type TenantRole,
} from '../authorization';
import type { TenantContext } from '@/lib/tenant-context';

function ctx(role: TenantRole): TenantContext {
  return { tenantId: 'tenant-1', userId: 'user-1', role };
}

describe('ROLE_HIERARCHY', () => {
  it('tem 4 roles em ordem crescente de privilégio', () => {
    expect(ROLE_HIERARCHY).toEqual(['assistant', 'professional', 'admin', 'owner']);
  });
});

describe('hasRole', () => {
  it('owner passa em todos os níveis', () => {
    for (const role of ROLE_HIERARCHY) {
      expect(hasRole('owner', role)).toBe(true);
    }
  });

  it('assistant só passa no próprio nível', () => {
    expect(hasRole('assistant', 'assistant')).toBe(true);
    expect(hasRole('assistant', 'professional')).toBe(false);
    expect(hasRole('assistant', 'admin')).toBe(false);
    expect(hasRole('assistant', 'owner')).toBe(false);
  });

  it('professional passa em professional e assistant, mas não admin ou owner', () => {
    expect(hasRole('professional', 'assistant')).toBe(true);
    expect(hasRole('professional', 'professional')).toBe(true);
    expect(hasRole('professional', 'admin')).toBe(false);
    expect(hasRole('professional', 'owner')).toBe(false);
  });

  it('admin passa em tudo exceto owner', () => {
    expect(hasRole('admin', 'assistant')).toBe(true);
    expect(hasRole('admin', 'professional')).toBe(true);
    expect(hasRole('admin', 'admin')).toBe(true);
    expect(hasRole('admin', 'owner')).toBe(false);
  });
});

describe('requireRole', () => {
  it('não lança quando role é suficiente', () => {
    expect(() => requireRole(ctx('professional'), 'professional')).not.toThrow();
    expect(() => requireRole(ctx('admin'), 'professional')).not.toThrow();
    expect(() => requireRole(ctx('owner'), 'admin')).not.toThrow();
  });

  it('lança ForbiddenError quando role é insuficiente', () => {
    expect(() => requireRole(ctx('assistant'), 'professional')).toThrow(ForbiddenError);
    expect(() => requireRole(ctx('professional'), 'admin')).toThrow(ForbiddenError);
    expect(() => requireRole(ctx('admin'), 'owner')).toThrow(ForbiddenError);
  });

  it('ForbiddenError tem name correto e não vaza detalhes do role', () => {
    try {
      requireRole(ctx('assistant'), 'admin');
    } catch (err) {
      expect(err).toBeInstanceOf(ForbiddenError);
      expect((err as Error).name).toBe('ForbiddenError');
      expect((err as Error).message).not.toContain('assistant');
      expect((err as Error).message).not.toContain('admin');
    }
  });
});

describe('requireAnyRole', () => {
  it('passa quando usuário tem um dos roles via hierarquia', () => {
    // professional+ pode fazer upload
    expect(() => requireAnyRole(ctx('professional'), ['admin', 'professional'])).not.toThrow();
    expect(() => requireAnyRole(ctx('admin'), ['admin', 'professional'])).not.toThrow();
    expect(() => requireAnyRole(ctx('owner'), ['admin', 'professional'])).not.toThrow();
  });

  it('lança ForbiddenError quando usuário não tem nenhum dos roles', () => {
    expect(() => requireAnyRole(ctx('assistant'), ['admin', 'professional'])).toThrow(
      ForbiddenError,
    );
  });

  it('owner sempre passa em qualquer lista de roles', () => {
    expect(() => requireAnyRole(ctx('owner'), ['admin'])).not.toThrow();
    expect(() => requireAnyRole(ctx('owner'), ['professional'])).not.toThrow();
    expect(() => requireAnyRole(ctx('owner'), ['assistant'])).not.toThrow();
  });
});

describe('regras de negócio do sistema clínico', () => {
  it('assistant não pode criar pacientes', () => {
    expect(() => requireRole(ctx('assistant'), 'professional')).toThrow(ForbiddenError);
  });

  it('professional pode criar e editar pacientes', () => {
    expect(() => requireRole(ctx('professional'), 'professional')).not.toThrow();
  });

  it('assistant não pode deletar arquivos', () => {
    expect(() => requireRole(ctx('assistant'), 'admin')).toThrow(ForbiddenError);
  });

  it('professional não pode deletar arquivos', () => {
    expect(() => requireRole(ctx('professional'), 'admin')).toThrow(ForbiddenError);
  });

  it('admin pode deletar arquivos', () => {
    expect(() => requireRole(ctx('admin'), 'admin')).not.toThrow();
  });

  it('todos os roles podem listar pacientes e arquivos', () => {
    for (const role of ROLE_HIERARCHY) {
      expect(() => requireRole(ctx(role), 'assistant')).not.toThrow();
    }
  });
});
