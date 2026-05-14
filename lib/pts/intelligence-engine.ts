import type { PtsSchema } from '@/validations/pts-schema';

export interface PtsAnalysis {
  improvementSuggestions: { field: string; label: string; score?: number }[];
  potentialities: { field: string; label: string; score: number }[];
  suggestedActions: { id: string; description: string; status: 'pending' | 'completed' }[];
}

export const FIELD_LABELS: Record<string, string> = {
  q1MainComplaint: 'Queixa Principal',
  q15MotivationRating: 'Motivação',
  nuWeight: 'Peso',
  nuHeight: 'Altura',
  nuPainLevel: 'Nível de Dor',
  psSelfHarmThoughts: 'Pensamentos de Auto-extermínio',
  psSleepDifficulty: 'Dificuldade de Sono',
  toDailyIndependence: 'Independência Diária',
  ssSocialBenefits: 'Benefícios Sociais',
  efRegularPractice: 'Atividade Física',
};

export type PtsDomain = 'Clínico' | 'Psíquico' | 'Social' | 'Autonomia' | 'Familiar';

export const FIELD_DOMAINS: Record<string, PtsDomain> = {
  q1MainComplaint: 'Clínico',
  nuWeight: 'Clínico',
  nuHeight: 'Clínico',
  nuPainLevel: 'Clínico',
  efRegularPractice: 'Clínico',
  
  q15MotivationRating: 'Psíquico',
  psSelfHarmThoughts: 'Psíquico',
  psSleepDifficulty: 'Psíquico',
  
  ssSocialBenefits: 'Social',
  ssHealthAccess: 'Social',
  
  toDailyIndependence: 'Autonomia',
  toCognitiveDifficulty: 'Autonomia',
  toLaborActivity: 'Autonomia',
  toLeisureActivity: 'Autonomia',
  
  ssLivesWithOthers: 'Familiar',
  q12FamilySupport: 'Familiar',
};

export function getFieldDomain(field: string): PtsDomain {
  if (FIELD_DOMAINS[field]) return FIELD_DOMAINS[field];
  if (field.startsWith('nu') || field.startsWith('nt') || field.startsWith('ef')) return 'Clínico';
  if (field.startsWith('ps')) return 'Psíquico';
  if (field.startsWith('ss')) return 'Social';
  if (field.startsWith('to')) return 'Autonomia';
  if (field.toLowerCase().includes('family')) return 'Familiar';
  return 'Clínico';
}

export function calculateDomainAverages(scores: Record<string, number>): Record<PtsDomain, number> {
  const sums: Record<PtsDomain, number> = { 'Clínico': 0, 'Psíquico': 0, 'Social': 0, 'Autonomia': 0, 'Familiar': 0 };
  const counts: Record<PtsDomain, number> = { 'Clínico': 0, 'Psíquico': 0, 'Social': 0, 'Autonomia': 0, 'Familiar': 0 };

  Object.entries(scores).forEach(([field, score]) => {
    const domain = getFieldDomain(field);
    sums[domain] += score;
    counts[domain] += 1;
  });

  const avgs: Record<PtsDomain, number> = { 'Clínico': 0, 'Psíquico': 0, 'Social': 0, 'Autonomia': 0, 'Familiar': 0 };
  (Object.keys(sums) as PtsDomain[]).forEach(d => {
    // If there are no scores, we default to full score (4) or 0? 
    // Usually missing means fine, let's keep it 0 if not assessed, or maybe 4 (healthy).
    // Let's use 0 so the radar chart only shows evaluated things.
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

  // Analyze scores
  Object.entries(scores).forEach(([field, score]) => {
    const label = FIELD_LABELS[field] || field;
    if (score <= 1) {
      analysis.improvementSuggestions.push({ field, label, score });
    } else if (score >= 3) {
      analysis.potentialities.push({ field, label, score });
    }
  });

  // Generate suggested actions (Simple heuristics for now)
  analysis.improvementSuggestions.forEach((suggestion) => {
    let action = '';
    if (suggestion.field === 'q15MotivationRating') {
      action = 'Implementar estratégias de entrevista motivacional e fortalecer vínculo terapêutico.';
    } else if (suggestion.field === 'psSelfHarmThoughts') {
      action = `Acompanhamento intensivo para ${suggestion.label} e articulação com rede de apoio.`;
    } else {
      action = `Intervenção focada em ${suggestion.label} para redução de danos e promoção de saúde.`;
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
    
    const prevCrisisCount = crisisTerms.filter(t => prev.includes(t)).length;
    const currCrisisCount = crisisTerms.filter(t => curr.includes(t)).length;
    
    if (currCrisisCount < prevCrisisCount) {
      delta.semanticChanges.push(`Redução de termos de crise no relato de: ${label}`);
    } else if (currCrisisCount > prevCrisisCount) {
      delta.stagnationAlerts.push(`Aumento de termos de crise no relato de: ${label}`);
    }
  };

  checkSemantic('q1MainComplaint', 'Queixa Principal');
  checkSemantic('psSelfHarmDetails', 'Pensamentos de Auto-extermínio (Detalhes)');

  return delta;
}
