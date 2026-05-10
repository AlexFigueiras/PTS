import { z } from 'zod';
import { ALLOWED_MIME_TYPES } from '@/modules/storage';

export const createFileSchema = z.object({
  storageKey: z
    .string()
    .min(1)
    .max(512)
    .regex(/^uploads\/[^/]+\//, 'storageKey inválido'),
  originalName: z.string().min(1).max(255),
  mimeType: z.enum(ALLOWED_MIME_TYPES, {
    error: 'Tipo de arquivo não permitido',
  }),
  size: z.coerce.number().int().positive().max(10 * 1024 * 1024, 'Arquivo excede 10 MB'),
  entityType: z.string().min(1).max(64),
  entityId: z.string().uuid('entityId deve ser um UUID válido'),
});

export const fileFiltersSchema = z.object({
  entityType: z.string().min(1),
  entityId: z.string().uuid(),
});

export type CreateFileInput = z.infer<typeof createFileSchema>;
export type FileFilters = z.infer<typeof fileFiltersSchema>;

export type FileDto = {
  id: string;
  entityType: string;
  entityId: string;
  originalName: string;
  mimeType: string;
  size: number;
  publicUrl: string | null;
  uploadedBy: string;
  createdAt: string;
};
