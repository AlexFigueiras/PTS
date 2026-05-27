import type {
  FhirBundle,
  FhirBundleEntry,
  FhirComposition,
  FhirCompositionSection,
  FhirCondition,
  FhirAllergyIntolerance,
  FhirMedicationRequest,
  FhirCoding,
} from '../types/fhir-r4.types';

// ─────────────────────────────────────────────────────────────────────
// Tipos de saída do parser — formatos aceitos pelo PtsRepository
// ─────────────────────────────────────────────────────────────────────

/**
 * Diagnóstico ativo extraído do Bundle, normalizado para o baseline do PTS.
 */
export interface ParsedCondition {
  /** Código CID-10 ou CIAP-2 */
  code: string;
  /** Sistema de codificação (ICD-10 ou ICPC-2) */
  system: string;
  /** Nome legível do diagnóstico */
  display: string;
  /** Status clínico na origem (active, recurrence, relapse, etc.) */
  clinicalStatus: string;
  /** Data de registro do diagnóstico (ISO) */
  recordedDate?: string;
}

/**
 * Alergia/Intolerância extraída do Bundle, normalizada para o baseline do PTS.
 */
export interface ParsedAllergy {
  /** Código SNOMED-CT ou CIAP-2 do alérgeno */
  code: string;
  /** Nome legível do alérgeno */
  display: string;
  /** Criticidade clínica (low, high, unable-to-assess) */
  criticality: string;
  /** Categoria (food, medication, environment, biologic) */
  category?: string;
  /** Data de registro (ISO) */
  recordedDate?: string;
}

/**
 * Medicamento em uso contínuo extraído do Bundle, normalizado para o baseline do PTS.
 */
export interface ParsedMedication {
  /** Código do medicamento (CATMAT/BRMedicamento/SNOMED) */
  code: string;
  /** Nome comercial ou genérico do medicamento */
  display: string;
  /** Status da prescrição (active, on-hold, completed, etc.) */
  status: string;
  /** Instrução de dosagem em texto livre */
  dosageInstruction?: string;
  /** Data de autoria da prescrição (ISO) */
  authoredOn?: string;
}

/**
 * Resultado final consolidado do parser de entrada da RNDS.
 * Contém apenas os recursos semanticamente válidos extraídos
 * via navegação da árvore Composition do Bundle.
 */
export interface ClinicalBaseline {
  /** Diagnósticos ativos (CID-10 / CIAP-2) vinculados às seções da Composition */
  conditions: ParsedCondition[];
  /** Alergias e reações adversas confirmadas */
  allergies: ParsedAllergy[];
  /** Medicamentos em uso contínuo ou prescritos ativamente */
  medications: ParsedMedication[];
  /** Metadados do documento de origem */
  metadata: {
    /** Título do documento de origem (ex: "Registro de Atendimento Clínico") */
    documentTitle?: string;
    /** Data do documento */
    documentDate?: string;
    /** Número de seções processadas com sucesso */
    sectionsProcessed: number;
    /** Número total de recursos extraídos */
    totalResourcesExtracted: number;
  };
}

// ─────────────────────────────────────────────────────────────────────
// Códigos de seção do DATASUS mapeados à extração do PTS
// ─────────────────────────────────────────────────────────────────────

/** Códigos BRTipoDocumento que contêm recursos Condition */
const CONDITION_SECTION_CODES = new Set([
  'problemasDiagnosticosAvaliados',
  'problemaDiagnostico',
]);

/** Códigos BRTipoDocumento que contêm recursos AllergyIntolerance */
const ALLERGY_SECTION_CODES = new Set([
  'alergiaReacaoAdversa',
]);

/** Códigos BRTipoDocumento que contêm recursos MedicationRequest */
const MEDICATION_SECTION_CODES = new Set([
  'prescricao',
  'prescricaoMedicamento',
]);

// ─────────────────────────────────────────────────────────────────────
// Funções auxiliares internas
// ─────────────────────────────────────────────────────────────────────

/**
 * Constrói um mapa de lookup rápido fullUrl → resource para resolver
 * as referências da Composition sem varredura linear repetida.
 */
function buildResourceIndex(entries: FhirBundleEntry[]): Map<string, any> {
  const index = new Map<string, any>();
  for (const entry of entries) {
    if (entry.fullUrl) {
      index.set(entry.fullUrl, entry.resource);
    }
    // Também indexa pelo resourceType/id para referências relativas
    const resource = entry.resource as any;
    if (resource?.resourceType && resource?.id) {
      index.set(`${resource.resourceType}/${resource.id}`, resource);
    }
  }
  return index;
}

/**
 * Encontra o recurso Composition na raiz do Bundle.
 * O primeiro entry de um Bundle do tipo `document` é sempre a Composition.
 */
