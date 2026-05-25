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

  // Novos campos de alta fidelidade
  efChronicDiseasesCount: 'Contador de Doenças Crônicas',
  efContinuousMedsCount: 'Contador de Medicamentos Contínuos',
  efEmergencyAdmissionsCount: 'Admissões de Emergência (12 meses)',
  efKatzIndex: 'Índice de Independência de Katz',
  ssIncomePerCapita: 'Renda Familiar Per Capita',
  ssEbiaStatus: 'Segurança Alimentar (EBIA)',
  ssCommunityVinc: 'Vínculos Comunitários (Ecomapa)',
  ssSaneamentoAcesso: 'Acesso a Saneamento Básico',
  srq20Score: 'Escore de Sofrimento Mental (SRQ-20)',
  psCrisisCount: 'Crises Graves (CAPS/Urgência)',
  psMedicationCompliance: 'Adesão à Farmacoterapia',
  lgMissingDocuments: 'Ausência de Documentos Básicos',
  lgActiveJudicialization: 'Processos de Judicialização Ativos',
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

  // Novos campos
  efChronicDiseasesCount: 'Saúde',
  efContinuousMedsCount: 'Saúde',
  efEmergencyAdmissionsCount: 'Saúde',
  efKatzIndex: 'Saúde',
  ssIncomePerCapita: 'Social',
  ssEbiaStatus: 'Social',
  ssCommunityVinc: 'Social',
  ssSaneamentoAcesso: 'Social',
  srq20Score: 'Psíquico',
  psCrisisCount: 'Psíquico',
  psMedicationCompliance: 'Psíquico',
  lgMissingDocuments: 'Jurídico',
  lgActiveJudicialization: 'Jurídico',
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

export interface IvcResult {
  ivc: number;
  iCl: number;
  iSoc: number;
  iPsic: number;
  vulnerabilityIndex: 'A' | 'B' | 'C' | 'D' | 'E';
}

export function calculateIvc(
  data: PtsSchema,
  weights = { alpha: 0.35, beta: 0.35, gamma: 0.30 },
): IvcResult {
  // 1. Clínico (0-4)
  let clScore = 0;
  const hasClinicalCounts =
    (data.efChronicDiseasesCount !== undefined && data.efChronicDiseasesCount > 0) ||
    (data.efContinuousMedsCount !== undefined && data.efContinuousMedsCount > 0) ||
    (data.efEmergencyAdmissionsCount !== undefined && data.efEmergencyAdmissionsCount > 0);

  if (hasClinicalCounts) {
    // Fómula estendida baseada em contagens de alta fidelidade
    clScore = (
      (data.efChronicDiseasesCount || 0) * 1.0 +
      (data.efContinuousMedsCount || 0) * 0.5 +
      (data.efEmergencyAdmissionsCount || 0) * 1.0
    ) / 2;
  } else if (data.efKatzIndex !== undefined && data.efKatzIndex !== null) {
    // Escore funcional de Katz (0 a 6): 0 = dependência total (alta vulnerabilidade), 6 = independente (baixa)
    clScore = (6 - data.efKatzIndex) * (4.0 / 6);
  } else {
    // Fallback clássico
    if (data.efPhysicalLimitation === 'Sim') clScore += 1.5;
    if (data.q2Substances && data.q2Substances.length > 0) {
      clScore += Math.min(1.5, data.q2Substances.length * 0.5);
    }
    let symptomsCount = 0;
    if (data.cCompulsion) symptomsCount++;
    if (data.cTolerance) symptomsCount++;
    if (data.cAbstinence) symptomsCount++;
    if (data.cRelief) symptomsCount++;
    if (data.cRelevance) symptomsCount++;
    clScore += symptomsCount * 0.2;
  }
  const iCl = Math.min(4.0, clScore);

  // 2. Social (0-4)
  let socScore = 0;
  if (data.streetSituation === 'Sim') socScore += 2.0;
  if (data.ssSocialBenefits === 'Não') socScore += 1.0;
  if (data.q11FixedHousing === 'Não') socScore += 1.0;

  // Variáveis sociais estendidas de alta fidelidade
  if (data.ssIncomePerCapita !== undefined && data.ssIncomePerCapita !== null && data.ssIncomePerCapita <= 218) {
    socScore += 1.5; // Extrema pobreza (linha oficial de vulnerabilidade extrema)
  }
  if (data.ssCommunityVinc !== undefined && data.ssCommunityVinc <= 1) {
    socScore += 1.0; // Isolamento social grave (≤ 1 contato ecomapa)
  }
  if (data.ssSaneamentoAcesso === false) {
    socScore += 0.5; // Sem acesso a saneamento básico
  }
  if (data.ssEbiaStatus === 'insegurança_grave') {
    socScore += 1.5;
  } else if (data.ssEbiaStatus === 'insegurança_moderada') {
    socScore += 1.0;
  } else if (data.ssEbiaStatus === 'insegurança_leve') {
    socScore += 0.5;
  }
  const iSoc = Math.min(4.0, socScore);

  // 3. Psicológico (0-4)
  let psicScore = 0;
  if (data.srq20Score !== undefined && data.srq20Score !== null) {
    // Escala SRQ-20 validada (0 a 20): normalizada para 0 a 4.0 pontos
    psicScore = (data.srq20Score / 20) * 4;
    
    // Contagem de crises graves (CAPS / Urgência / Emergência)
    if (data.psCrisisCount !== undefined) {
      psicScore += Math.min(1.5, data.psCrisisCount * 0.5);
    }
    
    // Ideação ativa de autoextermínio
    if (data.psSelfHarmThoughts === 'Sim') {
      psicScore += 2.0;
    }
  } else {
    // Fallback clássico
    if (data.psSelfHarmThoughts === 'Sim') psicScore += 2.0;
    if (data.psSleepDifficulty === 'Sim') psicScore += 0.5;
    if (data.psAnxietySadness === 'Sim') psicScore += 1.0;
    if (data.psDistressingMemories === 'Sim') psicScore += 0.5;
  }
  const iPsic = Math.min(4.0, psicScore);

  // Média Ponderada
  const ivc = Number((weights.alpha * iCl + weights.beta * iSoc + weights.gamma * iPsic).toFixed(2));

  // Vulnerability Index (A to E)
  let vulnerabilityIndex: 'A' | 'B' | 'C' | 'D' | 'E' = 'A';
  if (ivc >= 3.2) vulnerabilityIndex = 'E';
  else if (ivc >= 2.4) vulnerabilityIndex = 'D';
  else if (ivc >= 1.6) vulnerabilityIndex = 'C';
  else if (ivc >= 0.8) vulnerabilityIndex = 'B';

  return { ivc, iCl, iSoc, iPsic, vulnerabilityIndex };
}

