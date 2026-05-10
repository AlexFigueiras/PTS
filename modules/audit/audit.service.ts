import { BaseService } from '@/services/base.service';
import { AuditLogRepository } from '@/repositories/audit-log.repository';
import { toAuditLogDto } from './audit.mapper';
import { recordAuditInputSchema, type AuditLogDto, type RecordAuditInput } from './audit.dto';

export class AuditService extends BaseService {
  private readonly repo = new AuditLogRepository(this.ctx);

  async record(input: RecordAuditInput): Promise<void> {
    const parsed = recordAuditInputSchema.parse(input);
    await this.repo.create({
      userId: this.ctx.userId,
      action: parsed.action,
      entityType: parsed.entityType,
      entityId: parsed.entityId ?? null,
      metadata: parsed.metadata ?? null,
      ipAddress: parsed.ipAddress ?? null,
      userAgent: parsed.userAgent ?? null,
    });
  }

  async listByEntity(entityType: string, entityId: string, limit = 50): Promise<AuditLogDto[]> {
    const rows = await this.repo.listByEntity(entityType, entityId, limit);
    return rows.map(toAuditLogDto);
  }
}
