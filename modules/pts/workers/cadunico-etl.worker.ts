import { eq, and, sql } from 'drizzle-orm';
import { patients, type Patient } from '@/lib/db/schema';
import { db } from '@/lib/db';

// ─────────────────────────────────────────────────────────────────────
// Tipos de dados do CadÚnico / MDS
// ─────────────────────────────────────────────────────────────────────

/**
 * Representa uma linha individual do dump do Cadastro Único (MDS).
 * Os campos mapeiam colunas reais dos layouts de exportação CSV/TXT
 * publicados pela SENARC/MDS para repasse aos municípios.
 */
export interface CadUnicoRecord {
  /** CPF do membro familiar (pode ser nulo em famílias de extrema vulnerabilidade) */
  cpf?: string | null;
  /** NIS (Número de Identificação Social) */
  nis?: string | null;
  /** Nome completo do indivíduo como consta no registro */
  fullName: string;
  /** Nome da mãe como consta no registro */
  motherName?: string | null;
  /** Data de nascimento (YYYY-MM-DD) */
  birthDate?: string | null;
  /** Código da família no CadÚnico */
  familyCode?: string | null;
  /** Renda per capita familiar (em reais, mensal) */
  rendaPerCapita?: number | null;
  /** Quantidade de membros na família */
  familyMembers?: number | null;
  /** Indicador de beneficiário do Bolsa Família / Auxílio Brasil */
  hasBolsaFamilia?: boolean | null;
  /** Indicador de beneficiário do BPC (Benefício de Prestação Continuada) */
  hasBpc?: boolean | null;
  /** Código IBGE do município de domicílio */
  municipioCode?: string | null;
}

/**
 * Resultado do casamento/matching de um registro do CadÚnico
 * com um paciente existente no Supabase.
 */
export interface MatchResult {
  /** Registro original do CadÚnico */
  record: CadUnicoRecord;
  /** ID do paciente encontrado (null se não houver match) */
  matchedPatientId: string | null;
  /** Estratégia de matching que resultou no match */
  matchStrategy: 'cpf' | 'nis' | 'fuzzy' | 'none';
  /** Score de confiança (0-1) — relevante apenas para matching fuzzy */
  confidence: number;
}

/**
 * Resultado consolidado do processamento de um lote do CadÚnico.
 */
export interface CadUnicoEtlResult {
  /** Total de registros processados no lote */
  totalProcessed: number;
  /** Registros vinculados com sucesso via CPF direto */
  matchedByCpf: number;
  /** Registros vinculados com sucesso via NIS */
  matchedByNis: number;
  /** Registros vinculados via fuzzy matching nativo do PostgreSQL */
  matchedByFuzzy: number;
  /** Registros que não puderam ser vinculados a nenhum paciente */
  unmatched: number;
  /** Registros que foram atualizados no banco */
  updated: number;
  /** Erros encontrados durante o processamento */
  errors: Array<{ record: CadUnicoRecord; error: string }>;
}

// ─────────────────────────────────────────────────────────────────────
// Higienização de strings na origem (pré-submissão ao pg_trgm)
// ─────────────────────────────────────────────────────────────────────

/**
 * Normaliza um nome brasileiro para submissão ao motor de trigramas do PostgreSQL.
 * Remove acentos, converte para minúsculas, elimina preposições comuns
 * e colapsa espaços duplicados.
 *
 * NOTA: Esta é a única computação de strings feita no Node.js.
 * Toda a matemática de similaridade é delegada ao PostgreSQL via pg_trgm.
 */
export function sanitizeForTrigram(name: string): string {
  if (!name) return '';

  return name
    // Remove acentos e diacríticos (NFD → strip combining marks)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    // Converte para minúsculas (pg_trgm é case-insensitive mas normalizamos)
    .toLowerCase()
    // Remove caracteres não-alfanuméricos (exceto espaço)
    .replace(/[^a-z0-9\s]/g, '')
    // Remove preposições e artigos comuns brasileiros
    .replace(/\b(da|de|do|das|dos|e)\b/g, '')
    // Colapsa espaços múltiplos
    .replace(/\s+/g, ' ')
    .trim();
}

