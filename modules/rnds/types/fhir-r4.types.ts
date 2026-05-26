/**
 * Definições de tipo estritas para os recursos HL7 FHIR R4 exigidos pela RNDS para o envio do
 * Registro de Atendimento Clínico (RAC).
 */

export interface FhirMeta {
  lastUpdated?: string;
  profile?: string[];
}

export interface FhirCoding {
  system: string;
  code: string;
  display?: string;
}

export interface FhirCodeableConcept {
  coding?: FhirCoding[];
  text?: string;
}

export interface FhirIdentifier {
  use?: 'usual' | 'official' | 'temp' | 'secondary' | 'old';
  type?: FhirCodeableConcept;
  system: string;
  value: string;
}

export interface FhirExtension {
  url: string;
  valueString?: string;
  valueCode?: string;
  valueDate?: string;
  valuePositiveInt?: number;
  valueDecimal?: number;
  valueBoolean?: boolean;
  valueCodeableConcept?: FhirCodeableConcept;
  extension?: FhirExtension[];
}

export interface FhirReference {
  reference?: string;
  type?: string;
  identifier?: FhirIdentifier;
  display?: string;
}

export interface FhirPeriod {
  start: string;
  end?: string;
}

export interface FhirQuantity {
  value: number;
  comparator?: '<' | '<=' | '>=' | '>';
  unit: string;
  system?: string; // Tornado opcional para suportar embalagens comerciais não catalogadas no UCUM
  code?: string;   // Tornado opcional para suportar embalagens comerciais não catalogadas no UCUM
}

// ── 1. Patient Resource (BRIndividuo) ──────────────────────────────────
export interface FhirPatient {
  resourceType: 'Patient';
  id?: string;
  meta?: FhirMeta;
  extension?: FhirExtension[];
  identifier: FhirIdentifier[];
  active: boolean;
  name: {
    use?: string;
    text?: string;
    family: string;
    given: string[];
    prefix?: string[];
  }[];
  gender: 'male' | 'female' | 'other' | 'unknown';
  birthDate: string; // YYYY-MM-DD
  address?: {
    use: 'home' | 'work' | 'temp' | 'old' | 'billing';
    type: 'postal' | 'physical' | 'both';
    line: string[];
    city: string;
    state: string;
    postalCode: string;
    country?: string;
  }[];
}

// ── 2. Encounter Resource (BRContatoAssistencial) ──────────────────────
export interface FhirEncounter {
  resourceType: 'Encounter';
  id?: string;
  meta?: FhirMeta;
  status: 'finished' | 'entered-in-error';
  class: FhirCoding; // Modalidade Assistencial
  priority: FhirCodeableConcept; // Caráter do Atendimento
  subject: FhirReference;
  participant: {
    type?: FhirCodeableConcept[];
    individual: FhirReference;
    extension?: FhirExtension[]; // CBO Ocupação vai aqui no participante
  }[];
  period: FhirPeriod;
  serviceProvider: FhirReference; // CNES do estabelecimento
}

// ── 3. Condition Resource (BRProblemaDiagnostico) ─────────────────────
export interface FhirCondition {
  resourceType: 'Condition';
  id?: string;
  meta?: FhirMeta;
  clinicalStatus?: FhirCodeableConcept;
  verificationStatus?: FhirCodeableConcept;
  category: FhirCodeableConcept[];
  code: FhirCodeableConcept; // CID-10 ou CIAP-2
  subject: FhirReference;
  encounter: FhirReference;
  recordedDate?: string;
  asserter?: FhirReference;
}

// ── 4. Observation Resource (BRSinalVital/Antropometria) ──────────────
export interface FhirObservation {
  resourceType: 'Observation';
  id?: string;
  meta?: FhirMeta;
  status: 'registered' | 'preliminary' | 'final' | 'amended';
  category: FhirCodeableConcept[];
  code: FhirCodeableConcept; // Tipo de aferição (LOINC, SNOMED)
  subject: FhirReference;
  encounter: FhirReference;
  effectiveDateTime: string;
  valueQuantity?: FhirQuantity;
  valueString?: string;
  bodySite?: FhirCodeableConcept;
}

// ── 5. AllergyIntolerance Resource (BRAlergiaReacaoAdversa) ───────────
export interface FhirAllergyIntolerance {
  resourceType: 'AllergyIntolerance';
  id?: string;
  meta?: FhirMeta;
  clinicalStatus?: FhirCodeableConcept;
  verificationStatus?: FhirCodeableConcept;
  type?: 'allergy' | 'intolerance';
  category?: ('food' | 'medication' | 'environment' | 'biologic')[];
  criticality?: 'low' | 'high' | 'unable-to-assess';
  code: FhirCodeableConcept; // Alérgeno
  patient: FhirReference;
  recordedDate?: string;
}

// ── 6. MedicationRequest Resource (BRPrescricaoMedicamento) ───────────
export interface FhirMedicationRequest {
  resourceType: 'MedicationRequest';
  id?: string;
  meta?: FhirMeta;
  status: 'active' | 'on-hold' | 'cancelled' | 'completed' | 'entered-in-error' | 'stopped' | 'draft' | 'unknown';
  intent: 'proposal' | 'plan' | 'order' | 'original-order' | 'reflex-order' | 'filler-order' | 'instance-order' | 'option';
  medicationCodeableConcept: FhirCodeableConcept;
  subject: FhirReference;
  encounter: FhirReference;
  authoredOn: string;
  requester?: FhirReference;
  dosageInstruction?: {
    text?: string;
    patientInstruction?: string;
    timing?: {
      text?: string;
    };
  }[];
  dispenseRequest?: {
    quantity?: FhirQuantity;
  };
}

// ── 7. Composition Resource (BRRegistroAtendimentoClinico) ────────────
export interface FhirCompositionSection {
  title: string;
  code: FhirCodeableConcept;
  entry: FhirReference[];
  emptyReason?: FhirCodeableConcept;
}

export interface FhirComposition {
  resourceType: 'Composition';
  id?: string;
  meta?: FhirMeta;
  status: 'final' | 'entered-in-error';
  type: FhirCodeableConcept; // Fixo no código "RAC"
  category?: FhirCodeableConcept[]; // Modalidade Assistencial
  subject: FhirReference;
  encounter?: FhirReference;
  date: string;
  author: FhirReference[];
  title: string;
  attester?: {
    mode: 'personal' | 'professional' | 'legal' | 'official';
    party?: FhirReference;
  }[];
  relatesTo?: {
    code: 'replaces' | 'transforms' | 'signs' | 'appends';
    targetReference: FhirReference;
  }[];
  section: FhirCompositionSection[];
}

// ── 8. Bundle Resource (Raiz do documento enviado à RNDS) ─────────────
export interface FhirBundleEntry {
  fullUrl: string;
  resource:
    | FhirComposition
    | FhirPatient
    | FhirEncounter
    | FhirCondition
    | FhirObservation
    | FhirAllergyIntolerance
    | FhirMedicationRequest;
}

export interface FhirBundle {
  resourceType: 'Bundle';
  id?: string;
  meta?: {
    lastUpdated?: string;
  };
  type: 'document';
  entry: FhirBundleEntry[];
}
