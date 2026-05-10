import { withAudit } from '@/lib/audit/with-audit';
import { requireRole } from '@/lib/auth/authorization';
import { BaseService } from '@/services/base.service';
import type { TenantContext } from '@/lib/tenant-context';
import { FileRepository } from './file.repository';

const deleteFileAudited = withAudit<string, void>(
  {
    action: 'delete',
    entityType: 'file',
    entityId: (fileId) => fileId,
    metadata: (fileId) => ({ fileId, physicalDeletion: false }),
  },
  async (ctx: TenantContext, fileId: string): Promise<void> => {
    requireRole(ctx, 'admin');
    const repo = new FileRepository(ctx);
    const deleted = await repo.softDelete(fileId);
    if (!deleted) throw new Error(`Arquivo ${fileId} não encontrado ou já removido`);
  },
);

export class DeleteFileService extends BaseService {
  async execute(fileId: string): Promise<void> {
    return deleteFileAudited(this.ctx, fileId);
  }
}
