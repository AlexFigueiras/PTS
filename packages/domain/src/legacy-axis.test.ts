import { describe, it, expect } from 'vitest';
import { LEGACY_AXIS_TO_DIMENSION, normalizeLegacyAxis, LegacyAxis } from './legacy-axis';
import { DIMENSIONS } from './dimensions';

describe('legacy-axis (domain puro)', () => {
  it('mapeia corretamente os 5 eixos diretos para as dimensões canônicas correspondentes', () => {
    expect(LEGACY_AXIS_TO_DIMENSION['Psíquico']).toBe('psiquico');
    expect(LEGACY_AXIS_TO_DIMENSION['Saúde']).toBe('saude');
    expect(LEGACY_AXIS_TO_DIMENSION['Social']).toBe('social');
    expect(LEGACY_AXIS_TO_DIMENSION['Jurídico']).toBe('juridico');
    expect(LEGACY_AXIS_TO_DIMENSION['Educação']).toBe('educacao');
  });

  it('normalizeLegacyAxis retorna a dimensão correta para os eixos clássicos', () => {
    expect(normalizeLegacyAxis('Psíquico')).toBe('psiquico');
    expect(normalizeLegacyAxis('Saúde')).toBe('saude');
    expect(normalizeLegacyAxis('Social')).toBe('social');
    expect(normalizeLegacyAxis('Jurídico')).toBe('juridico');
    expect(normalizeLegacyAxis('Educação')).toBe('educacao');
  });

  it('normalizeLegacyAxis retorna autonomy para o eixo Autonomia', () => {
    expect(normalizeLegacyAxis('Autonomia')).toBe('autonomy');
  });

  it('cobre exatamente todas as dimensões canônicas menos Autonomia', () => {
    const keys = Object.keys(LEGACY_AXIS_TO_DIMENSION) as Exclude<LegacyAxis, 'Autonomia'>[];
    expect(keys).toHaveLength(5);
    
    // Assegura exaustividade dos eixos em relação a DIMENSIONS
    const resolvedDimensions = keys.map(k => LEGACY_AXIS_TO_DIMENSION[k]);
    expect(resolvedDimensions.length).toBe(DIMENSIONS.length);
    DIMENSIONS.forEach((d) => {
      expect(resolvedDimensions).toContain(d);
    });
  });
});
