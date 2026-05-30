export const DIMENSIONS = ['saude', 'social', 'psiquico', 'juridico', 'educacao'] as const;
export type Dimension = (typeof DIMENSIONS)[number];

export const DIMENSION_LABELS: Record<Dimension, string> = {
  saude: 'Saúde',
  social: 'Social',
  psiquico: 'Psíquico',
  juridico: 'Jurídico',
  educacao: 'Educação',
};

export function isDimension(value: unknown): value is Dimension {
  return typeof value === 'string' && (DIMENSIONS as readonly string[]).includes(value);
}

