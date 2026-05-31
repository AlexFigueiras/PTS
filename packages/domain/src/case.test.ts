import { describe, it, expect } from 'vitest';
import {
  CASE_STATUSES,
  CASE_TRANSITIONS,
  isCaseStatus,
  isAutomaticCaseTransition,
  assertCaseTransition,
  CaseTransitionContext,
} from './case';
import { InvalidStateTransitionError, UnauthorizedTransitionError } from './errors';

describe('case FSM (domain puro)', () => {
  describe('isCaseStatus', () => {
    it('aceita strings válidas de status', () => {
      CASE_STATUSES.forEach((status) => {
        expect(isCaseStatus(status)).toBe(true);
      });
    });

    it('rejeita strings ou valores inválidos', () => {
      expect(isCaseStatus('desconhecido')).toBe(false);
      expect(isCaseStatus(123)).toBe(false);
      expect(isCaseStatus(null)).toBe(false);
      expect(isCaseStatus(undefined)).toBe(false);
    });
  });

  describe('Validação estrutural (CASE_TRANSITIONS)', () => {
    const ctxValido: CaseTransitionContext = { hasMinimumOwner: true };

    it('permite transições válidas representativas da FSM', () => {
      // Escada de atenção
      expect(() => assertCaseTransition('pts_ativo', 'pia_ativo', ctxValido)).not.toThrow();
      expect(() => assertCaseTransition('pia_ativo', 'pts_ativo', ctxValido)).not.toThrow();

      // Reaberturas/retornos
      expect(() => assertCaseTransition('alta', 'acompanhamento', ctxValido)).not.toThrow();
      expect(() => assertCaseTransition('evasao', 'acompanhamento', ctxValido)).not.toThrow();

      // Recusa -> radar
      expect(() => assertCaseTransition('recusa', 'radar', ctxValido)).not.toThrow();

      // Outras transições válidas
      expect(() => assertCaseTransition('radar', 'observacao', ctxValido)).not.toThrow();
      expect(() => assertCaseTransition('observacao', 'acompanhamento', ctxValido)).not.toThrow();
      expect(() => assertCaseTransition('acompanhamento', 'alta', ctxValido)).not.toThrow();
    });

    it('bloqueia transições inválidas estruturalmente com InvalidStateTransitionError', () => {
      // radar -> acompanhamento ou alta (não adjacentes)
      expect(() => assertCaseTransition('radar', 'acompanhamento', ctxValido)).toThrow(
        InvalidStateTransitionError
      );
      expect(() => assertCaseTransition('radar', 'alta', ctxValido)).toThrow(
        InvalidStateTransitionError
      );

      // observacao -> pts_ativo (deve passar por acompanhamento primeiro)
      expect(() => assertCaseTransition('observacao', 'pts_ativo', ctxValido)).toThrow(
        InvalidStateTransitionError
      );

      // obito/transferencia -> qualquer outro status (terminais)
      CASE_STATUSES.forEach((toStatus) => {
        expect(() => assertCaseTransition('obito', toStatus, ctxValido)).toThrow(
          InvalidStateTransitionError
        );
        expect(() => assertCaseTransition('transferencia', toStatus, ctxValido)).toThrow(
          InvalidStateTransitionError
        );
      });
    });

    it('garante que estados obito e transferencia são terminais (saída vazia)', () => {
      expect(CASE_TRANSITIONS.obito).toEqual([]);
      expect(CASE_TRANSITIONS.transferencia).toEqual([]);
    });
  });

  describe('isAutomaticCaseTransition', () => {
    it('retorna true somente para a transição radar -> observacao (T5)', () => {
      expect(isAutomaticCaseTransition('radar', 'observacao')).toBe(true);
    });

    it('retorna false para transições manuais/humanas', () => {
      expect(isAutomaticCaseTransition('observacao', 'acompanhamento')).toBe(false);
      expect(isAutomaticCaseTransition('acompanhamento', 'pts_ativo')).toBe(false);
      expect(isAutomaticCaseTransition('alta', 'acompanhamento')).toBe(false);
    });
  });

  describe('assertCaseTransition - Regras de Guarda', () => {
    it('entrar em acompanhamento (a partir de qualquer origem válida) com hasMinimumOwner=false lança UnauthorizedTransitionError', () => {
      const ctxInvalido: CaseTransitionContext = { hasMinimumOwner: false };

      // De observacao -> acompanhamento
      expect(() => assertCaseTransition('observacao', 'acompanhamento', ctxInvalido)).toThrow(
        UnauthorizedTransitionError
      );

      // De alta -> acompanhamento (reabertura)
      expect(() => assertCaseTransition('alta', 'acompanhamento', ctxInvalido)).toThrow(
        UnauthorizedTransitionError
      );

      // De evasao -> acompanhamento
      expect(() => assertCaseTransition('evasao', 'acompanhamento', ctxInvalido)).toThrow(
        UnauthorizedTransitionError
      );

      // Validar detalhes do erro lançado
      try {
        assertCaseTransition('observacao', 'acompanhamento', ctxInvalido);
      } catch (err: any) {
        expect(err).toBeInstanceOf(UnauthorizedTransitionError);
        expect(err.entity).toBe('Caso');
        expect(err.from).toBe('observacao');
        expect(err.to).toBe('acompanhamento');
        expect(err.reason).toBe(
          'entrar em acompanhamento exige dono mínimo (R3.2: não há acompanhamento órfão)'
        );
      }
    });

    it('entrar em acompanhamento com hasMinimumOwner=true passa com sucesso', () => {
      const ctxValido: CaseTransitionContext = { hasMinimumOwner: true };
      expect(() => assertCaseTransition('observacao', 'acompanhamento', ctxValido)).not.toThrow();
      expect(() => assertCaseTransition('alta', 'acompanhamento', ctxValido)).not.toThrow();
      expect(() => assertCaseTransition('evasao', 'acompanhamento', ctxValido)).not.toThrow();
    });
  });

  describe('Exaustividade', () => {
    it('todas as chaves de CASE_TRANSITIONS batem com CASE_STATUSES', () => {
      const keys = Object.keys(CASE_TRANSITIONS);
      expect(keys).toHaveLength(CASE_STATUSES.length);

      CASE_STATUSES.forEach((status) => {
        expect(keys).toContain(status);
      });
    });
  });
});
