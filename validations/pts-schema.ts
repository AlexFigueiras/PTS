import { z } from 'zod';

export const ptsSchema = z.object({
  // Admissão / Demographics
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
  cad: z.string().optional(),
  susCard: z.string().optional(),
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
  mainCid: z.string().optional(),
  associatedCid: z.string().optional(),
  email: z.string().email('E-mail inválido').or(z.literal('')),
  origin: z.string().optional(),
  destination: z.string().optional(),

  // Objetivos e Intervenções
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

  // Triagem (Anamnese)
  q1MainComplaint: z.string().min(1, 'Queixa principal é obrigatória'),
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

  // Enfermagem
  nuWeight: z.string().optional(),
  nuHeight: z.string().optional(),
  nuBloodPressure: z.string().optional(),
  nuOxygenSaturation: z.string().optional(),
  nuChronicDisease: z.string().optional(),
  nuChronicDiseaseDetails: z.string().optional(),
  nuContinuousMedication: z.string().optional(),
  nuContinuousMedicationDetails: z.string().optional(),
  nuAllergy: z.string().optional(),
  nuAllergyDetails: z.string().optional(),
  nuVaccinationStatus: z.string().optional(),
  nuPainLevel: z.string().optional(),
  nuPainDetails: z.string().optional(),

  // Psicologia
  psPreviousPsychAccount: z.string().optional(),
  psPreviousPsychDetails: z.string().optional(),
  psCurrentTreatment: z.string().optional(),
  psSelfHarmThoughts: z.string().optional(),
  psSelfHarmDetails: z.string().optional(),
  psSleepDifficulty: z.string().optional(),
  psAnxietySadness: z.string().optional(),
  psDistressingMemories: z.string().optional(),
  psDistressingMemoriesDetails: z.string().optional(),

  // Terapia Ocupacional
  toDailyIndependence: z.string().optional(),
  toCognitiveDifficulty: z.string().optional(),
  toLaborActivity: z.string().optional(),
  toLaborActivityDetails: z.string().optional(),
  toLeisureActivity: z.string().optional(),
  toLeisureActivityDetails: z.string().optional(),

  // Serviço Social
  ssLivesWithOthers: z.string().optional(),
  ssLivesWithDetails: z.string().optional(),
  ssSocialBenefits: z.string().optional(),
  ssSocialBenefitsDetails: z.string().optional(),
  ssHealthAccess: z.string().optional(),
  ssHealthAccessDetails: z.string().optional(),

  // Educação Física
  efRegularPractice: z.string().optional(),
  efPhysicalLimitation: z.string().optional(),
  efPhysicalLimitationDetails: z.string().optional(),
  efPleasurableActivity: z.string().optional(),
  efPleasurableActivityDetails: z.string().optional(),

  // Nutrição
  ntDietType: z.string().optional(),
  ntWaterIntake: z.string().optional(),

  // Intelligence Engine Fields (Scores)
  // Mapping of field name to score (0-4)
  scores: z.record(z.string(), z.number().min(0).max(4)).optional().default({}),
  
  // Final Dashboard Suggested Goals
  suggestedActions: z.array(z.object({
    id: z.string(),
    description: z.string(),
    status: z.enum(['pending', 'completed']),
  })).optional().default([]),

  // AI Decision Support Fields
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
