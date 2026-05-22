import type { PtsSchema } from '@/validations/pts-schema';

export interface PtsAnalysis {
  improvementSuggestions: { field: string; label: string; score?: number }[];
  potentialities: { field: string; label: string; score: number }[];
  suggestedActions: { id: string; description: string; status: 'pending' | 'completed' }[];
}

/**
 * Domínios de avaliação do PTS Intersetorial. Qualquer profissional logado
 * (Saúde, Assistência Social, Jurídico, Educação) pontua qualquer domínio.
 */
export type PtsDomain = 'Psíquico' | 'Saúde' | 'Social' | 'Jurídico' | 'Educação' | 'Autonomia';

export const PTS_DOMAINS: PtsDomain[] = [
  'Psíquico',
  'Saúde',
  'Social',
  'Jurídico',
  'Educação',
  'Autonomia',
];

/** Rótulos legíveis para as chaves de escore conhecidas. */
export const FIELD_LABELS: Record<string, string> = {
  psiquico: 'Domínio Psíquico',
  saude: 'Domínio Saúde',
  social: 'Domínio Social / Renda',
  juridico: 'Domínio Jurídico / Direitos',
  educacao: 'Domínio Educação / Trabalho',
  autonomia: 'Domínio Autonomia / Cotidiano',
  q15MotivationRating: 'Motivação para o Plano',
  psSelfHarmThoughts: 'Sofrimento Psíquico',
  psSleepDifficulty: 'Qualidade do Sono',
  ssSocialBenefits: 'Acesso a Benefícios Sociais',
  ssHealthAccess: 'Acesso à Saúde',
  lgRightsViolation: 'Violação de Direitos',
  edSchoolEnrollment: 'Vínculo Escolar',
  toDailyIndependence: 'Independência no Cotidiano',
};

/** Mapa explícito chave-de-escore → domínio. */
export const FIELD_DOMAINS: Record<string, PtsDomain> = {
  psiquico: 'Psíquico',
  saude: 'Saúde',
  social: 'Social',
  juridico: 'Jurídico',
  educacao: 'Educação',
  autonomia: 'Autonomia',
  q15MotivationRating: 'Psíquico',
  psSelfHarmThoughts: 'Psíquico',
  psSleepDifficulty: 'Psíquico',
  ssSocialBenefits: 'Social',
  ssHealthAccess: 'Saúde',
  lgRightsViolation: 'Jurídico',
  edSchoolEnrollment: 'Educação',
  toDailyIndependence: 'Autonomia',
};

export function getFieldDomain(field: string): PtsDomain {
  if (FIELD_DOMAINS[field]) return FIELD_DOMAINS[field];
  if (field.startsWith('ps')) return 'Psíquico';
  if (field.startsWith('ss')) return 'Social';
  if (field.startsWith('lg')) return 'Jurídico';
  if (field.startsWith('ed')) return 'Educação';
  if (field.startsWith('to')) return 'Autonomia';
  if (field.startsWith('ef') || field.startsWith('nt')) return 'Saúde';
  return 'Saúde';
}

function emptyDomainRecord(): Record<PtsDomain, number> {
  return { 'Psíquico': 0, 'Saúde': 0, 'Social': 0, 'Jurídico': 0, 'Educação': 0, 'Autonomia': 0 };
}

export function calculateDomainAverages(scores: Record<string, number>): Record<PtsDomain, number> {
  const sums = emptyDomainRecord();
  const counts = emptyDomainRecord();

  Object.entries(scores).forEach(([field, score]) => {
    const domain = getFieldDomain(field);
    sums[domain] += score;
    counts[domain] += 1;
  });

  const avgs = emptyDomainRecord();
  PTS_DOMAINS.forEach((d) => {
    avgs[d] = counts[d] > 0 ? Number((sums[d] / counts[d]).toFixed(1)) : 0;
  });

  return avgs;
}

export function analyzePtsState(data: PtsSchema): PtsAnalysis {
  const analysis: PtsAnalysis = {
    improvementSuggestions: [],
    potentialities: [],
    suggestedActions: [],
  };

  const scores = data.scores || {};

  Object.entries(scores).forEach(([field, score]) => {
    const label = FIELD_LABELS[field] || field;
    if (score <= 1) {
      analysis.improvementSuggestions.push({ field, label, score });
    } else if (score >= 3) {
      analysis.potentialities.push({ field, label, score });
    }
  });

  analysis.improvementSuggestions.forEach((suggestion) => {
    let action = '';
    if (suggestion.field === 'q15MotivationRating') {
      action = 'Fortalecer vínculo e usar estratégias de entrevista motivacional.';
    } else if (suggestion.field === 'psSelfHarmThoughts') {
      action = `Acompanhamento intensivo para ${suggestion.label} e articulação com a rede de apoio.`;
    } else {
      action = `Intervenção intersetorial focada em ${suggestion.label} para garantia de direitos e cuidado.`;
    }

    analysis.suggestedActions.push({
      id: `suggested-${suggestion.field}`,
      description: action,
      status: 'pending',
    });
  });

  return analysis;
}

export interface EvolutionDelta {
  semanticChanges: string[];
  stagnationAlerts: string[];
  improvements: string[];
}

export function analyzeEvolutionDelta(previousData: Partial<PtsSchema>, currentData: Partial<PtsSchema>): EvolutionDelta {
  const delta: EvolutionDelta = {
    semanticChanges: [],
    stagnationAlerts: [],
    improvements: [],
  };

  const prevScores = previousData.scores || {};
  const currScores = currentData.scores || {};

  Object.entries(prevScores).forEach(([field, prevScore]) => {
    const currScore = currScores[field];
    const label = FIELD_LABELS[field] || field;

    if (currScore !== undefined) {
      if (currScore > prevScore) {
        delta.improvements.push(`Melhora no domínio: ${label}`);
      } else if (currScore <= prevScore && prevScore < 2) {
        delta.stagnationAlerts.push(`Estagnação crítica no domínio: ${label}. Considerar revisão da conduta.`);
      }
    }
  });

  const checkSemantic = (field: keyof PtsSchema, label: string) => {
    const prev = String(previousData[field] || '').toLowerCase();
    const curr = String(currentData[field] || '').toLowerCase();

    const crisisTerms = ['crise', 'surto', 'desespero', 'agressiv', 'recaída', 'auto-extermínio', 'morte', 'suicídio'];

    const prevCrisisCount = crisisTerms.filter((t) => prev.includes(t)).length;
    const currCrisisCount = crisisTerms.filter((t) => curr.includes(t)).length;

    if (currCrisisCount < prevCrisisCount) {
      delta.semanticChanges.push(`Redução de termos de crise no relato de: ${label}`);
    } else if (currCrisisCount > prevCrisisCount) {
      delta.stagnationAlerts.push(`Aumento de termos de crise no relato de: ${label}`);
    }
  };

  checkSemantic('q1MainComplaint', 'Demanda Principal');
  checkSemantic('psSelfHarmDetails', 'Sofrimento Psíquico (Detalhes)');

  return delta;
}
