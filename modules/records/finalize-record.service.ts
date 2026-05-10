import { withAudit } from '@/lib/audit/with-audit';
import { requireRole } from '@/lib/auth/authorization';
import { BaseService } from '@/services/base.service';
import type { TenantContext } from '@/lib/tenant-context';
import { RecordRepository } from './record.repository';
import { toRecordDto } from './record.mapper';
import type { RecordDto } from './record.dto';

const finalizeRecordAudited = withAudit<string, RecordDto>(
  {
    action: 'finalize',
    entityType: 'clinical_record',
    entityId: (id) => id,
    metadata: (id) => ({ recordId: id }),
  },
  async (ctx: TenantContext, id: string): Promise<RecordDto> => {
    requireRole(ctx, 'professional');
    const repo = new RecordRepository(ctx);

    const existing = await repo.findById(id);
    if (!existing) throw new Error(`Registro ${id} não encontrado`);
    if (existing.status === 'finalized') throw new Error('Registro já está finalizado');

    const updated = await repo.update(id, { status: 'finalized' });
    if (!updated) throw new Error(`Falha ao finalizar registro ${id}`);
    return toRecordDto(updated);
  },
);

export class FinalizeRecordService extends BaseService {
  async execute(id: string): Promise<RecordDto> {
    return finalizeRecordAudited(this.ctx, id);
  }
}
