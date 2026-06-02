/**
 * NOTA DE ARQUITETURA:
 * A cardinalidade de 1 relato ➔ N sinalizações é uma especificação de persistência
 * e infraestrutura (Fase 2). A FSM modelada neste arquivo trata estritamente de UMA
 * instância independente de Sinalização e suas regras de negócio puras de fluxo e gate.
 */

import { TransitionMap, assertTransition } from './fsm';
import { UnauthorizedTransitionError } from './errors';

export const SIGNAL_SUBTYPE_VALUES = ['alerta_descumprimento', 'busca_ativa_sugerida'] as const;
export type SignalSubtype = (typeof SIGNAL_SUBTYPE_VALUES)[number];

export const SIGNAL_STATUSES = [
  'sugerida',
  'confirmada_pelo_autor',
  'descartada',
  'aguardando_validacao_rt',
  'encaminhada',
  'recebida',
  'em_tratamento',
  'resolvida',
] as const;

export type SignalStatus = (typeof SIGNAL_STATUSES)[number];

export function isSignalStatus(value: unknown): value is SignalStatus {
  return typeof value === 'string' && (SIGNAL_STATUSES as readonly string[]).includes(value);
}

export const SIGNAL_PRIORITIES = ['imediata', 'pactuada'] as const;

export type SignalPriority = (typeof SIGNAL_PRIORITIES)[number];

export function isSignalPriority(value: unknown): value is SignalPriority {
  return typeof value === 'string' && (SIGNAL_PRIORITIES as readonly string[]).includes(value);
}

/**
 * Contexto de segurança e controle de fluxo do gate da sinalização.
 */
export type GateContext = {
  priority: SignalPriority;
  actorIsAuthor: boolean;
  actorIsRt: boolean;
};

/**
 * Máquina de estados estrutural (arestas permitidas) para Sinalizações.
 */
export const SIGNAL_TRANSITIONS: TransitionMap<SignalStatus> = {
  sugerida: ['confirmada_pelo_autor', 'descartada'],
  confirmada_pelo_autor: ['encaminhada', 'aguardando_validacao_rt'],
  aguardando_validacao_rt: ['encaminhada', 'descartada'],
  encaminhada: ['recebida'],
  recebida: ['em_tratamento'],
  em_tratamento: ['resolvida'],
  descartada: [],
  resolvida: [],
};

/**
 * Contrato funcional nomeado para validação de gates/papéis da sinalização.
 */
export type SignalGate = (
  from: SignalStatus,
  to: SignalStatus,
  ctx: GateContext,
) => boolean;

/**
 * Política do Protótipo padrão para o fluxo de gates da sinalização.
 *
 * * sugerida -> confirmada_pelo_autor / descartada: exige ser o autor (actorIsAuthor).
 * * confirmada_pelo_autor -> encaminhada: imediata encaminha direto;
 *   pactuada exige colapso dos portões (actorIsAuthor && actorIsRt).
 * * confirmada_pelo_autor -> aguardando_validacao_rt: permitido para prioridade pactuada
 *   quando não há colapso (ou seja, o autor não é a RT).
 * * aguardando_validacao_rt -> encaminhada / descartada: exige ser a RT (actorIsRt).
 * * Fluxos subsequentes de encaminhada -> recebida -> em_tratamento -> resolvida: livre de validações de papéis.
 */
export const defaultSignalGate: SignalGate = (from, to, ctx) => {
  if (from === 'sugerida') {
    return ctx.actorIsAuthor;
  }
  
  if (from === 'confirmada_pelo_autor') {
    if (to === 'encaminhada') {
      return (
        ctx.priority === 'imediata' ||
        (ctx.priority === 'pactuada' && ctx.actorIsAuthor && ctx.actorIsRt)
      );
    }
    if (to === 'aguardando_validacao_rt') {
      return ctx.priority === 'pactuada' && !(ctx.actorIsAuthor && ctx.actorIsRt);
    }
  }

  if (from === 'aguardando_validacao_rt') {
    return ctx.actorIsRt;
  }

  return true;
};

/**
 * Realiza a validação da transição de Sinalização.
 * 
 * Ordem obrigatória de execução:
 * 1) Validação estrutural de FSM (SIGNAL_TRANSITIONS). Lança InvalidStateTransitionError se a aresta for inválida.
 * 2) Validação de gate de papéis. Lança UnauthorizedTransitionError com motivo explícito se o gate recusar.
 */
export function assertSignalTransition(
  from: SignalStatus,
  to: SignalStatus,
  ctx: GateContext,
  gate: SignalGate = defaultSignalGate,
): void {
  // 1. Valida estrutura FSM
  assertTransition('Sinalizacao', SIGNAL_TRANSITIONS, from, to);

  // 2. Valida gate de autorizações
  if (!gate(from, to, ctx)) {
    let reason = 'não autorizado pelo gate';
    if (from === 'sugerida') {
      reason = 'requer autor';
    } else if (from === 'confirmada_pelo_autor' && to === 'encaminhada') {
      reason = 'via pactuada exige validação da RT';
    } else if (from === 'confirmada_pelo_autor' && to === 'aguardando_validacao_rt') {
      reason = 'apenas via pactuada sem colapso exige validação';
    } else if (from === 'aguardando_validacao_rt') {
      reason = 'requer RT';
    }

    throw new UnauthorizedTransitionError('Sinalizacao', from, to, reason);
  }
}
