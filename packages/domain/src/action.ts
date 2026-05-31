import { TransitionMap, assertTransition } from './fsm';

/**
 * Estados do ciclo de vida de uma Ação pactuada no PTS/PIA.
 */
export const ACTION_STATUSES = ['pactuada', 'em_andamento', 'concluida', 'bloqueada'] as const;

export type ActionStatus = (typeof ACTION_STATUSES)[number];

/**
 * Type guard puro para validar se uma string qualquer é um status válido de Ação.
 */
export function isActionStatus(value: unknown): value is ActionStatus {
  return typeof value === 'string' && (ACTION_STATUSES as readonly string[]).includes(value);
}

/**
 * Rótulos pt-BR acentuados para exibição dos status de Ação.
 */
export const ACTION_STATUS_LABELS: Record<ActionStatus, string> = {
  pactuada: 'Pactuada',
  em_andamento: 'Em Andamento',
  concluida: 'Concluída',
  bloqueada: 'Bloqueada',
};


/**
 * Máquina de estados estrutural da Ação.
 *
 * pactuada     -> em_andamento, bloqueada
 * em_andamento -> concluida, bloqueada
 * bloqueada    -> em_andamento
 * concluida    -> (terminal, nenhuma transição)
 */
export const ACTION_TRANSITIONS: TransitionMap<ActionStatus> = {
  pactuada: ['em_andamento', 'bloqueada'],
  em_andamento: ['concluida', 'bloqueada'],
  bloqueada: ['em_andamento'],
  concluida: [],
};

/**
 * Realiza asserção estrutural para a transição de estado de uma Ação.
 * Lança InvalidStateTransitionError sob falhas.
 */
export function assertActionTransition(from: ActionStatus, to: ActionStatus): void {
  assertTransition('Acao', ACTION_TRANSITIONS, from, to);
}
