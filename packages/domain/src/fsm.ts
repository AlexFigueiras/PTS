import { InvalidStateTransitionError } from './errors';

/**
 * Representação estrita de uma Máquina de Estados Finitos (FSM) declarativa.
 * Mapeia cada estado de origem para uma lista de estados de destino válidos.
 */
export type TransitionMap<S extends string> = Readonly<Record<S, readonly S[]>>;

/**
 * Predicado puro que verifica se a transição entre dois estados é estruturalmente válida na FSM.
 */
export function canTransition<S extends string>(
  map: TransitionMap<S>,
  from: S,
  to: S,
): boolean {
  const allowed = map[from];
  if (!allowed) {
    return false;
  }
  return allowed.includes(to);
}

/**
 * Asserção pura que lança InvalidStateTransitionError caso a transição estrutural seja inválida.
 */
export function assertTransition<S extends string>(
  entity: string,
  map: TransitionMap<S>,
  from: S,
  to: S,
): void {
  if (!canTransition(map, from, to)) {
    throw new InvalidStateTransitionError(entity, from, to);
  }
}
