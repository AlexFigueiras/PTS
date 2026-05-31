import { DIMENSIONS, Dimension } from './dimensions';
import { DimensionScore } from './legacy-axis';
import { getFieldDomain, emptyDomainRecord } from './field-mapping';

/**
 * Helper interno para calcular a média arredondada com 1 casa decimal.
 * Retorna undefined se a lista de valores estiver vazia.
 */
function average(values: number[]): number | undefined {
  if (values.length === 0) {
    return undefined;
  }
  const sum = values.reduce((acc, val) => acc + val, 0);
  return Number((sum / values.length).toFixed(1));
}

/**
 * Calcula a média simples dos escores para cada uma das dimensões canônicas,
 * arredondado para uma casa decimal.
 * Inclui todos os campos do domínio (incluindo os de autonomia).
 */
export function calculateDomainAverages(scores: Record<string, number>): Record<Dimension, number> {
  const sums = emptyDomainRecord();
  const counts = emptyDomainRecord();

  Object.entries(scores).forEach(([field, score]) => {
    const domain = getFieldDomain(field);
    sums[domain] += score;
    counts[domain] += 1;
  });

  const avgs = emptyDomainRecord();
  DIMENSIONS.forEach((d) => {
    avgs[d] = counts[d] > 0 ? Number((sums[d] / counts[d]).toFixed(1)) : 0;
  });

  return avgs;
}

/**
 * Deriva as pontuações e sub-scores de autonomia para todas as dimensões do PTS.
 * O score-base e a autonomia de cada dimensão são calculados de forma separada
 * e independente para evitar contagem dupla de campos de autonomia.
 */
export function deriveDimensionScores(scores: Record<string, number>): DimensionScore[] {
  const isAutonomyField = (field: string) => {
    return field === 'saude.autonomia' || field === 'autonomia' || field.startsWith('to');
  };

  return DIMENSIONS.map((d) => {
    const dimensionFields = Object.entries(scores).filter(
      ([field]) => getFieldDomain(field) === d
    );

    const baseValues = dimensionFields
      .filter(([field]) => !isAutonomyField(field))
      .map(([_, val]) => val);

    const autonomyValues = dimensionFields
      .filter(([field]) => isAutonomyField(field))
      .map(([_, val]) => val);

    return {
      dimension: d,
      score: average(baseValues) ?? 0,
      autonomy: average(autonomyValues),
    };
  });
}
