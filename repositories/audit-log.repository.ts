import { and, desc, eq } from 'drizzle-orm';
import { auditLogs, type NewAuditLog, type AuditLog } from '@/lib/db/schema';
import { BaseTenantRepository } from './base.repository';

export class AuditLogRepository extends BaseTenantRepository {
  async create(input: Omit<NewAuditLog, 'tenantId'>): Promise<AuditLog> {
    const [row] = await this.db
      .insert(auditLogs)
      .values({ ...input, tenantId: this.tenantId })
      .returning();
    return row;
  }

  async listByEntity(entityType: string, entityId: string, limit = 50): Promise<AuditLog[]> {
    return this.db
      .select()
      .from(auditLogs)
      .where(
        and(
          eq(auditLogs.tenantId, this.tenantId),
          eq(auditLogs.entityType, entityType),
          eq(auditLogs.entityId, entityId),
        ),
      )
      .orderBy(desc(auditLogs.createdAt))
      .limit(limit);
  }
}
