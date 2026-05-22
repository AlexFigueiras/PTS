import { z } from 'zod';

/**
 * Schema do Plano Terapêutico Singular (PTS) Intersetorial.
 *
 * Avaliação multidomínio preenchível por qualquer profissional logado —
 * Saúde (CAPS/UBS), Assistência Social (CRAS/CREAS) ou Jurídico/Direitos.
 * Os campos clínicos de prontuário (sinais vitais, CID, triagem de enfermagem)
 * foram removidos: o foco é o ciclo do PTS, não o prontuário eletrônico.
 */
export const ptsSchema = z.object({
  // ── Cadastro / Identificação ──────────────────────────────────────────
  fullName: z.string().min(1, 'Nome completo é obrigatório'),
  socialName: z.string().optional(),
  phone: z.string().min(1, 'Telefone é obrigatório'),
  rg: z.string().optional(),
  cpf: z.string().min(1, 'CPF é obrigatório'),
  fatherName: z.string().optional(),
  motherName: z.string().optional(),
  responsible: z.string().optional(),
  birthDate: z.string().min(1, 'Data de nascimento é obrigatória'),
  gender: z.string().min(1, 'Gênero é obrigatório'),
  cad: z.string().optional(), // NIS / CadÚnico
  susCard: z.string().optional(), // CNS / Cartão SUS
  fullAddress: z.string().min(1, 'Endereço completo é obrigatório'),
  lat: z.number().nullable().optional(),
  lon: z.number().nullable().optional(),
  neighborhood: z.string().optional(),
  cep: z.string().optional(),
  streetSituation: z.string().optional(),
  nearestUbs: z.string().optional(),
  selfIdentification: z.string().optional(),
  profession: z.string().optional(),
  education: z.string().optional(),
  maritalStatus: z.string().optional(),
  email: z.string().email('E-mail inválido').or(z.literal('')),
  origin: z.string().optional(),
  destination: z.string().optional(),

  // ── Objetivos e Intervenções ──────────────────────────────────────────
  shortTermGoals: z.string().optional(),
  mediumTermGoals: z.string().optional(),
  longTermGoals: z.string().optional(),
  interventions: z.array(z.object({
    id: z.string(),
    description: z.string().min(1, 'Descrição é obrigatória'),
    service: z.string().min(1, 'Serviço é obrigatório'),
    status: z.enum(['pending', 'completed']),
    deadline: z.string().optional(),
    responsible: z.string().optional(),
  })).default([]),

  // ── Escuta Inicial (Anamnese) ─────────────────────────────────────────
  q1MainComplaint: z.string().min(1, 'Demanda principal é obrigatória'),
  q2Substances: z.array(z.string()).default([]),
  q3UsageTime: z.string().optional(),
  q4TriedToStop: z.string().optional(),
  q5StopMethods: z.array(z.string()).default([]),
  q6PreviousHospitalization: z.string().optional(),
  q6HospitalizationDetails: z.string().optional(),
  cCompulsion: z.boolean().default(false),
  cTolerance: z.boolean().default(false),
  cAbstinence: z.boolean().default(false),
  cRelief: z.boolean().default(false),
  cRelevance: z.boolean().default(false),
  q7AggravatingFactors: z.array(z.string()).default([]),
  q8RecoveryFactors: z.array(z.string()).default([]),
  q9DailyDifficulties: z.array(z.string()).default([]),
  q10SkillsInterests: z.array(z.string()).default([]),
  q11FixedHousing: z.string().optional(),
  q12FamilySupport: z.string().optional(),
  q13JusticeInvolvement: z.string().optional(),
  q14MentalHealthHistory: z.string().optional(),
  q15MotivationRating: z.string().optional(),

  // ── Domínio Psíquico ──────────────────────────────────────────────────
  psPreviousPsychAccount: z.string().optional(),
  psPreviousPsychDetails: z.string().optional(),
  psCurrentTreatment: z.string().optional(),
  psSelfHarmThoughts: z.string().optional(),
  psSelfHarmDetails: z.string().optional(),
  psSleepDifficulty: z.string().optional(),
  psAnxietySadness: z.string().optional(),
  psDistressingMemories: z.string().optional(),
  psDistressingMemoriesDetails: z.string().optional(),

  // ── Domínio Social / Renda ────────────────────────────────────────────
  ssLivesWithOthers: z.string().optional(),
  ssLivesWithDetails: z.string().optional(),
  ssSocialBenefits: z.string().optional(),
  ssSocialBenefitsDetails: z.string().optional(),
  ssHealthAccess: z.string().optional(),
  ssHealthAccessDetails: z.string().optional(),

  // ── Domínio Jurídico / Direitos ───────────────────────────────────────
  lgRightsViolation: z.string().optional(),
  lgRightsViolationDetails: z.string().optional(),
  lgLegalFollowUp: z.string().optional(),
  lgLegalFollowUpDetails: z.string().optional(),

  // ── Domínio Educação / Trabalho ───────────────────────────────────────
  edSchoolEnrollment: z.string().optional(),
  edSchoolEnrollmentDetails: z.string().optional(),
  edLaborActivity: z.string().optional(),
  edLaborActivityDetails: z.string().optional(),

  // ── Domínio Autonomia / Cotidiano ─────────────────────────────────────
  toDailyIndependence: z.string().optional(),
  toCognitiveDifficulty: z.string().optional(),
  toLeisureActivity: z.string().optional(),
  toLeisureActivityDetails: z.string().optional(),

  // ── Domínio Saúde (acesso e cuidado, não-clínico) ─────────────────────
  efRegularPractice: z.string().optional(),
  efPhysicalLimitation: z.string().optional(),
  efPhysicalLimitationDetails: z.string().optional(),
  efPleasurableActivity: z.string().optional(),
  ntDietType: z.string().optional(),
  ntWaterIntake: z.string().optional(),

  // ── Motor de Inteligência (Escores Multidomínio) ──────────────────────
  // Mapa nome-do-campo → escore (0-4). Qualquer profissional pontua.
  scores: z.record(z.string(), z.number().min(0).max(4)).optional().default({}),

  // Metas sugeridas no painel final
  suggestedActions: z.array(z.object({
    id: z.string(),
    description: z.string(),
    status: z.enum(['pending', 'completed']),
  })).optional().default([]),

  // ── Apoio à Decisão (IA) ──────────────────────────────────────────────
  vulnerabilityIndex: z.enum(['A', 'B', 'C', 'D', 'E']).optional(),
  aiSuggestions: z.array(z.object({
    actionId: z.string(),
    clinicalJustification: z.string(),
    approved: z.boolean().default(false),
  })).optional().default([]),
  aiPotentialities: z.array(z.string()).optional().default([]),
  aiFragilities: z.array(z.string()).optional().default([]),
  aiStrategicGoals: z.object({
    shortTerm: z.string().optional(),
    mediumTerm: z.string().optional(),
    longTerm: z.string().optional(),
  }).optional(),
});

export type PtsSchema = z.infer<typeof ptsSchema>;