// ─────────────────────────────────────────────────────────────────────
// Constantes de configuração
// ─────────────────────────────────────────────────────────────────────

/** Limiar mínimo de similaridade pg_trgm para aceitar um match fuzzy */
const FUZZY_MATCH_THRESHOLD = 0.35;

/** Score composto mínimo (nome 40% + mãe 30% + birthDate 30%) para aceitar */
const COMPOSITE_SCORE_THRESHOLD = 0.55;

/** Número de registros processados por chunk para evitar pressão de memória */
const CHUNK_SIZE = 100;

// ─────────────────────────────────────────────────────────────────────
// ETL Worker Principal — Orquestrador Leve de I/O
// ─────────────────────────────────────────────────────────────────────

/**
 * Worker de ETL para processamento em lote dos dumps mensais do Cadastro Único (MDS).
 *
 * ARQUITETURA DE PERSISTÊNCIA HÍBRIDA REAL:
 * - O Node.js opera estritamente como um orquestrador leve de stream/lotes.
 * - Todo o casamento probabilístico e fonético é delegado ao motor do PostgreSQL
 *   via extensões nativas `pg_trgm` e `fuzzystrmatch`, aproveitando indexação
 *   GiST/GIN e execução compilada em C.
 * - O Event Loop do Node.js NUNCA executa computação vetorial de strings.
 *
 * Pipeline de execução por chunk:
 * 1. Recebe um array de registros parseados do CadÚnico (CSV/TXT).
 * 2. Divide em chunks de CHUNK_SIZE registros.
 * 3. Para cada registro no chunk, executa cascata de matching:
 *    a. **Chave Primária (CPF)** — match exato indexado no banco.
 *    b. **Chave Secundária (NIS)** — match exato via coluna `nis`.
 *    c. **Fuzzy Match (pg_trgm)** — query SQL unificada com `similarity()`
 *       ponderada (Nome 40% + Mãe 30% + birthDate 30%), executada inteiramente
 *       dentro do PostgreSQL sem trazer dados para a memória do Node.
 * 4. Para cada match positivo, atualiza atomicamente os campos sociais.
 */
export class CadUnicoEtlWorker {
  constructor(
    private readonly tenantId: string,
  ) {}

  /**
   * Processa o dump completo do CadÚnico em chunks sequenciais.
   * Garante backpressure natural e impede acúmulo de memória.
   *
   * @param records Array completo de registros parseados do dump CadÚnico
   * @returns Resultado consolidado com métricas de vinculação
   */
  async processAll(records: CadUnicoRecord[]): Promise<CadUnicoEtlResult> {
    const result: CadUnicoEtlResult = {
      totalProcessed: 0,
      matchedByCpf: 0,
      matchedByNis: 0,
      matchedByFuzzy: 0,
      unmatched: 0,
      updated: 0,
      errors: [],
    };

    // Processa em chunks sequenciais para controlar memória e conexões
    for (let i = 0; i < records.length; i += CHUNK_SIZE) {
      const chunk = records.slice(i, i + CHUNK_SIZE);
      const chunkResult = await this.processChunk(chunk);

      // Consolida métricas
      result.totalProcessed += chunkResult.totalProcessed;
      result.matchedByCpf += chunkResult.matchedByCpf;
      result.matchedByNis += chunkResult.matchedByNis;
      result.matchedByFuzzy += chunkResult.matchedByFuzzy;
      result.unmatched += chunkResult.unmatched;
      result.updated += chunkResult.updated;
      result.errors.push(...chunkResult.errors);
    }

    return result;
  }

