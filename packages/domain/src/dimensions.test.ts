import { describe, it, expect } from 'vitest';
import { DIMENSIONS, isDimension, DIMENSION_LABELS } from './index';

describe('dimensions (domain puro)', () => {
  it('tem as 5 dimensões', () => {
    expect(DIMENSIONS).toHaveLength(5);
  });

  it('isDimension aceita válida e rejeita inválida', () => {
    expect(isDimension(DIMENSIONS[0])).toBe(true);
    expect(isDimension('inexistente')).toBe(false);
    expect(isDimension(42)).toBe(false);
  });

  it('DIMENSION_LABELS mapeia corretamente todas as dimensões com rótulos em português', () => {
    expect(DIMENSION_LABELS.saude).toBe('Saúde');
    expect(DIMENSION_LABELS.social).toBe('Social');
    expect(DIMENSION_LABELS.psiquico).toBe('Psíquico');
    expect(DIMENSION_LABELS.juridico).toBe('Jurídico');
    expect(DIMENSION_LABELS.educacao).toBe('Educação');
  });

  it('tem exaustividade nas chaves de DIMENSION_LABELS', () => {
    const keys = Object.keys(DIMENSION_LABELS);
    expect(keys).toHaveLength(DIMENSIONS.length);
    DIMENSIONS.forEach((d) => {
      expect(keys).toContain(d);
    });
  });
});

