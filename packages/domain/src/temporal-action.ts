/**
 * Tipos do ciclo de vida temporal da Ação (§5.6 do plano).
 * Usados no schema Drizzle, Zod, service e UI — fonte única de verdade.
 */

export const FREQUENCIA_TIPOS = [
  'semanal',
  'quinzenal',
  'mensal',
  'bimestral',
  'trimestral',
  'outro',
] as const;

export type FrequenciaTipo = (typeof FREQUENCIA_TIPOS)[number];

export const FREQUENCIA_LABELS: Record<FrequenciaTipo, string> = {
  semanal: 'Semanal',
  quinzenal: 'Quinzenal',
  mensal: 'Mensal',
  bimestral: 'Bimestral',
  trimestral: 'Trimestral',
  outro: 'Outro (detalhar)',
};

export const HORIZONTE_TIPOS = ['curto_prazo', 'medio_prazo', 'longo_prazo'] as const;

export type HorizonteTipo = (typeof HORIZONTE_TIPOS)[number];

export const HORIZONTE_LABELS: Record<HorizonteTipo, string> = {
  curto_prazo: 'Curto prazo (até 3 meses)',
  medio_prazo: 'Médio prazo (3–6 meses)',
  longo_prazo: 'Longo prazo (acima de 6 meses)',
};

export const ACEITE_USUARIO_VALORES = ['aceita', 'recusa', 'repactuar'] as const;

export type AceiteUsuario = (typeof ACEITE_USUARIO_VALORES)[number];

export const ACEITE_LABELS: Record<AceiteUsuario, string> = {
  aceita: 'Aceita',
  recusa: 'Recusa',
  repactuar: 'Repactuar',
};

export const REAVALIACAO_RESULTADOS = ['cumpriu', 'cumpriu_parcial', 'nao_cumpriu'] as const;

export type ReavaliacaoResultado = (typeof REAVALIACAO_RESULTADOS)[number];

export const REAVALIACAO_RESULTADO_LABELS: Record<ReavaliacaoResultado, string> = {
  cumpriu: 'Cumpriu',
  cumpriu_parcial: 'Cumpriu parcialmente',
  nao_cumpriu: 'Não cumpriu',
};

export const REAVALIACAO_PROXIMAS_ACOES = ['continuar', 'repactuar', 'encerrar', 'escalar'] as const;

export type ReavaliacaoProximaAcao = (typeof REAVALIACAO_PROXIMAS_ACOES)[number];

export const REAVALIACAO_PROXIMA_ACAO_LABELS: Record<ReavaliacaoProximaAcao, string> = {
  continuar: 'Continuar',
  repactuar: 'Repactuar',
  encerrar: 'Encerrar',
  escalar: 'Escalar',
};

// ---------------------------------------------------------------------------
// Semáforo de cumprimento (§5.7 do plano)
// ---------------------------------------------------------------------------

export const STATUS_TEMPORAL_VALORES = ['verde', 'amarelo', 'vermelho'] as const;
export type StatusTemporal = (typeof STATUS_TEMPORAL_VALORES)[number];

export const STATUS_TEMPORAL_LABELS: Record<StatusTemporal, string> = {
  verde: 'Em dia',
  amarelo: 'Atenção — vence em breve',
  vermelho: 'Vencida / Sem comparecimento',
};

/**
 * Calcula o status_temporal derivado de uma ação (§5.7).
 * Regras:
 *  - `vermelho` se prazo_fim ou proximo_retorno já passaram (ação não concluída).
 *  - `amarelo` se faltam ≤ yellowWindowDays dias para proximo_retorno ou data_proxima_reavaliacao.
 *  - `verde` caso contrário.
 *
 * Não armazena resultado — recalculado sempre em runtime.
 *
 * @param today       Data de referência (geralmente new Date())
 * @param actionStatus Status atual da ação
 * @param prazofim    Data de término da ação (YYYY-MM-DD ou null)
 * @param proximoRetorno  Próximo retorno esperado (YYYY-MM-DD ou null)
 * @param dataProximaReavaliacao  Data da próxima reavaliação (YYYY-MM-DD ou null)
 * @param yellowWindowDays  Janela amarela em dias (default 7)
 */
