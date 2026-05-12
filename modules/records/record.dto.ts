import { z } from 'zod';

export const RECORD_TYPES = ['session_note', 'assessment', 'evolution'] as const;
export const RECORD_STATUSES = ['draft', 'finalized'] as const;

export type RecordType = (typeof RECORD_TYPES)[number];
export type RecordStatus = (typeof RECORD_STATUSES)[number];

export const RECORD_TYPE_LABELS: Record<RecordType, string> = {
  session_note: 'Nota de sessão',
  assessment: 'Avaliação',
  evolution: 'Evolução clínica',
};

export const RECORD_STATUS_LABELS: Record<RecordStatus, string> = {
  draft: 'Rascunho',
  finalized: 'Finalizado',
};

export const createRecordSchema = z.object({
  patientId: z.string().uuid('ID do paciente inválido'),
  type: z.enum(RECORD_TYPES).default('session_note'),
  title: z.string().max(255).optional().nullable(),
  content: z
    .string()
    .min(10, 'O registro deve ter ao menos 10 caracteres')
    .max(50_000, 'Conteúdo muito longo'),
  sessionDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data deve estar no formato AAAA-MM-DD'),
});

export const updateRecordSchema = z.object({
  id: z.string().uuid('ID inválido'),
  type: z.enum(RECORD_TYPES).optional(),
  title: z.string().max(255).optional().nullable(),
  content: z.string().min(10).max(50_000).optional(),
  sessionDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

export const recordFiltersSchema = z.object({
  patientId: z.string().uuid().optional(),
  type: z.enum(RECORD_TYPES).optional(),
  status: z.enum(RECORD_STATUSES).optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
});

export type CreateRecordInput = z.infer<typeof createRecordSchema>;
export type UpdateRecordInput = z.infer<typeof updateRecordSchema>;
export type RecordFilters = z.infer<typeof recordFiltersSchema>;

export type RecordDto = {
  id: string;
  patientId: string;
  professionalId: string;
  type: RecordType;
  title: string | null;
  content: string;
  sessionDate: string;
  status: RecordStatus;
  createdAt: string;
  updatedAt: string;
};
