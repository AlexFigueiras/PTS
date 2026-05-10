import { z } from 'zod';

export const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/pdf',
] as const;

/** Tamanho máximo por arquivo: 10 MB. */
export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

export const presignedUrlRequestSchema = z.object({
  tenantId: z.string().uuid('tenantId deve ser um UUID válido'),
  filename: z.string().min(1).max(255),
  mimeType: z.enum(ALLOWED_MIME_TYPES, {
    error: `Tipo de arquivo não permitido. Permitidos: ${ALLOWED_MIME_TYPES.join(', ')}`,
  }),
  size: z
    .number()
    .int()
    .positive()
    .max(MAX_FILE_SIZE_BYTES, `Arquivo excede o limite de ${MAX_FILE_SIZE_BYTES / 1024 / 1024} MB`),
  /** Contexto do upload: ex. "patients", "documents", "avatars". Usado na key S3. */
  entity: z
    .string()
    .min(1)
    .max(64)
    .regex(/^[a-z_]+$/, 'entity deve conter apenas letras minúsculas e underscores'),
});

export type PresignedUrlRequest = z.infer<typeof presignedUrlRequestSchema>;

export type PresignedUrlResponse = {
  uploadUrl: string;
  key: string;
  publicUrl: string;
  expiresAt: string; // ISO 8601
};
