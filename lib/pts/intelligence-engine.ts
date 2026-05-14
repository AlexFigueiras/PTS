import type { PtsSchema } from '@/validations/pts-schema';

export interface PtsAnalysis {
  improvementSuggestions: { field: string; label: string; score?: number }[];
  potentialities: { field: string; label: string; score: number }[];
  suggestedActions: { id: string; description: string; status: 'pending' | 'completed' }[];
}

const FIELD_LABELS: Record<string, string> = {
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
  // Add more as needed
};

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
