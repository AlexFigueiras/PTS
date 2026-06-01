import { requireRole } from '@/lib/auth/authorization';
import { BaseService } from '@/services/base.service';
import { FileRepository } from './file.repository';
import { toFileDto } from './file.mapper';
import type { FileDto } from './file.dto';
import { withTransactionContext } from '@/lib/db/client';

export class ListFilesService extends BaseService {
  async execute(entityType: string, entityId: string): Promise<FileDto[]> {
    requireRole(this.ctx, 'PROFESSIONAL');
    return await withTransactionContext(this.ctx.userId, this.ctx.tenantId, async (tx) => {
      const txCtx = { ...this.ctx, tx };
      const repo = new FileRepository(txCtx);
      const rows = await repo.listByEntity(entityType, entityId);
      return rows.map(toFileDto);
    });
  }
}
