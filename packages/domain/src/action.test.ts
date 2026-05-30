import { describe, it, expect } from 'vitest';
import { ACTION_STATUSES, ACTION_TRANSITIONS, assertActionTransition, isActionStatus } from './action';
import { InvalidStateTransitionError } from './errors';

describe('action FSM (domain puro)', () => {
  describe('isActionStatus', () => {
    it('aceita strings válidas de status', () => {
      expect(isActionStatus('pactuada')).toBe(true);
      expect(isActionStatus('em_andamento')).toBe(true);
      expect(isActionStatus('concluida')).toBe(true);
      expect(isActionStatus('bloqueada')).toBe(true);
    });

    it('rejeita strings ou valores inválidos', () => {
      expect(isActionStatus('desconhecido')).toBe(false);
      expect(isActionStatus(123)).toBe(false);
      expect(isActionStatus(null)).toBe(false);
    });
  });

  describe('assertActionTransition', () => {
    it('caminho feliz: move de pactuada para em_andamento e concluida', () => {
      expect(() => assertActionTransition('pactuada', 'em_andamento')).not.toThrow();
      expect(() => assertActionTransition('em_andamento', 'concluida')).not.toThrow();
    });

    it('fluxo de bloqueio e desbloqueio', () => {
      // De pactuada para bloqueada e depois re-ativar
      expect(() => assertActionTransition('pactuada', 'bloqueada')).not.toThrow();
      expect(() => assertActionTransition('bloqueada', 'em_andamento')).not.toThrow();

      // De em_andamento para bloqueada e re-ativar
      expect(() => assertActionTransition('em_andamento', 'bloqueada')).not.toThrow();
    });

    it('concluida é terminal e impede qualquer transição subsequente', () => {
      expect(() => assertActionTransition('concluida', 'em_andamento')).toThrow(
        InvalidStateTransitionError
      );
      expect(() => assertActionTransition('concluida', 'bloqueada')).toThrow(
        InvalidStateTransitionError
      );
    });

    it('lança erro para transições inválidas estruturalmente', () => {
      expect(() => assertActionTransition('pactuada', 'concluida')).toThrow(
        InvalidStateTransitionError
      );
      expect(() => assertActionTransition('bloqueada', 'concluida')).toThrow(
        InvalidStateTransitionError
      );
    });
  });

  describe('Exaustividade', () => {
    it('todas as chaves de ACTION_TRANSITIONS batem com ACTION_STATUSES', () => {
      const keys = Object.keys(ACTION_TRANSITIONS);
      expect(keys).toHaveLength(ACTION_STATUSES.length);
      
      ACTION_STATUSES.forEach((status) => {
        expect(keys).toContain(status);
      });
    });
  });
});
