/**
 * Catálogo da Rede Intersetorial (RAPS / SUAS / Jurídico / Educação).
 *
 * Fonte ÚNICA de verdade (domínio puro, sem I/O) dos componentes da rede,
 * dos tipos de necessidade e do mapeamento necessidade → componente que
 * alimenta o Motor de Sinalização Cruzada (Fase 2).
 *
 * O seed do banco (migração 0023_signal_engine.sql) é DERIVADO destas
 * constantes e deve permanecer em sincronia. Os testes garantem a coerência
 * interna (exaustividade e ausência de referências órfãs).
 */

import type { SignalStatus } from './signal';

/**
 * Esfera intersetorial do componente — espelha `service_unit_type`.
 */
export const COMPONENT_SPHERES = ['HEALTH', 'SOCIAL', 'LEGAL', 'EDUCATION'] as const;

export type ComponentSphere = (typeof COMPONENT_SPHERES)[number];

export type NetworkComponent = {
  /** slug estável usado como PK em `network_components`. */
  id: string;
  /** Nome pt-BR para exibição. */
  name: string;
  sphere: ComponentSphere;
  description: string;
};

export type NeedType = {
  /** slug estável usado como PK em `need_types`. */
  id: string;
  /** Rótulo pt-BR para exibição. */
  label: string;
  description: string;
};

/**
 * Componentes da rede. RAPS (Saúde) + SUAS (Social) + Jurídico + Educação.
 */
export const NETWORK_COMPONENTS = [
  // --- RAPS (Saúde) ---
  {
    id: 'atencao_basica',
    name: 'Atenção Básica',
    sphere: 'HEALTH',
    description: 'UBS, NASF, Consultório na Rua, Centros de Convivência',
  },
  {
    id: 'caps',
    name: 'Atenção Psicossocial (CAPS)',
    sphere: 'HEALTH',
    description: 'CAPS em suas modalidades',
  },
  {
    id: 'urgencia_emergencia',
    name: 'Urgência e Emergência',
    sphere: 'HEALTH',
    description: 'SAMU 192, UPA 24h, Sala de Estabilização',
  },
  {
    id: 'residencial_transitorio',
    name: 'Atenção Residencial Transitória',
    sphere: 'HEALTH',
    description: 'Unidade de Acolhimento, Regime Residencial',
  },
  {
    id: 'hospitalar',
    name: 'Atenção Hospitalar',
    sphere: 'HEALTH',
    description: 'Enfermaria especializada, serviço de referência',
  },
  {
    id: 'desinstitucionalizacao',
    name: 'Desinstitucionalização',
    sphere: 'HEALTH',
    description: 'Residenciais Terapêuticos, Programa de Volta para Casa',
  },
  {
    id: 'reabilitacao_psicossocial',
    name: 'Reabilitação Psicossocial',
    sphere: 'HEALTH',
    description: 'Trabalho/renda, cooperativas sociais',
  },
  // --- SUAS (Social) ---
  {
    id: 'cras_paif',
    name: 'CRAS / PAIF',
    sphere: 'SOCIAL',
    description: 'Proteção Social Básica',
  },
  {
    id: 'creas_paefi',
    name: 'CREAS / PAEFI',
    sphere: 'SOCIAL',
    description: 'Proteção Social Especial de Média Complexidade',
  },
  {
    id: 'acolhimento_institucional',
    name: 'Acolhimento Institucional',
    sphere: 'SOCIAL',
    description: 'Alta Complexidade SUAS',
  },
  {
    id: 'socioeducativo',
    name: 'Serviço Socioeducativo',
    sphere: 'SOCIAL',
    description: 'Medidas socioeducativas',
  },
  // --- Jurídico / Educação ---
  {
    id: 'conselho_tutelar',
    name: 'Conselho Tutelar',
    sphere: 'LEGAL',
    description: 'Proteção de crianças e adolescentes',
  },
  {
    id: 'defensoria',
    name: 'Defensoria Pública',
    sphere: 'LEGAL',
    description: 'Assistência jurídica gratuita',
  },
  {
    id: 'escola',
    name: 'Escola / Creche',
    sphere: 'EDUCATION',
    description: 'Rede de educação básica',
  },
  {
    id: 'naapa',
    name: 'NAAPA',
    sphere: 'EDUCATION',
    description: 'Núcleo de Apoio e Acompanhamento para Aprendizagem',
  },
] as const satisfies readonly NetworkComponent[];

export type NetworkComponentId = (typeof NETWORK_COMPONENTS)[number]['id'];

/**
 * Tipos de necessidade que um profissional pode sinalizar.
 */
