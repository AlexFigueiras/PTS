import { describe, it, expect } from 'vitest';
import { canTransition, assertTransition, TransitionMap } from './fsm';
import { InvalidStateTransitionError, UnauthorizedTransitionError } from './errors';

type TestState = 'draft' | 'review' | 'published' | 'archived';

const TEST_FSM: TransitionMap<TestState> = {
  draft: ['review'],
  review: ['published', 'draft'],
  published: ['archived'],
  archived: [],
};

describe('fsm primitive & errors (domain puro)', () => {
  describe('Custom Errors', () => {
    it('InvalidStateTransitionError carrega os dados públicos e o nome correto', () => {
      const err = new InvalidStateTransitionError('Documento', 'draft', 'published');
      expect(err.entity).toBe('Documento');
      expect(err.from).toBe('draft');
      expect(err.to).toBe('published');
      expect(err.name).toBe('InvalidStateTransitionError');
      expect(err.message).toContain("impossível mover de 'draft' para 'published'");
    });

    it('UnauthorizedTransitionError carrega os dados públicos e o nome correto', () => {
      const err = new UnauthorizedTransitionError('Documento', 'review', 'published', 'falta papel de revisor');
      expect(err.entity).toBe('Documento');
      expect(err.from).toBe('review');
      expect(err.to).toBe('published');
      expect(err.reason).toBe('falta papel de revisor');
      expect(err.name).toBe('UnauthorizedTransitionError');
      expect(err.message).toContain("de 'review' para 'published' (falta papel de revisor)");
    });
  });

  describe('canTransition', () => {
    it('permite transições válidas no mapa', () => {
      expect(canTransition(TEST_FSM, 'draft', 'review')).toBe(true);
      expect(canTransition(TEST_FSM, 'review', 'published')).toBe(true);
      expect(canTransition(TEST_FSM, 'review', 'draft')).toBe(true);
    });

    it('recusa transições inválidas no mapa', () => {
      expect(canTransition(TEST_FSM, 'draft', 'published')).toBe(false);
      expect(canTransition(TEST_FSM, 'published', 'draft')).toBe(false);
    });

    it('recusa qualquer transição a partir de um estado terminal', () => {
      expect(canTransition(TEST_FSM, 'archived', 'draft')).toBe(false);
    });
  });

  describe('assertTransition', () => {
    it('completa sem lançar erro em transições válidas', () => {
      expect(() => assertTransition('Documento', TEST_FSM, 'draft', 'review')).not.toThrow();
    });

    it('lança InvalidStateTransitionError com dados populados em transições inválidas', () => {
      expect(() => assertTransition('Documento', TEST_FSM, 'draft', 'published')).toThrow(
        InvalidStateTransitionError
      );

      try {
        assertTransition('Documento', TEST_FSM, 'draft', 'published');
      } catch (err: any) {
        expect(err).toBeInstanceOf(InvalidStateTransitionError);
        expect(err.entity).toBe('Documento');
        expect(err.from).toBe('draft');
        expect(err.to).toBe('published');
      }
    });
  });
});
