import { z } from 'zod';

export const auditActionSchema = z.enum([
  'create',
  'update',
  'delete',
  'view',
  'login',
  'logout',
  'export',
  'upload',
]);

export type AuditAction = z.infer<typeof auditActionSchema>;

export const recordAuditInputSchema = z.object({
  action: auditActionSchema,
  entityType: z.string().min(1).max(64),
  entityId: z.string().min(1).max(128).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  ipAddress: z.string().optional(),
  userAgent: z.string().optional(),
});

export type RecordAuditInput = z.infer<typeof recordAuditInputSchema>;

/** DTO seguro para devolver à UI — nunca expor IPs/UA crus em listagens. */
export type AuditLogDto = {
  id: string;
  action: AuditAction;
  entityType: string;
  entityId: string | null;
  userId: string | null;
  createdAt: string;
  metadata: Record<string, unknown> | null;
};
