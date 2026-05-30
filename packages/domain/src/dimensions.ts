// TODO Fase 1: unificar com a fonte única de DIMENSIONS
export const DIMENSIONS = ['saude', 'social', 'psiquico', 'juridico', 'educacao'] as const;
export type Dimension = (typeof DIMENSIONS)[number];
export function isDimension(value: unknown): value is Dimension {
  return typeof value === 'string' && (DIMENSIONS as readonly string[]).includes(value);
}
