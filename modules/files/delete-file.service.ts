import { withAudit } from '@/lib/audit/with-audit';
import { requireRole } from '@/lib/auth/authorization';
import { BaseService } from '@/services/base.service';
import type { TenantContext } from '@/lib/tenant-context';
import { FileRepository } from './file.repository';
import { withTransactionContext } from '@/lib/db/client';

const deleteFileAudited = withAudit<string, void>(
  {
    action: 'delete',
    entityType: 'file',
    entityId: (fileId) => fileId,
    metadata: (fileId) => ({ fileId, physicalDeletion: false }),
  },
  async (ctx: TenantContext, fileId: string): Promise<void> => {
    requireRole(ctx, 'MANAGER');
    return await withTransactionContext(ctx.userId, ctx.tenantId, async (tx) => {
      const txCtx = { ...ctx, tx };
      const repo = new FileRepository(txCtx);
      const deleted = await repo.softDelete(fileId);
      if (!deleted) throw new Error(`Arquivo ${fileId} não encontrado ou já removido`);
    });
  },
);

export class DeleteFileService extends BaseService {
  async execute(fileId: string): Promise<void> {
    return deleteFileAudited(this.ctx, fileId);
  }
}
