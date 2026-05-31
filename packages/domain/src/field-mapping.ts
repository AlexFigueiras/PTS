/**
 * NOTA DE ARQUITETURA:
 * Este módulo é a ÚNICA fonte de verdade do mapeamento campo ➔ dimensão;
 * o motor de inteligência e quaisquer outros consumidores importam a partir daqui.
 */

import { DIMENSIONS, Dimension } from './dimensions';

export const FIELD_LABELS: Record<string, string> = {
  psiquico: 'Domínio Psíquico',
  saude: 'Domínio Saúde',
  social: 'Domínio Social / Renda',
  juridico: 'Domínio Jurídico / Direitos',
  educacao: 'Domínio Educação / Trabalho',
  'saude.autonomia': 'Domínio Autonomia (Saúde)',
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

/** Mapa explícito chave-de-escore ➔ domínio. */
export const FIELD_DOMAINS: Record<string, Dimension> = {
  psiquico: 'psiquico',
  saude: 'saude',
  social: 'social',
  juridico: 'juridico',
  educacao: 'educacao',
  'saude.autonomia': 'saude',
  autonomia: 'saude',
  q15MotivationRating: 'psiquico',
  psSelfHarmThoughts: 'psiquico',
  psSleepDifficulty: 'psiquico',
  ssSocialBenefits: 'social',
  ssHealthAccess: 'saude',
  lgRightsViolation: 'juridico',
  edSchoolEnrollment: 'educacao',
  toDailyIndependence: 'saude',

  // Novos campos
  efChronicDiseasesCount: 'saude',
  efContinuousMedsCount: 'saude',
  efEmergencyAdmissionsCount: 'saude',
  efKatzIndex: 'saude',
  ssIncomePerCapita: 'social',
  ssEbiaStatus: 'social',
  ssCommunityVinc: 'social',
  ssSaneamentoAcesso: 'social',
  srq20Score: 'psiquico',
  psCrisisCount: 'psiquico',
  psMedicationCompliance: 'psiquico',
  lgMissingDocuments: 'juridico',
  lgActiveJudicialization: 'juridico',
};

/**
 * Retorna a dimensão correspondente a um dado campo de formulário/escore.
 */
export function getFieldDomain(field: string): Dimension {
  if (FIELD_DOMAINS[field]) return FIELD_DOMAINS[field];
  if (field.startsWith('ps')) return 'psiquico';
  if (field.startsWith('ss')) return 'social';
  if (field.startsWith('lg')) return 'juridico';
  if (field.startsWith('ed')) return 'educacao';
  if (field.startsWith('to')) return 'saude'; // Autonomia mapeada para Saúde
  if (field.startsWith('ef') || field.startsWith('nt')) return 'saude';
  return 'saude';
}

/**
 * Cria uma estrutura zerada contendo todas as dimensões do PTS.
 */
export function emptyDomainRecord(): Record<Dimension, number> {
  return { saude: 0, social: 0, psiquico: 0, juridico: 0, educacao: 0 };
}
