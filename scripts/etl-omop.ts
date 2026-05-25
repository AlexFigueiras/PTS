import { getDb } from '../lib/db/client';
import { ptsResponses, patients } from '../lib/db/schema';
import { eq } from 'drizzle-orm';

// OMOP CDM v6.0 Relational Target Schema Simulators
interface PersonOMOP {
  person_id: string;
  gender_concept_id: number;
  year_of_birth: number;
  month_of_birth: number;
  day_of_birth: number;
  birth_datetime: string;
  race_concept_id: number;
  ethnicity_concept_id: number;
  location_id: string | null;
  provider_id: string | null;
  care_site_id: string | null;
  person_source_value: string;
  gender_source_value: string;
  race_source_value: string;
  ethnicity_source_value: string;
}

interface ConditionOccurrenceOMOP {
  condition_occurrence_id: string;
  person_id: string;
  condition_concept_id: number; // SNOMED-CT Code
  condition_start_date: string;
  condition_start_datetime: string;
  condition_end_date: string | null;
  condition_type_concept_id: number;
  stop_reason: string | null;
  provider_id: string | null;
  visit_occurrence_id: string | null;
  condition_source_value: string;
  condition_source_concept_id: number;
}

interface SurveyConductOMOP {
  survey_conduct_id: string;
  person_id: string;
  survey_concept_id: number; // LOINC Code
  survey_start_date: string;
  survey_start_datetime: string;
  survey_end_date: string;
  survey_source_value: string;
}

// Usagi Semantic Vocabulary Mapping Simulator (Similarity >= 0.80)
const USAGI_SIMULATOR = [
  {
    term: 'fome',
    conceptId: 435222003, // SNOMED code for Food Insecurity
    display: 'Insegurança Alimentar / Privação de Alimento',
    score: 0.94
  },
  {
    term: 'rua',
    conceptId: 313182003, // SNOMED code for Homelessness
    display: 'Situação de Rua (Pessoa sem moradia)',
    score: 0.96
  },
  {
    term: 'depressao',
    conceptId: 35489007, // SNOMED code for Depressive Disorder
    display: 'Transtorno Depressivo',
    score: 0.91
  },
  {
    term: 'ansiedade',
    conceptId: 197480006, // SNOMED code for Anxiety Disorder
    display: 'Transtorno de Ansiedade',
    score: 0.89
  },
  {
    term: 'drogas',
    conceptId: 228365005, // SNOMED code for Drug Abuse
    display: 'Transtorno por Uso de Substâncias',
    score: 0.85
  },
  {
    term: 'violencia',
    conceptId: 443926002, // SNOMED code for Exposure to Violence
    display: 'Exposição a Abuso ou Violência Doméstica',
    score: 0.88
  }
];

function runUsagiSemanticMapping(text: string): { conceptId: number; display: string; score: number; termMatched: string }[] {
  const matches: { conceptId: number; display: string; score: number; termMatched: string }[] = [];
  const normalized = text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

  USAGI_SIMULATOR.forEach((vocab) => {
    if (normalized.includes(vocab.term)) {
      matches.push({
        conceptId: vocab.conceptId,
        display: vocab.display,
        score: vocab.score,
        termMatched: vocab.term
      });
    }
  });

  return matches;
}

