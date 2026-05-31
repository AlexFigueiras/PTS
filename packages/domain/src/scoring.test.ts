import { describe, it, expect } from 'vitest';
import { calculateDomainAverages, deriveDimensionScores } from './scoring';

describe('scoring (domain puro)', () => {
  describe('calculateDomainAverages', () => {
    it('calcula a média simples correta com arredondamento de 1 casa decimal', () => {
      const scores = {
        // Psíquico: (3 + 4 + 1.5) / 3 = 2.833... -> 2.8
        psSelfHarmThoughts: 3,
        psSleepDifficulty: 4,
        q15MotivationRating: 1.5,

        // Saúde: (2 + 3) / 2 = 2.5
        efChronicDiseasesCount: 2,
        toDailyIndependence: 3,

        // Social: 1 / 1 = 1.0
        ssSocialBenefits: 1,
      };

      const avgs = calculateDomainAverages(scores);
      expect(avgs.psiquico).toBe(2.8);
      expect(avgs.saude).toBe(2.5);
      expect(avgs.social).toBe(1.0);
      expect(avgs.juridico).toBe(0); // Sem campos -> 0
      expect(avgs.educacao).toBe(0); // Sem campos -> 0
    });
  });

  describe('deriveDimensionScores', () => {
    it('deriva pontuações de dimensões e preenche sub-scores de autonomia corretamente', () => {
      const scores = {
        // Saúde: tem campos normais e campos de autonomia
        efChronicDiseasesCount: 2, // Geral
        autonomia: 3.5,            // Autonomia
        toDailyIndependence: 2.5,  // Autonomia

        // Psíquico: geral apenas
        psSelfHarmThoughts: 3,
      };

      const dimensionScores = deriveDimensionScores(scores);

      // Encontra Saúde
      const saudeScore = dimensionScores.find((d) => d.dimension === 'saude');
      expect(saudeScore).toBeDefined();
      // Média Saúde geral: (2 + 3.5 + 2.5) / 3 = 2.666... -> 2.7
      expect(saudeScore?.score).toBe(2.7);
      // Média Autonomia (apenas 'autonomia' e 'toDailyIndependence'): (3.5 + 2.5) / 2 = 3.0
      expect(saudeScore?.autonomy).toBe(3.0);

      // Encontra Psíquico
      const psiquicoScore = dimensionScores.find((d) => d.dimension === 'psiquico');
      expect(psiquicoScore).toBeDefined();
      expect(psiquicoScore?.score).toBe(3.0);
      expect(psiquicoScore?.autonomy).toBeUndefined(); // Sem campos de autonomia em psíquico
    });
  });
});
