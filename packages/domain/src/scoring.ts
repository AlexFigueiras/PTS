import { DIMENSIONS, Dimension } from './dimensions';
import { DimensionScore } from './legacy-axis';
import { getFieldDomain, emptyDomainRecord } from './field-mapping';

/**
 * Calcula a média simples dos escores para cada uma das dimensões canônicas,
 * arredondado para uma casa decimal.
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
 * A autonomia de cada dimensão é calculada apenas se houver campos de autonomia correspondentes.
 */
export function deriveDimensionScores(scores: Record<string, number>): DimensionScore[] {
  const avgs = calculateDomainAverages(scores);

  const isAutonomyField = (field: string) => {
    return field === 'saude.autonomia' || field === 'autonomia' || field.startsWith('to');
  };

  return DIMENSIONS.map((d) => {
    const autonomyValues = Object.entries(scores)
      .filter(([field]) => getFieldDomain(field) === d && isAutonomyField(field))
      .map(([_, val]) => val);

    const autonomy = autonomyValues.length > 0
      ? Number((autonomyValues.reduce((sum, val) => sum + val, 0) / autonomyValues.length).toFixed(1))
      : undefined;

    return {
      dimension: d,
      score: avgs[d],
      autonomy,
    };
  });
}
