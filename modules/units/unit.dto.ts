import { z } from 'zod';

export const UNIT_TYPES = ['HEALTH', 'SOCIAL', 'LEGAL', 'EDUCATION'] as const;

export const createUnitSchema = z.object({
  name: z.string().min(2, 'Nome da unidade deve ter ao menos 2 caracteres').max(255),
  type: z.enum(UNIT_TYPES),
  fullAddress: z.string().max(500).optional().nullable().or(z.literal('')),
  lat: z.coerce.number().optional().nullable(),
  lon: z.coerce.number().optional().nullable(),
  phone: z.string().max(50).optional().nullable().or(z.literal('')),
});

export const updateUnitSchema = createUnitSchema.partial().extend({
  id: z.string().uuid('ID de unidade inválido'),
});

export type CreateUnitInput = z.infer<typeof createUnitSchema>;
export type UpdateUnitInput = z.infer<typeof updateUnitSchema>;

export type UnitDto = {
  id: string;
  name: string;
  type: (typeof UNIT_TYPES)[number];
  fullAddress: string | null;
  lat: number | null;
  lon: number | null;
  phone: string | null;
  createdAt: string;
  updatedAt: string;
};
