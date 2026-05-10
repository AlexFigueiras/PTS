import type { AuditLog } from '@/lib/db/schema';
import type { AuditAction, AuditLogDto } from './audit.dto';

export function toAuditLogDto(row: AuditLog): AuditLogDto {
  return {
    id: row.id,
    action: row.action as AuditAction,
    entityType: row.entityType,
    entityId: row.entityId,
    userId: row.userId,
    createdAt: row.createdAt.toISOString(),
    metadata: row.metadata,
  };
}
