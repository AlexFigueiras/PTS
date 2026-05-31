import { describe, it, expect } from 'vitest';
import { getFieldDomain, emptyDomainRecord, FIELD_LABELS, FIELD_DOMAINS } from './field-mapping';
import { DIMENSIONS } from './dimensions';

describe('field-mapping (domain puro)', () => {
  describe('getFieldDomain', () => {
    it('resolve chaves explícitas presentes no mapa', () => {
      expect(getFieldDomain('psiquico')).toBe('psiquico');
      expect(getFieldDomain('saude')).toBe('saude');
      expect(getFieldDomain('social')).toBe('social');
      expect(getFieldDomain('juridico')).toBe('juridico');
      expect(getFieldDomain('educacao')).toBe('educacao');
      expect(getFieldDomain('ssSocialBenefits')).toBe('social');
      expect(getFieldDomain('lgRightsViolation')).toBe('juridico');
    });

    it('resolve chaves especiais de Autonomia para saude', () => {
      expect(getFieldDomain('autonomia')).toBe('saude');
      expect(getFieldDomain('saude.autonomia')).toBe('saude');
      expect(getFieldDomain('toDailyIndependence')).toBe('saude');
    });

    it('resolve com base em heurísticas de prefixos', () => {
      expect(getFieldDomain('psAnyMentalScore')).toBe('psiquico');
      expect(getFieldDomain('ssAnySocialScore')).toBe('social');
      expect(getFieldDomain('lgAnyLegalScore')).toBe('juridico');
      expect(getFieldDomain('edAnyEducationScore')).toBe('educacao');
      expect(getFieldDomain('toAnyIndependenceScore')).toBe('saude');
      expect(getFieldDomain('efAnyHealthScore')).toBe('saude');
      expect(getFieldDomain('ntAnyHealthScore')).toBe('saude');
    });

    it('retorna fallback saude para chaves desconhecidas', () => {
      expect(getFieldDomain('unknown_key')).toBe('saude');
      expect(getFieldDomain('')).toBe('saude');
    });
  });

  describe('emptyDomainRecord', () => {
    it('retorna todas as dimensões canônicas zeradas', () => {
      const record = emptyDomainRecord();
      DIMENSIONS.forEach((d) => {
        expect(record[d]).toBe(0);
      });
      expect(Object.keys(record)).toHaveLength(DIMENSIONS.length);
    });
  });

  describe('FIELD_LABELS Typo Fix', () => {
    it('corrige o rótulo de efKatzIndex', () => {
      expect(FIELD_LABELS.efKatzIndex).toBe('Índice de Independência de Katz');
    });
  });
});
