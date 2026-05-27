import { z } from 'zod';

// ==========================================
// MÓDULO I: SDOH / Gravity Project / LOINC (Salvo no JSONB do PTS)
// ==========================================

export const LOINC_CATEGORY = [
  'sdoh-category-housing-instability',
  'sdoh-category-food-insecurity',
  'sdoh-category-transportation-insecurity',
  'sdoh-category-financial-strain',
  'sdoh-category-education',
  'sdoh-category-employment',
] as const;

export const loincCategoryEnum = z.enum(LOINC_CATEGORY);

/**
 * Representa uma observação individual de Determinante Social de Saúde (SDoH).
 * Segue o padrão estrito do FHIR v4 Observation, enriquecido com códigos LOINC e
 * formatado de forma limpa para mapeamento OMOP CDM (tabela OBSERVATION) sem polimorfismo.
 */
export const sdohObservationSchema = z.object({
  code: z.string().min(1, 'Código LOINC é obrigatório (ex: 88124-3)'),
  display: z.string().min(1, 'Display legível do LOINC é obrigatório'),
  category: loincCategoryEnum,
  status: z.enum(['preliminary', 'final', 'amended']).default('final'),
  
  // FHIR e OMOP CDM: campos de valor segregados por tipo para evitar tipagem polimórfica no JSONB
  // valueNumber substitui valueInteger para dar suporte a escores decimais e fracionários do OMOP value_as_number
  valueString: z.string().optional().nullable(),
  valueNumber: z.number().optional().nullable(),
  valueBoolean: z.boolean().optional().nullable(),

  issuedAt: z.string().datetime({ message: 'IssuedAt deve ser uma data ISO válida' }),
  performerId: z.string().uuid('ID do Profissional (performer) inválido'),
  notes: z.string().optional().nullable(),
});

/**
 * Extensão do payload JSONB (pts_responses.data) que armazena
 * as triagens estáticas de SDoH sem risco de race conditions.
 */
export const ptsPayloadExtensionSchema = z.object({
  sdohObservations: z.array(sdohObservationSchema).default([]),
});

export type LoincCategory = z.infer<typeof loincCategoryEnum>;
export type SdohObservationInput = z.infer<typeof sdohObservationSchema>;
export type PtsPayloadExtension = z.infer<typeof ptsPayloadExtensionSchema>;

// ==========================================
// MÓDULO III: Tarefas Intersetoriais (Salvas na Tabela Física)
// ==========================================

export const TASK_STATUS = [
  'requested',
  'accepted',
  'in-progress',
  'completed',
  'cancelled',
  'failed',
] as const;

export const TASK_INTENT = [
  'proposal',
  'plan',
  'order',
  'original-order',
] as const;

export const TASK_PRIORITY = [
  'routine',
  'urgent',
  'stat',
  'asap',
] as const;

export const taskStatusEnum = z.enum(TASK_STATUS);
export const taskIntentEnum = z.enum(TASK_INTENT);
export const taskPriorityEnum = z.enum(TASK_PRIORITY);

/**
 * Histórico de transições atômicas de estados da Task.
 * Mantém trilha de auditoria e conformidade técnica no loop fechado.
 */
export const taskHistoryEntrySchema = z.object({
  status: taskStatusEnum,
  changedAt: z.string().datetime({ message: 'changedAt deve ser uma data ISO válida' }),
  changedBy: z.string().uuid('ID do Profissional inválido'),
  notes: z.string().optional().nullable(),
});

/**
 * Schema de inserção de uma Tarefa Intersetorial (equivalente a NewIntersectoralTask).
 * Validado na entrada de dados de mutação/Server Actions.
 */
export const intersectoralTaskInsertSchema = z.object({
  tenantId: z.string().uuid('Tenant ID inválido'),
  patientId: z.string().uuid('Cidadão/Paciente ID inválido'),
  status: taskStatusEnum.default('requested'),
  intent: taskIntentEnum.default('order'),
  priority: taskPriorityEnum.default('routine'),
  description: z.string().min(3, 'Descrição deve ter ao menos 3 caracteres').max(2000),
  sourceUnitId: z.string().uuid('Unidade de origem inválida'),
  targetUnitId: z.string().uuid('Unidade de destino inválida'),
  requesterId: z.string().uuid('Profissional solicitante inválido'),
  ownerId: z.string().uuid().optional().nullable(),
  history: z.array(taskHistoryEntrySchema).default([]),
});

/**
 * Schema completo de leitura da Tarefa Intersetorial (equivalente a IntersectoralTask).
 * Utiliza z.date() para alinhar-se perfeitamente com os timestamps retornados pelo Drizzle ORM.
 */
export const intersectoralTaskSelectSchema = intersectoralTaskInsertSchema.extend({
  id: z.string().uuid('ID de tarefa inválido'),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type TaskStatus = z.infer<typeof taskStatusEnum>;
export type TaskIntent = z.infer<typeof taskIntentEnum>;
export type TaskPriority = z.infer<typeof taskPriorityEnum>;
export type TaskHistoryEntry = z.infer<typeof taskHistoryEntrySchema>;
export type IntersectoralTaskInsertInput = z.infer<typeof intersectoralTaskInsertSchema>;
export type IntersectoralTaskSelectOutput = z.infer<typeof intersectoralTaskSelectSchema>;