function findComposition(entries: FhirBundleEntry[]): FhirComposition | null {
  // O primeiro entry DEVE ser a Composition segundo a spec FHIR
  if (entries.length > 0 && (entries[0].resource as any)?.resourceType === 'Composition') {
    return entries[0].resource as FhirComposition;
  }

  // Fallback: busca na lista inteira
  for (const entry of entries) {
    if ((entry.resource as any)?.resourceType === 'Composition') {
      return entry.resource as FhirComposition;
    }
  }

  return null;
}

/**
 * Extrai o código primário da seção a partir do CodeableConcept.
 */
function getSectionCode(section: FhirCompositionSection): string | null {
  const coding = section.code?.coding;
  if (!coding || coding.length === 0) return null;
  return coding[0].code ?? null;
}

/**
 * Extrai o código primário e display de um CodeableConcept.
 */
function extractPrimaryCoding(concept: { coding?: FhirCoding[]; text?: string }): {
  code: string;
  system: string;
  display: string;
} {
  const coding = concept.coding?.[0];
  return {
    code: coding?.code ?? '',
    system: coding?.system ?? '',
    display: coding?.display ?? concept.text ?? '',
  };
}

/**
 * Extrai o código de status clínico de um CodeableConcept de clinicalStatus.
 */
function extractClinicalStatus(
  clinicalStatus?: { coding?: FhirCoding[] },
): string {
  return clinicalStatus?.coding?.[0]?.code ?? 'unknown';
}

// ─────────────────────────────────────────────────────────────────────
// Parser principal
// ─────────────────────────────────────────────────────────────────────

/**
 * Converte um Bundle FHIR recebido da RNDS em um baseline clínico estruturado
 * e normalisado para consumo direto pelo `PtsRepository`.
 *
 * REGRA SEMÂNTICA CRÍTICA:
 * Este parser **não** varre cegamente o Bundle filtrando por `resourceType`.
 * Isso traria CIDs descartados, suspeitados, histórico familiar ou recursos
 * órfãos que não fazem parte do contexto clínico ativo.
 *
 * Em vez disso, a extração navega obrigatoriamente pela árvore hierárquica
 * da **Composition**, seguindo as seções declaradas em `composition.section[].entry[]`.
 * Apenas recursos que estejam semanticamente vinculados a uma seção válida e
 * ativa são considerados elegíveis para inclusão no baseline do PTS.
 *
 * @param bundle Bundle FHIR do tipo `document` recebido da RNDS
 * @returns Baseline clínico normalisado com diagnósticos, alergias e medicamentos
 */
export function toClinicalBaseline(bundle: any): ClinicalBaseline {
  const result: ClinicalBaseline = {
    conditions: [],
    allergies: [],
    medications: [],
    metadata: {
      sectionsProcessed: 0,
      totalResourcesExtracted: 0,
    },
  };

  // Validação de entrada
  if (!bundle || bundle.resourceType !== 'Bundle' || !Array.isArray(bundle.entry)) {
    return result;
  }

  const entries = bundle.entry as FhirBundleEntry[];
  if (entries.length === 0) return result;

  // ── 1. Localizar a Composition (raiz da árvore semântica) ──────────
  const composition = findComposition(entries);
  if (!composition) {
    console.warn('[RndsInboundMapper] Bundle sem Composition — impossível navegar semanticamente.');
    return result;
  }

  result.metadata.documentTitle = composition.title;
  result.metadata.documentDate = composition.date;

  // ── 2. Construir o índice de lookup de recursos ────────────────────
  const resourceIndex = buildResourceIndex(entries);

  // ── 3. Navegar seção a seção da Composition ────────────────────────
  if (!composition.section || !Array.isArray(composition.section)) {
    return result;
  }

  for (const section of composition.section) {
    const sectionCode = getSectionCode(section);
    if (!sectionCode) continue;

    // Seção sem entries (vazia ou com emptyReason) — pular
    if (!section.entry || section.entry.length === 0) continue;

    result.metadata.sectionsProcessed++;

    // ── 3a. Seções de Diagnósticos (Condition) ─────────────────────
    if (CONDITION_SECTION_CODES.has(sectionCode)) {
      for (const entryRef of section.entry) {
        const ref = entryRef.reference;
        if (!ref) continue;

        const resource = resourceIndex.get(ref) as FhirCondition | undefined;
        if (!resource || resource.resourceType !== 'Condition') continue;

        // Filtra apenas diagnósticos com status clínico ativo/em recorrência
        const clinicalStatus = extractClinicalStatus(resource.clinicalStatus);
        const activeStatuses = new Set(['active', 'recurrence', 'relapse']);
        if (!activeStatuses.has(clinicalStatus)) continue;

        const { code, system, display } = extractPrimaryCoding(resource.code);
        if (!code) continue;

        result.conditions.push({
          code,
          system,
          display,
          clinicalStatus,
          recordedDate: resource.recordedDate,
        });
        result.metadata.totalResourcesExtracted++;
      }
    }

    // ── 3b. Seções de Alergias (AllergyIntolerance) ───────────────
    if (ALLERGY_SECTION_CODES.has(sectionCode)) {
      for (const entryRef of section.entry) {
        const ref = entryRef.reference;
        if (!ref) continue;

        const resource = resourceIndex.get(ref) as FhirAllergyIntolerance | undefined;
        if (!resource || resource.resourceType !== 'AllergyIntolerance') continue;

        // Filtra apenas alergias confirmadas ou com clinicalStatus ativo
        const clinicalStatus = extractClinicalStatus(resource.clinicalStatus);
        if (clinicalStatus !== 'active') continue;

        const { code, display } = extractPrimaryCoding(resource.code);
        if (!code) continue;

        result.allergies.push({
          code,
          display,
          criticality: resource.criticality ?? 'unable-to-assess',
          category: resource.category?.[0],
          recordedDate: resource.recordedDate,
        });
        result.metadata.totalResourcesExtracted++;
      }
    }

    // ── 3c. Seções de Medicamentos (MedicationRequest) ────────────
    if (MEDICATION_SECTION_CODES.has(sectionCode)) {
      for (const entryRef of section.entry) {
        const ref = entryRef.reference;
        if (!ref) continue;

        const resource = resourceIndex.get(ref) as FhirMedicationRequest | undefined;
        if (!resource || resource.resourceType !== 'MedicationRequest') continue;

        // Filtra apenas prescrições ativas ou em espera
        const activeStatuses = new Set(['active', 'on-hold']);
        if (!activeStatuses.has(resource.status)) continue;

        const { code, display } = extractPrimaryCoding(resource.medicationCodeableConcept);
        if (!code) continue;

        result.medications.push({
          code,
          display,
          status: resource.status,
          dosageInstruction: resource.dosageInstruction?.[0]?.text,
          authoredOn: resource.authoredOn,
        });
        result.metadata.totalResourcesExtracted++;
      }
    }
  }

  return result;
}

