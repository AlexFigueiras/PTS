import { describe, it, expect } from 'vitest';
import { calculateDomainAverages, deriveDimensionScores } from './scoring';
import { DIMENSIONS } from './dimensions';

describe('scoring (domain puro)', () => {
  describe('calculateDomainAverages', () => {
    it('calcula a média simples com arredondamento de 1 casa decimal', () => {
      const scores = {
        // Psíquico: (3 + 4 + 1.5) / 3 = 2.833... -> 2.8
        psSelfHarmThoughts: 3,
        psSleepDifficulty: 4,
        q15MotivationRating: 1.5,
      };
      const avgs = calculateDomainAverages(scores);
      expect(avgs.psiquico).toBe(2.8);
    });

    it('inclui campos de autonomia no cálculo do domínio geral (preserva o contrato antigo)', () => {
      const scores = {
        // Saúde: tem campos base e de autonomia
        efChronicDiseasesCount: 2, // base
        autonomia: 3.5,            // autonomia
        toDailyIndependence: 2.5,  // autonomia
      };
      // Total geral: (2 + 3.5 + 2.5) / 3 = 2.666... -> 2.7
      const avgs = calculateDomainAverages(scores);
      expect(avgs.saude).toBe(2.7);
    });

    it('retorna 0 para dimensão sem qualquer campo', () => {
      const scores = {};
      const avgs = calculateDomainAverages(scores);
      expect(avgs.juridico).toBe(0);
      expect(avgs.educacao).toBe(0);
    });
  });

  describe('deriveDimensionScores', () => {
    it('score-base exclui campos de autonomia e evita dupla contagem', () => {
      const scores = {
        efChronicDiseasesCount: 2, // base (Saúde)
        autonomia: 3.5,            // autonomia (Saúde)
        toDailyIndependence: 2.5,  // autonomia (Saúde)
      };

      const dimensionScores = deriveDimensionScores(scores);
      const saudeScore = dimensionScores.find((d) => d.dimension === 'saude');

      expect(saudeScore).toBeDefined();
      expect(saudeScore?.score).toBe(2.0);    // Apenas efChronicDiseasesCount
      expect(saudeScore?.autonomy).toBe(3.0); // Média de 3.5 e 2.5
    });

    it('autonomy com campo único (autonomia) retorna o próprio valor do campo', () => {
      const scores = {
        autonomia: 3.5, // autonomia (Saúde)
      };

      const dimensionScores = deriveDimensionScores(scores);
      const saudeScore = dimensionScores.find((d) => d.dimension === 'saude');

      expect(saudeScore).toBeDefined();
      expect(saudeScore?.autonomy).toBe(3.5);
    });

    it('saude.autonomia participa do autonomy', () => {
      const scores = {
        'saude.autonomia': 4, // autonomia (Saúde)
      };

      const dimensionScores = deriveDimensionScores(scores);
      const saudeScore = dimensionScores.find((d) => d.dimension === 'saude');

      expect(saudeScore).toBeDefined();
      expect(saudeScore?.autonomy).toBe(4.0);
    });

    it('dimensão apenas com campo de autonomia retorna score = 0 e autonomy = média calculada', () => {
      const scores = {
        autonomia: 3.0,
      };

      const dimensionScores = deriveDimensionScores(scores);
      const saudeScore = dimensionScores.find((d) => d.dimension === 'saude');

      expect(saudeScore).toBeDefined();
      expect(saudeScore?.score).toBe(0);
      expect(saudeScore?.autonomy).toBe(3.0);
    });

    it('dimensão totalmente vazia retorna score = 0 e autonomy = undefined', () => {
      const scores = {};

      const dimensionScores = deriveDimensionScores(scores);
      const saudeScore = dimensionScores.find((d) => d.dimension === 'saude');

      expect(saudeScore).toBeDefined();
      expect(saudeScore?.score).toBe(0);
      expect(saudeScore?.autonomy).toBeUndefined();
    });

    it('dimensão apenas com campos base retorna autonomy = undefined e score = média deles', () => {
      const scores = {
        efChronicDiseasesCount: 2,
        efContinuousMedsCount: 4,
      };

      const dimensionScores = deriveDimensionScores(scores);
      const saudeScore = dimensionScores.find((d) => d.dimension === 'saude');

      expect(saudeScore).toBeDefined();
      expect(saudeScore?.score).toBe(3.0);
      expect(saudeScore?.autonomy).toBeUndefined();
    });

    it('retorna uma entrada para CADA uma das DIMENSIONS canônicas', () => {
      const scores = {};
      const dimensionScores = deriveDimensionScores(scores);

      expect(dimensionScores).toHaveLength(DIMENSIONS.length);
      DIMENSIONS.forEach((d) => {
        const found = dimensionScores.find((ds) => ds.dimension === d);
        expect(found).toBeDefined();
      });
    });
  });
});
