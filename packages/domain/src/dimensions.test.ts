import { describe, it, expect } from 'vitest';
import { DIMENSIONS, isDimension } from './index';
describe('dimensions (domain puro)', () => {
  it('tem as 5 dimensões', () => {
    expect(DIMENSIONS).toHaveLength(5);
  });
  it('isDimension aceita válida e rejeita inválida', () => {
    expect(isDimension(DIMENSIONS[0])).toBe(true);
    expect(isDimension('inexistente')).toBe(false);
    expect(isDimension(42)).toBe(false);
  });
});
