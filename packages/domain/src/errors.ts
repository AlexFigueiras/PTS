/**
 * Ocorre quando uma transição estrutural de estado na FSM é proibida.
 * Significa que a aresta entre os estados (from -> to) simplesmente não existe na máquina.
 */
export class InvalidStateTransitionError extends Error {
  constructor(
    public readonly entity: string,
    public readonly from: string,
    public readonly to: string,
  ) {
    super(
      `Transição de estado inválida para a entidade '${entity}': impossível mover de '${from}' para '${to}'.`
    );
    this.name = 'InvalidStateTransitionError';
  }
}

/**
 * Ocorre quando uma transição estruturalmente válida na FSM é rejeitada por falta de autorização.
 * A transição existe, mas o gate de papéis/responsabilidades bloqueou a operação.
 */
export class UnauthorizedTransitionError extends Error {
  constructor(
    public readonly entity: string,
    public readonly from: string,
    public readonly to: string,
    public readonly reason: string,
  ) {
    super(
      `Transição não autorizada em '${entity}': de '${from}' para '${to}' (${reason}).`
    );
    this.name = 'UnauthorizedTransitionError';
  }
}
