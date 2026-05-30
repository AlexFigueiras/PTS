import { Dimension } from './dimensions';

/**
 * Níveis de sensibilidade e abstração exigidos pela LGPD na rede intersetorial.
 *
 * 'shareable'  - Compartilhável: visível a todos os profissionais do caso por padrão.
 * 'abstracted' - Abstraído: não exibe dados crus (ex.: CID, medicamentos),
 *                apenas vulnerabilidades e necessidades de ação de forma indireta.
 */
export type SensitivityLevel = 'shareable' | 'abstracted';

/**
 * Mapeamento de sensibilidade fixa por dimensão canônica.
 *
 * REGRA FIXA DO SISTEMA (nunca decidida pela IA):
 * O domínio 'psiquico' possui o nível 'abstracted' para resguardar o sigilo técnico
 * e de prontuário do CAPS/esfera de Saúde.
 *
 * NOTA: A regra de ouro "relato-fonte bruto nunca atravessa esferas" é uma política transversal
 * que será aplicada diretamente na camada de persistência e RLS (Row Level Security) em passos posteriores,
 * e não nesta camada de domínio puro.
 */
export const DIMENSION_SENSITIVITY: Record<Dimension, SensitivityLevel> = {
  saude: 'shareable',
  social: 'shareable',
  psiquico: 'abstracted',
  juridico: 'shareable',
  educacao: 'shareable',
};

/**
 * Retorna se uma dimensão específica exige exibição puramente abstraída.
 */
export function isAbstractedDimension(d: Dimension): boolean {
  return DIMENSION_SENSITIVITY[d] === 'abstracted';
}