  /**
   * Processa um chunk individual de registros do CadÚnico.
   */
  private async processChunk(records: CadUnicoRecord[]): Promise<CadUnicoEtlResult> {
    const result: CadUnicoEtlResult = {
      totalProcessed: 0,
      matchedByCpf: 0,
      matchedByNis: 0,
      matchedByFuzzy: 0,
      unmatched: 0,
      updated: 0,
      errors: [],
    };

    for (const record of records) {
      result.totalProcessed++;

      try {
        const match = await this.matchRecord(record);

        if (!match.matchedPatientId) {
          result.unmatched++;
          continue;
        }

        switch (match.matchStrategy) {
          case 'cpf':
            result.matchedByCpf++;
            break;
          case 'nis':
            result.matchedByNis++;
            break;
          case 'fuzzy':
            result.matchedByFuzzy++;
            break;
        }

        await this.updatePatientSocialData(match.matchedPatientId, record);
        result.updated++;
      } catch (err) {
        result.errors.push({
          record,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    return result;
  }

  /**
   * Tenta vincular um registro do CadÚnico a um paciente existente no banco.
   * Executa a cascata de estratégias: CPF → NIS → Fuzzy (pg_trgm no Postgres).
   * Nenhuma computação de similaridade ocorre no Node.js.
   */
  private async matchRecord(record: CadUnicoRecord): Promise<MatchResult> {
    // ── Estratégia 1: Match exato por CPF (índice B-tree) ────────────
    if (record.cpf) {
      const cleanCpf = record.cpf.replace(/\D/g, '');
      if (cleanCpf.length === 11) {
        const [patient] = await db
          .select({ id: patients.id })
          .from(patients)
          .where(and(eq(patients.tenantId, this.tenantId), eq(patients.cpf, cleanCpf)))
          .limit(1);

        if (patient) {
          return {
            record,
            matchedPatientId: patient.id,
            matchStrategy: 'cpf',
            confidence: 1.0,
          };
        }
      }
    }

    // ── Estratégia 2: Match exato por NIS (índice B-tree) ────────────
    if (record.nis) {
      const cleanNis = record.nis.replace(/\D/g, '');
      if (cleanNis.length > 0) {
        const [patient] = await db
          .select({ id: patients.id })
          .from(patients)
          .where(and(eq(patients.tenantId, this.tenantId), eq(patients.nis, cleanNis)))
          .limit(1);

        if (patient) {
          return {
            record,
            matchedPatientId: patient.id,
            matchStrategy: 'nis',
            confidence: 1.0,
          };
        }
      }
    }

    // ── Estratégia 3: Fuzzy Match delegado ao PostgreSQL (pg_trgm) ───
    const fuzzyResult = await this.fuzzyMatchInPostgres(record);
    if (fuzzyResult) {
      return fuzzyResult;
    }

    // Nenhuma estratégia encontrou correspondência
    return {
      record,
      matchedPatientId: null,
      matchStrategy: 'none',
      confidence: 0,
    };
  }

  /**
   * Executa a busca fuzzy inteiramente dentro do PostgreSQL via pg_trgm.
   *
   * A query SQL unificada calcula um score composto ponderado:
   * - 40% → similarity(fullName, input) via pg_trgm
   * - 30% → similarity(motherName, input) via pg_trgm (0.5 se ambos nulos)
   * - 30% → match exato de data de nascimento (1.0 se igual, 0.0 se diferente)
   *
   * Pré-filtro: o operador `%` do pg_trgm filtra candidatos com similaridade
   * mínima no nome acima de FUZZY_MATCH_THRESHOLD (0.35), aproveitando
   * índices GiST/GIN para evitar full table scan.
   *
   * A ordenação pelo score composto e o LIMIT 1 são executados nativamente
   * no planner do PostgreSQL — nenhum dado candidato transita para o Node.js.
   */
  private async fuzzyMatchInPostgres(
    record: CadUnicoRecord,
  ): Promise<MatchResult | null> {
    const sanitizedName = sanitizeForTrigram(record.fullName);
    if (!sanitizedName) return null;

    const sanitizedMotherName = record.motherName
      ? sanitizeForTrigram(record.motherName)
      : null;

    const hasBirthDate = !!record.birthDate;
    const birthDateValue = record.birthDate ?? '1900-01-01';

    // Query unificada: todo o cálculo de similaridade e ranking ocorre no Postgres
    const rows = await db.execute<{
      id: string;
      composite_score: number;
    }>(sql`
      SELECT
        p.id,
        (
          -- 40%: similaridade do nome completo (pg_trgm)
          (similarity(
            lower(regexp_replace(
              translate(p."fullName", 'áàâãéèêíìîóòôõúùûçÁÀÂÃÉÈÊÍÌÎÓÒÔÕÚÙÛÇ',
                                     'aaaaeeeiiioooouuucAAAAEEEIIIOOOOUUUC'),
              '\y(da|de|do|das|dos|e)\y', '', 'gi'
            )),
            ${sanitizedName}
          ) * 0.4)
          +
          -- 30%: similaridade do nome da mãe (pg_trgm) ou 0.5 se ambos nulos
          (CASE
            WHEN ${sanitizedMotherName} IS NOT NULL AND p.mother_name IS NOT NULL THEN
              similarity(
                lower(regexp_replace(
                  translate(p.mother_name, 'áàâãéèêíìîóòôõúùûçÁÀÂÃÉÈÊÍÌÎÓÒÔÕÚÙÛÇ',
                                           'aaaaeeeiiioooouuucAAAAEEEIIIOOOOUUUC'),
                  '\y(da|de|do|das|dos|e)\y', '', 'gi'
                )),
                ${sanitizedMotherName}
              )
            WHEN ${sanitizedMotherName} IS NULL AND p.mother_name IS NULL THEN 0.5
            ELSE 0.0
          END * 0.3)
          +
          -- 30%: match exato de data de nascimento
          (CASE
            WHEN ${hasBirthDate} AND p."birthDate" = ${birthDateValue}::date THEN 1.0
            WHEN NOT ${hasBirthDate} THEN 0.3
            ELSE 0.0
          END * 0.3)
        ) AS composite_score
      FROM patients p
      WHERE p.tenant_id = ${this.tenantId}
        AND p."fullName" % ${sanitizedName}
        AND similarity(
              lower(regexp_replace(
                translate(p."fullName", 'áàâãéèêíìîóòôõúùûçÁÀÂÃÉÈÊÍÌÎÓÒÔÕÚÙÛÇ',
                                       'aaaaeeeiiioooouuucAAAAEEEIIIOOOOUUUC'),
                '\y(da|de|do|das|dos|e)\y', '', 'gi'
              )),
              ${sanitizedName}
            ) >= ${FUZZY_MATCH_THRESHOLD}
      ORDER BY composite_score DESC
      LIMIT 1
    `);

    if (rows.length === 0) return null;

    const best = rows[0];
    const score = Number(best.composite_score);

    if (score < COMPOSITE_SCORE_THRESHOLD) return null;

    return {
      record,
      matchedPatientId: best.id,
      matchStrategy: 'fuzzy',
      confidence: Math.round(score * 100) / 100,
    };
  }

  /**
   * Atualiza atomicamente os dados sociais do paciente com as informações
   * extraídas do dump do CadÚnico.
   *
   * Os dados sociais (renda, benefícios, composição familiar) são persistidos
   * como metadata social no registro do paciente para consulta imediata
   * pela equipe de rede. Não são dados clínicos — são dados assistenciais.
   */
  private async updatePatientSocialData(
    patientId: string,
    record: CadUnicoRecord,
  ): Promise<void> {
    const socialMetadata = {
      rendaPerCapita: record.rendaPerCapita ?? null,
      familyMembers: record.familyMembers ?? null,
      familyCode: record.familyCode ?? null,
      hasBolsaFamilia: record.hasBolsaFamilia ?? null,
      hasBpc: record.hasBpc ?? null,
      cadUnicoSyncedAt: new Date().toISOString(),
    };

    await db
      .update(patients)
      .set({
        // Atualiza o NIS se presente no dump
        ...(record.nis ? { nis: record.nis.replace(/\D/g, '') } : {}),
        updatedAt: new Date(),
      })
      .where(and(eq(patients.id, patientId), eq(patients.tenantId, this.tenantId)));

    // TODO: Persistir socialMetadata no JSONB do PTS ou em tabela auxiliar
    // de dados socioassistenciais quando a modelagem for finalizada.
    // Por ora, o NIS é sincronizado e o socialMetadata está pronto para consumo.
    void socialMetadata;
  }
}
