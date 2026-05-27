import { z } from 'zod';

export const pullSyncInputSchema = z.object({
  /**
   * Timestamp do último sincronismo bem-sucedido no dispositivo cliente (ISO string).
   * Se for null ou undefined, representa a primeira carga completa.
   */
  lastPulledAt: z.string().datetime().nullable().optional(),
  /**
   * Filtro opcional por paciente, permitindo sincronizar de forma cirúrgica na busca ativa.
   */
  patientId: z.string().uuid().optional(),
});

export type PullSyncInput = z.infer<typeof pullSyncInputSchema>;

/**
 * Validador para registros sincronizados. Cada registro deve se autoidentificar
 * através do 'entityType' (task ou evolution), carregar seu ID canônico (UUIDv4)
 * e o ID do cidadão a quem se vincula.
 */
export const syncRecordSchema = z.object({
  entityType: z.enum(['task', 'evolution']),
  id: z.string().uuid('ID do registro deve ser um UUIDv4 válido'),
  patientId: z.string().uuid('ID do cidadão deve ser um UUIDv4 válido'),
}).passthrough();

export type SyncRecord = z.infer<typeof syncRecordSchema>;

/**
 * Lote estruturado de alterações ocorridas offline em dispositivos de campo.
 */
export const pushSyncInputSchema = z.object({
  /**
   * Novos registros gerados offline no dispositivo cliente.
   */
  created: z.array(syncRecordSchema).default([]),
  /**
   * Registros alterados offline no dispositivo cliente.
   */
  updated: z.array(syncRecordSchema).default([]),
  /**
   * IDs de registros deletados offline.
   */
  deleted: z.array(z.string().uuid('ID deletado deve ser um UUIDv4 válido')).default([]),
  /**
   * Timestamp do último sincronismo bem-sucedido antes de gerar as mutações offline (detecção de concorrência).
   */
  lastPulledAt: z.string().datetime().optional().nullable(),
});

export type PushSyncInput = z.infer<typeof pushSyncInputSchema>;
