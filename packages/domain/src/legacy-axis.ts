import { Dimension } from './dimensions';

/**
 * Eixos do legado utilizados no motor histórico do PTS.
 * Pelo design original, Autonomia era tratada de forma equivocada como o 6º eixo.
 */
export type LegacyAxis = 'Psíquico' | 'Saúde' | 'Social' | 'Jurídico' | 'Educação' | 'Autonomia';

/**
 * Mapeamento direto dos 5 eixos legados para as 5 dimensões canônicas puras.
 * Exclui 'Autonomia', que passa a ser um sub-score transversal.
 */
export const LEGACY_AXIS_TO_DIMENSION: Record<Exclude<LegacyAxis, 'Autonomia'>, Dimension> = {
  'Psíquico': 'psiquico',
  'Saúde': 'saude',
  'Social': 'social',
  'Jurídico': 'juridico',
  'Educação': 'educacao',
};

/**
 * Normaliza os eixos do legado para as dimensões canônicas correspondentes,
 * identificando o eixo de 'Autonomia' com a string literal especial 'autonomy'.
 */
export function normalizeLegacyAxis(axis: LegacyAxis): Dimension | 'autonomy' {
  if (axis === 'Autonomia') {
    return 'autonomy';
  }
  return LEGACY_AXIS_TO_DIMENSION[axis];
}

/**
 * Representa a estrutura de pontuação de uma dimensão canônica após o refactoring de Autonomia.
 *
 * Autonomia deixa de ser uma dimensão de topo e vira um sub-score transversal opcional
 * acoplado a cada dimensão do cidadão (ex.: saude.autonomia).
 *
 * NOTA: O refactoring posterior de `lib/pts/intelligence-engine.ts` e de seus componentes
 * associados consumirá diretamente esta estrutura pura de domínio.
 */
export type DimensionScore = {
  dimension: Dimension;
  score: number;
  autonomy?: number;
};
