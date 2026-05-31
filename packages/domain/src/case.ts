/**
 * NOTA DE ARQUITETURA:
 * - pts_ativo/pia_ativo são a ESCADA DE ATENÇÃO; a coexistência PTS+PIA (dois
 *   contêineres) é propriedade do conjunto de Planos na camada de infra/schema,
 *   NÃO do case_status (§3 "um ou dois Planos", §1.4). Não inventar estado "ambos".
 * - T2 (trava-disparos da recusa) é regra de serviço, não da FSM; aqui recusa→radar
 *   apenas permite reabertura/realimentação do radar.
 */

import { TransitionMap, assertTransition } from './fsm';
import { UnauthorizedTransitionError } from './errors';

export const CASE_STATUSES = [
  'radar',
  'observacao',
  'acompanhamento',
  'pts_ativo',
  'pia_ativo',
  'alta',
  'evasao',
  'transferencia',
  'obito',
  'recusa',
] as const;

export type CaseStatus = (typeof CASE_STATUSES)[number];

/**
 * Type guard puro para validar se uma string qualquer é um status válido de Caso.
 */
export function isCaseStatus(value: unknown): value is CaseStatus {
  return typeof value === 'string' && (CASE_STATUSES as readonly string[]).includes(value);
}

/**
 * Rótulos pt-BR acentuados e formatados para exibição.
 */
export const CASE_STATUS_LABELS: Record<CaseStatus, string> = {
  radar: 'Radar',
  observacao: 'Observação',
  acompanhamento: 'Acompanhamento',
  pts_ativo: 'PTS Ativo',
  pia_ativo: 'PIA Ativo',
  alta: 'Alta',
  evasao: 'Evasão',
  transferencia: 'Transferência',
  obito: 'Óbito',
  recusa: 'Recusa',
};

/**
 * Máquina de estados estrutural (arestas de transição válidas) para o status de um Caso.
 */
export const CASE_TRANSITIONS: TransitionMap<CaseStatus> = {
  radar: ['observacao', 'recusa', 'obito', 'transferencia'],
  observacao: ['acompanhamento', 'radar', 'recusa', 'obito', 'transferencia', 'evasao'],
  acompanhamento: ['pts_ativo', 'pia_ativo', 'alta', 'evasao', 'transferencia', 'obito', 'recusa'],
  pts_ativo: ['pia_ativo', 'alta', 'evasao', 'transferencia', 'obito', 'recusa'],
  pia_ativo: ['pts_ativo', 'alta', 'evasao', 'transferencia', 'obito', 'recusa'],
  alta: ['acompanhamento'],
  evasao: ['acompanhamento'],
  transferencia: [],
  obito: [],
  recusa: ['radar'],
};

/**
 * Predicado puro que identifica se a transição entre dois estados é automática pelo sistema.
 * Retorna true APENAS para a transição de 'radar' para 'observacao' (T5).
 */
export function isAutomaticCaseTransition(from: CaseStatus, to: CaseStatus): boolean {
  return from === 'radar' && to === 'observacao';
}

/**
 * Contexto necessário para validação das guardas de transição de Caso.
 */
export type CaseTransitionContext = {
  hasMinimumOwner: boolean;
};

/**
 * Valida a transição de estado de um Caso.
 * Lança InvalidStateTransitionError se a transição não for estruturalmente permitida.
 * Lança UnauthorizedTransitionError se a transição falhar nas regras de negócio (guardas).
 */
export function assertCaseTransition(
  from: CaseStatus,
  to: CaseStatus,
  ctx: CaseTransitionContext,
): void {
  // 1. Validação estrutural de FSM
  assertTransition('Caso', CASE_TRANSITIONS, from, to);

  // 2. Guarda de dono mínimo (R3.1 / R3.2): Acompanhamento não pode ser órfão
  if (to === 'acompanhamento' && !ctx.hasMinimumOwner) {
    throw new UnauthorizedTransitionError(
      'Caso',
      from,
      to,
      'entrar em acompanhamento exige dono mínimo (R3.2: não há acompanhamento órfão)',
    );
  }
}
