import { describe, it, expect } from 'vitest';
import { DIMENSION_SENSITIVITY, isAbstractedDimension } from './sensitivity';
import { DIMENSIONS, Dimension } from './dimensions';

describe('sensitivity (domain puro)', () => {
  it('psiquico é a única dimensão que é abstracted', () => {
    expect(DIMENSION_SENSITIVITY.psiquico).toBe('abstracted');
    expect(DIMENSION_SENSITIVITY.saude).toBe('shareable');
    expect(DIMENSION_SENSITIVITY.social).toBe('shareable');
    expect(DIMENSION_SENSITIVITY.juridico).toBe('shareable');
    expect(DIMENSION_SENSITIVITY.educacao).toBe('shareable');
  });

  it('isAbstractedDimension responde coerentemente para cada dimensão', () => {
    expect(isAbstractedDimension('psiquico')).toBe(true);
    expect(isAbstractedDimension('saude')).toBe(false);
    expect(isAbstractedDimension('social')).toBe(false);
    expect(isAbstractedDimension('juridico')).toBe(false);
    expect(isAbstractedDimension('educacao')).toBe(false);
  });

  it('cobre todas as DIMENSIONS e nada além (exaustividade)', () => {
    const keys = Object.keys(DIMENSION_SENSITIVITY) as Dimension[];
    expect(keys).toHaveLength(DIMENSIONS.length);
    
    DIMENSIONS.forEach((d) => {
      expect(keys).toContain(d);
    });
  });
});
