import { withAudit } from '@/lib/audit/with-audit';
import { requireRole } from '@/lib/auth/authorization';
import { BaseService } from '@/services/base.service';
import type { TenantContext } from '@/lib/tenant-context';
import { RecordRepository } from './record.repository';

const deleteRecordAudited = withAudit<string, void>(
  {
    action: 'delete',
    entityType: 'clinical_record',
    entityId: (id) => id,
    metadata: (id) => ({ recordId: id, physicalDeletion: false }),
  },
  async (ctx: TenantContext, id: string): Promise<void> => {
    requireRole(ctx, 'admin');
    const repo = new RecordRepository(ctx);

    const existing = await repo.findById(id);
    if (!existing) throw new Error(`Registro ${id} não encontrado`);
    if (existing.status === 'finalized') throw new Error('Registros finalizados não podem ser excluídos');

    const deleted = await repo.softDelete(id);
    if (!deleted) throw new Error(`Falha ao excluir registro ${id}`);
  },
);

export class DeleteRecordService extends BaseService {
  async execute(id: string): Promise<void> {
    return deleteRecordAudited(this.ctx, id);
  }
}