export function computeStatusTemporal(
  today: Date,
  actionStatus: string,
  prazofim: string | null | undefined,
  proximoRetorno: string | null | undefined,
  dataProximaReavaliacao: string | null | undefined,
  yellowWindowDays = 7,
): StatusTemporal {
  // Ações concluídas ou bloqueadas não têm semáforo ativo.
  if (actionStatus === 'concluida' || actionStatus === 'bloqueada') return 'verde';

  const todayMs = today.getTime();
  const dayMs = 86_400_000;

  function parseDate(s: string | null | undefined): number | null {
    if (!s) return null;
    const d = new Date(s + 'T00:00:00.000Z');
    return isNaN(d.getTime()) ? null : d.getTime();
  }

  const prazofimMs = parseDate(prazofim);
  const retornoMs = parseDate(proximoRetorno);
  const reavMs = parseDate(dataProximaReavaliacao);

  // Vermelho: qualquer prazo já vencido
  if (prazofimMs !== null && prazofimMs < todayMs) return 'vermelho';
  if (retornoMs !== null && retornoMs < todayMs) return 'vermelho';

  // Amarelo: faltam ≤ yellowWindowDays para retorno OU reavaliação
  const windowMs = yellowWindowDays * dayMs;
  if (retornoMs !== null && retornoMs - todayMs <= windowMs) return 'amarelo';
  if (reavMs !== null && reavMs - todayMs <= windowMs) return 'amarelo';

  return 'verde';
}

// ---------------------------------------------------------------------------
// Nível de intensidade do cuidado (§5.8 do plano)
// ---------------------------------------------------------------------------

export const NIVEL_INTENSIDADE_VALORES = [
  'intensivo',
  'manutencao_semestral',
  'manutencao_anual',
  'alta_continuidade',
] as const;

export type NivelIntensidade = (typeof NIVEL_INTENSIDADE_VALORES)[number];

export const NIVEL_INTENSIDADE_LABELS: Record<NivelIntensidade, string> = {
  intensivo: 'Intensivo',
  manutencao_semestral: 'Manutenção Semestral',
  manutencao_anual: 'Manutenção Anual',
  alta_continuidade: 'Alta por Continuidade',
};

/** Cadência de reavaliação global (em meses) derivada do nível de intensidade. */
export const NIVEL_CADENCIA_MESES: Record<NivelIntensidade, number | null> = {
  intensivo: 1,
  manutencao_semestral: 6,
  manutencao_anual: 12,
  alta_continuidade: null, // estado terminal — sem reavaliação periódica
};

/**
 * Transições de nível permitidas.
 * Apenas progressão (intensivo→semestral→anual→alta) ou regressão direta
 * (o RT pode escalar de volta a intensivo).
 */
export const NIVEL_TRANSITIONS: Record<NivelIntensidade, NivelIntensidade[]> = {
  intensivo: ['manutencao_semestral'],
  manutencao_semestral: ['manutencao_anual', 'intensivo'],
  manutencao_anual: ['alta_continuidade', 'intensivo'],
  alta_continuidade: [],
};

export function isNivelIntensidade(value: unknown): value is NivelIntensidade {
  return typeof value === 'string' && (NIVEL_INTENSIDADE_VALORES as readonly string[]).includes(value);
}

/**
 * Calcula o atraso em meses completos desde a última data de referência.
 * Usado pelo cron de alertas de descumprimento (§5.7).
 */
export function monthsOverdue(
  today: Date,
  referenceDate: string | null | undefined,
): number {
  if (!referenceDate) return 0;
  const ref = new Date(referenceDate + 'T00:00:00.000Z');
  if (isNaN(ref.getTime())) return 0;
  const diffMs = today.getTime() - ref.getTime();
  if (diffMs <= 0) return 0;
  return Math.floor(diffMs / (30.44 * 86_400_000)); // avg days/month
}
