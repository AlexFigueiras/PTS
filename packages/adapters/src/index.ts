import type { Dimension } from '@pts/domain';
// STUB Fase 0. Ingestão real entra na Fase 3 (plano §7).
// Contrato esperado: fonte bruta → Dimensão derivada (read-only).
export interface DimensionAdapter {
  readonly source: string;
  normalize(raw: unknown): Promise<ReadonlyArray<{ dimension: Dimension; payload: unknown }>>;
}