export async function runEtlPipeline() {
  console.log('================================================================');
  console.log('🤖 OMOP CDM v6.0 ETL PIPELINE - INICIALIZANDO...');
  console.log('================================================================');

  const db = getDb();
  
  // 1. Fetch patients & their latest PTS responses
  console.log('📥 Coletando dados transacionais da base...');
  const responses = await db.select().from(ptsResponses);
  console.log(`📋 Total de PTS cadastrados encontrados: ${responses.length}`);

  const mappedPersons: PersonOMOP[] = [];
  const mappedConditions: ConditionOccurrenceOMOP[] = [];
  const mappedSurveys: SurveyConductOMOP[] = [];

  for (const resp of responses) {
    const [patient] = await db
      .select()
      .from(patients)
      .where(eq(patients.id, resp.patientId))
      .limit(1);

    if (!patient) continue;

    console.log(`\n👤 Processando Cidadão: ${patient.fullName}`);

    // Map to PERSON table (OMOP CDM v6.0 structure)
    const birthDate = patient.birthDate ? new Date(patient.birthDate) : new Date(1980, 0, 1);
    const person: PersonOMOP = {
      person_id: patient.id,
      gender_concept_id: patient.gender === 'feminino' ? 8532 : 8507, // Standard OMOP gender concepts
      year_of_birth: birthDate.getFullYear(),
      month_of_birth: birthDate.getMonth() + 1,
      day_of_birth: birthDate.getDate(),
      birth_datetime: birthDate.toISOString(),
      race_concept_id: 8527, // Concept standard for Mixed/Other
      ethnicity_concept_id: 38003563, // Hispanic or Latino standard
      location_id: patient.fullAddress ?? null,
      provider_id: resp.professionalId ?? null,
      care_site_id: resp.unitId ?? null,
      person_source_value: patient.cpf ?? 'SEM_CPF',
      gender_source_value: patient.gender ?? 'outro',
      race_source_value: 'Parda/Mista',
      ethnicity_source_value: 'Latino-americano'
    };
    mappedPersons.push(person);
    console.log(`   └─ ✅ OMOP Tabela [PERSON] gerada com sucesso!`);

    // Map to SURVEY_CONDUCT (Questionnaires and Screenings)
    const survey: SurveyConductOMOP = {
      survey_conduct_id: `survey-${resp.id}`,
      person_id: patient.id,
      survey_concept_id: 88124, // LOINC standard index code for SDoH panel
      survey_start_date: resp.createdAt.toISOString().split('T')[0],
      survey_start_datetime: resp.createdAt.toISOString(),
      survey_end_date: resp.updatedAt.toISOString().split('T')[0],
      survey_source_value: 'PTS Baseline Questionnaire'
    };
    mappedSurveys.push(survey);
    console.log(`   └─ ✅ OMOP Tabela [SURVEY_CONDUCT] criada.`);

    // Perform semantic text mapping (USAGI Simulator) on Complaint Text
    const complaintText = ((resp.data as Record<string, unknown>) || {}).q1MainComplaint as string | undefined;
    if (complaintText) {
      console.log(`   🔍 Analisando Queixa Principal via Usagi Semantic Mapping...`);
      const matches = runUsagiSemanticMapping(complaintText);
      matches.forEach((m, idx) => {
        console.log(`      ✨ MATCH Vocabulário Encontrado: "${m.termMatched}" -> Concept ID: ${m.conceptId} (${m.display}) [Score: ${m.score}]`);
        
        const cond: ConditionOccurrenceOMOP = {
          condition_occurrence_id: `cond-${resp.id}-${idx}`,
          person_id: patient.id,
          condition_concept_id: m.conceptId,
          condition_start_date: resp.createdAt.toISOString().split('T')[0],
          condition_start_datetime: resp.createdAt.toISOString(),
          condition_end_date: null,
          condition_type_concept_id: 32020, // EHR Diagnosis standard concept
          stop_reason: null,
          provider_id: resp.professionalId ?? null,
          visit_occurrence_id: null,
          condition_source_value: m.termMatched,
          condition_source_concept_id: 0
        };
        mappedConditions.push(cond);
      });
      if (matches.length > 0) {
        console.log(`   └─ ✅ OMOP Tabela [CONDITION_OCCURRENCE] populada com ${matches.length} condições.`);
      }
    }
  }

  console.log('\n================================================================');
  console.log('📊 RESUMO DO ETL OMOP CDM v6.0');
  console.log(`  - Mapeamento PERSON: ${mappedPersons.length} registros`);
  console.log(`  - Mapeamento SURVEY_CONDUCT: ${mappedSurveys.length} registros`);
  console.log(`  - Mapeamento CONDITION_OCCURRENCE: ${mappedConditions.length} registros`);
  console.log('🎉 PIPELINE DE INTEGRAÇÃO ANALÍTICA CONCLUÍDO COM SUCESSO!');
  console.log('================================================================');
}

// Se executado diretamente
if (require.main === module) {
  runEtlPipeline().catch(console.error);
}