/**
 * Processa múltiplos Bundles em sequência e consolida o resultado
 * em um único ClinicalBaseline mesclado e deduplicado.
 *
 * Útil quando `RndsReaderService.fetchPatientClinicalHistory()` retorna
 * múltiplos DocumentReferences resolvidos — cada um é um Bundle independente.
 *
 * A deduplicação usa o código primário do recurso como chave:
 * - Conditions: deduplicadas por `code` (CID-10/CIAP-2)
 * - Allergies: deduplicadas por `code` (SNOMED-CT)
 * - Medications: deduplicadas por `code` (CATMAT/BRMedicamento)
 *
 * Quando há duplicata, mantém-se o registro com a data mais recente.
 *
 * @param bundles Array de Bundles FHIR do tipo `document`
 * @returns Baseline clínico unificado e deduplicado
 */
export function mergeMultipleBundles(bundles: any[]): ClinicalBaseline {
  const merged: ClinicalBaseline = {
    conditions: [],
    allergies: [],
    medications: [],
    metadata: {
      sectionsProcessed: 0,
      totalResourcesExtracted: 0,
    },
  };

  // Mapas de deduplicação por código
  const conditionMap = new Map<string, ParsedCondition>();
  const allergyMap = new Map<string, ParsedAllergy>();
  const medicationMap = new Map<string, ParsedMedication>();

  for (const bundle of bundles) {
    const baseline = toClinicalBaseline(bundle);

    merged.metadata.sectionsProcessed += baseline.metadata.sectionsProcessed;

    // Merge Conditions com deduplicação por código
    for (const cond of baseline.conditions) {
      const existing = conditionMap.get(cond.code);
      if (!existing || isMoreRecent(cond.recordedDate, existing.recordedDate)) {
        conditionMap.set(cond.code, cond);
      }
    }

    // Merge Allergies com deduplicação por código
    for (const allergy of baseline.allergies) {
      const existing = allergyMap.get(allergy.code);
      if (!existing || isMoreRecent(allergy.recordedDate, existing.recordedDate)) {
        allergyMap.set(allergy.code, allergy);
      }
    }

    // Merge Medications com deduplicação por código
    for (const med of baseline.medications) {
      const existing = medicationMap.get(med.code);
      if (!existing || isMoreRecent(med.authoredOn, existing.authoredOn)) {
        medicationMap.set(med.code, med);
      }
    }
  }

  merged.conditions = Array.from(conditionMap.values());
  merged.allergies = Array.from(allergyMap.values());
  merged.medications = Array.from(medicationMap.values());
  merged.metadata.totalResourcesExtracted =
    merged.conditions.length + merged.allergies.length + merged.medications.length;

  return merged;
}

/**
 * Compara duas datas ISO opcionais. Retorna true se `a` é mais recente que `b`.
 */
function isMoreRecent(a?: string, b?: string): boolean {
  if (!a) return false;
  if (!b) return true;
  return new Date(a).getTime() > new Date(b).getTime();
}
