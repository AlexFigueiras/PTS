import { z } from 'zod';

export const PATIENT_STATUS = ['active', 'inactive'] as const;
export const PATIENT_GENDER = ['masculino', 'feminino', 'nao_binario', 'outro'] as const;

export const createPatientSchema = z.object({
  fullName: z.string().min(2, 'Nome completo deve ter ao menos 2 caracteres').max(255),
  preferredName: z.string().max(100).optional().nullable(),
  birthDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Data deve estar no formato AAAA-MM-DD')
    .optional()
    .nullable(),
  gender: z.enum(PATIENT_GENDER).optional().nullable(),
  cpf: z
    .string()
    .regex(/^\d{3}\.\d{3}\.\d{3}-\d{2}$/, 'CPF inválido (formato: 000.000.000-00)')
    .optional()
    .nullable(),
  phone: z.string().max(20).optional().nullable(),
  email: z.string().email('E-mail inválido').optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
  status: z.enum(PATIENT_STATUS).default('active'),
});

export const updatePatientSchema = createPatientSchema.partial().extend({
  id: z.string().uuid('ID inválido'),
});

export const patientFiltersSchema = z.object({
  search: z.string().optional(),
  status: z.enum(PATIENT_STATUS).optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
});

export type CreatePatientInput = z.infer<typeof createPatientSchema>;
export type UpdatePatientInput = z.infer<typeof updatePatientSchema>;
export type PatientFilters = z.infer<typeof patientFiltersSchema>;

export type PatientDto = {
  id: string;
  fullName: string;
  preferredName: string | null;
  socialName: string | null;
  birthDate: string | null;
  gender: string | null;
  cpf: string | null;
  phone: string | null;
  email: string | null;
  fullAddress: string | null;
  lat: number | null;
  lon: number | null;
  notes: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
};
