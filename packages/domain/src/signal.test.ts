import { describe, it, expect } from 'vitest';
import {
  SIGNAL_STATUSES,
  SIGNAL_TRANSITIONS,
  assertSignalTransition,
  isSignalStatus,
  isSignalPriority,
  GateContext,
  SignalGate,
  defaultSignalGate,
} from './signal';
import { InvalidStateTransitionError, UnauthorizedTransitionError } from './errors';

describe('signal FSM (domain puro)', () => {
  describe('isSignalStatus & isSignalPriority', () => {
    it('isSignalStatus aceita válidos e rejeita inválidos', () => {
      expect(isSignalStatus('sugerida')).toBe(true);
      expect(isSignalStatus('resolvida')).toBe(true);
      expect(isSignalStatus('desconhecido')).toBe(false);
    });

    it('isSignalPriority aceita válidos e rejeita inválidos', () => {
      expect(isSignalPriority('imediata')).toBe(true);
      expect(isSignalPriority('pactuada')).toBe(true);
      expect(isSignalPriority('emergência')).toBe(false);
    });
  });

  describe('assertSignalTransition - Validação estrutural vs. de Gate', () => {
    it('transição com aresta estrutural inexistente lança InvalidStateTransitionError', () => {
      const ctx: GateContext = { priority: 'imediata', actorIsAuthor: true, actorIsRt: true };
      // sugerida -> encaminhada não é uma aresta
      expect(() => assertSignalTransition('sugerida', 'encaminhada', ctx)).toThrow(
        InvalidStateTransitionError
      );
    });

    it('transição com aresta estrutural existente mas barrada por papel lança UnauthorizedTransitionError', () => {
      const ctx: GateContext = { priority: 'pactuada', actorIsAuthor: false, actorIsRt: false };
      // sugerida -> confirmada_pelo_autor requer actorIsAuthor
      expect(() => assertSignalTransition('sugerida', 'confirmada_pelo_autor', ctx)).toThrow(
        UnauthorizedTransitionError
      );

      try {
        assertSignalTransition('sugerida', 'confirmada_pelo_autor', ctx);
      } catch (err: any) {
        expect(err).toBeInstanceOf(UnauthorizedTransitionError);
        expect(err.reason).toBe('requer autor');
      }
    });
  });

  describe('defaultSignalGate - Cenários Operacionais', () => {
    it('sugerida -> confirmada_pelo_autor/descartada exige actorIsAuthor', () => {
      const ctxValido: GateContext = { priority: 'pactuada', actorIsAuthor: true, actorIsRt: false };
      const ctxInvalido: GateContext = { priority: 'pactuada', actorIsAuthor: false, actorIsRt: true };

      expect(() => assertSignalTransition('sugerida', 'confirmada_pelo_autor', ctxValido)).not.toThrow();
      expect(() => assertSignalTransition('sugerida', 'confirmada_pelo_autor', ctxInvalido)).toThrow(
        UnauthorizedTransitionError
      );
      expect(() => assertSignalTransition('sugerida', 'descartada', ctxValido)).not.toThrow();
    });

    it('ramo imediata pula RT (confirmada_pelo_autor -> encaminhada direta)', () => {
      const ctx: GateContext = { priority: 'imediata', actorIsAuthor: true, actorIsRt: false };
      expect(() => assertSignalTransition('confirmada_pelo_autor', 'encaminhada', ctx)).not.toThrow();
    });

    it('ramo pactuada exige RT e rejeita encaminhamento direto se autor não for RT', () => {
      const ctx: GateContext = { priority: 'pactuada', actorIsAuthor: true, actorIsRt: false };
      
      // confirmada -> encaminhada direta falha
      expect(() => assertSignalTransition('confirmada_pelo_autor', 'encaminhada', ctx)).toThrow(
        UnauthorizedTransitionError
      );

      // confirmada -> aguardando_validacao_rt é permitida
      expect(() => assertSignalTransition('confirmada_pelo_autor', 'aguardando_validacao_rt', ctx)).not.toThrow();
    });

    it('colapso dos portões (autor = RT) permite encaminhamento direto mesmo em via pactuada', () => {
      const ctx: GateContext = { priority: 'pactuada', actorIsAuthor: true, actorIsRt: true };
      expect(() => assertSignalTransition('confirmada_pelo_autor', 'encaminhada', ctx)).not.toThrow();
    });

    it('aguardando_validacao_rt -> encaminhada / descartada exige actorIsRt', () => {
      const ctxValido: GateContext = { priority: 'pactuada', actorIsAuthor: false, actorIsRt: true };
      const ctxInvalido: GateContext = { priority: 'pactuada', actorIsAuthor: true, actorIsRt: false };

      expect(() => assertSignalTransition('aguardando_validacao_rt', 'encaminhada', ctxValido)).not.toThrow();
      expect(() => assertSignalTransition('aguardando_validacao_rt', 'encaminhada', ctxInvalido)).toThrow(
        UnauthorizedTransitionError
      );
    });

    it('convergência e fluxos posteriores a encaminhada não exigem papel', () => {
      const ctxSemPapeis: GateContext = { priority: 'pactuada', actorIsAuthor: false, actorIsRt: false };

      expect(() => assertSignalTransition('encaminhada', 'recebida', ctxSemPapeis)).not.toThrow();
      expect(() => assertSignalTransition('recebida', 'em_tratamento', ctxSemPapeis)).not.toThrow();
      expect(() => assertSignalTransition('em_tratamento', 'resolvida', ctxSemPapeis)).not.toThrow();
    });
  });

  describe('Injeção de Gate Customizado', () => {
    it('permite desabilitar o colapso de portões via injeção de gate sem alterar a FSM', () => {
      // Gate customizado estrito: proíbe colapso na via pactuada (exige sempre que passe por aguardando_validacao)
      const strictSignalGate: SignalGate = (from, to, ctx) => {
        if (from === 'confirmada_pelo_autor' && to === 'encaminhada') {
          return ctx.priority === 'imediata'; // Só imediata vai direto
        }
        return defaultSignalGate(from, to, ctx);
      };

      const ctxColapso: GateContext = { priority: 'pactuada', actorIsAuthor: true, actorIsRt: true };

      // Com o gate padrão, o colapso é permitido
      expect(() => assertSignalTransition('confirmada_pelo_autor', 'encaminhada', ctxColapso)).not.toThrow();

      // Com o gate injetado estrito, o colapso é barrado
      expect(() => assertSignalTransition('confirmada_pelo_autor', 'encaminhada', ctxColapso, strictSignalGate)).toThrow(
        UnauthorizedTransitionError
      );
    });
  });

  describe('Exaustividade', () => {
    it('todas as chaves de SIGNAL_TRANSITIONS batem com SIGNAL_STATUSES', () => {
      const keys = Object.keys(SIGNAL_TRANSITIONS);
      expect(keys).toHaveLength(SIGNAL_STATUSES.length);
      
      SIGNAL_STATUSES.forEach((status) => {
        expect(keys).toContain(status);
      });
    });
  });
});