export const NEED_TYPES = [
  {
    id: 'risco_reinternacao',
    label: 'Risco de Reinternação',
    description: 'Padrão de reinternações frequentes ou fatores de risco',
  },
  {
    id: 'situacao_rua',
    label: 'Situação de Rua',
    description: 'Pessoa em situação de rua ou moradia precária',
  },
  {
    id: 'vulnerabilidade_social_familiar',
    label: 'Vulnerabilidade Social Familiar',
    description: 'Família com indicadores de vulnerabilidade socioeconômica',
  },
  {
    id: 'pos_internacao_sem_moradia',
    label: 'Pós-internação sem Moradia',
    description: 'Alta hospitalar sem residência estável',
  },
  {
    id: 'quadro_agudo',
    label: 'Quadro Agudo',
    description: 'Urgência/emergência clínica ou psiquiátrica',
  },
  {
    id: 'abandono_tratamento',
    label: 'Abandono de Tratamento',
    description: 'Descontinuidade de acompanhamento prescrito',
  },
  {
    id: 'violacao_direitos',
    label: 'Violação de Direitos',
    description: 'Situação de violência, abuso ou negligência',
  },
  {
    id: 'medida_protetiva',
    label: 'Medida Protetiva',
    description: 'Necessidade de proteção jurídica (ECA, idoso, etc)',
  },
  {
    id: 'reabilitacao_psicossocial',
    label: 'Reabilitação Psicossocial',
    description: 'Reinserção social, geração de renda',
  },
  {
    id: 'evasao_escolar',
    label: 'Evasão Escolar',
    description: 'Criança/adolescente fora da escola',
  },
  {
    id: 'perda_beneficio',
    label: 'Perda de Benefício Social',
    description: 'Cancelamento ou suspensão de benefício',
  },
  {
    id: 'uso_substancias',
    label: 'Uso de Substâncias',
    description: 'Necessidade de atenção por uso de álcool/drogas',
  },
  {
    id: 'isolamento_social',
    label: 'Isolamento Social',
    description: 'Pessoa sem rede de apoio ou convivência',
  },
  {
    id: 'comorbidade_clinica',
    label: 'Comorbidade Clínica',
    description: 'Diabetes, hipertensão, condição orgânica em paciente psíquico',
  },
] as const satisfies readonly NeedType[];

export type NeedTypeId = (typeof NEED_TYPES)[number]['id'];

/**
 * Mapeamento necessidade → componentes da rede que a atendem.
 * Cada necessidade resolve para um ou mais componentes (ordem = preferência).
 */
export const COMPONENT_NEED_MAP: Record<NeedTypeId, readonly NetworkComponentId[]> = {
  risco_reinternacao: ['caps', 'atencao_basica'],
  situacao_rua: ['atencao_basica', 'cras_paif'],
  vulnerabilidade_social_familiar: ['cras_paif', 'creas_paefi'],
  pos_internacao_sem_moradia: ['residencial_transitorio', 'acolhimento_institucional'],
  quadro_agudo: ['urgencia_emergencia', 'caps'],
  abandono_tratamento: ['atencao_basica', 'caps'],
  violacao_direitos: ['creas_paefi', 'conselho_tutelar'],
  medida_protetiva: ['conselho_tutelar', 'defensoria'],
  reabilitacao_psicossocial: ['reabilitacao_psicossocial', 'cras_paif'],
  evasao_escolar: ['escola', 'naapa', 'conselho_tutelar'],
  perda_beneficio: ['cras_paif'],
  uso_substancias: ['caps', 'atencao_basica'],
  isolamento_social: ['cras_paif', 'reabilitacao_psicossocial'],
  comorbidade_clinica: ['atencao_basica'],
};

/**
 * Rótulos pt-BR para os status da sinalização (mesmo padrão de
 * `ACTION_STATUS_LABELS`).
 */
export const SIGNAL_STATUS_LABELS: Record<SignalStatus, string> = {
  sugerida: 'Sugerida',
  confirmada_pelo_autor: 'Confirmada pelo Autor',
  descartada: 'Descartada',
  aguardando_validacao_rt: 'Aguardando Validação RT',
  encaminhada: 'Encaminhada',
  recebida: 'Recebida',
  em_tratamento: 'Em Tratamento',
  resolvida: 'Resolvida',
};

/**
 * Retorna os componentes que atendem uma necessidade, na ordem de preferência.
 * Array vazio se a necessidade não existir no mapa.
 */
export function getComponentsForNeed(needTypeId: string): readonly NetworkComponentId[] {
  return COMPONENT_NEED_MAP[needTypeId as NeedTypeId] ?? [];
}

/**
 * Retorna a esfera de um componente, ou `undefined` se o id for desconhecido.
 */
export function getSphereForComponent(componentId: string): ComponentSphere | undefined {
  return NETWORK_COMPONENTS.find((c) => c.id === componentId)?.sphere;
}
