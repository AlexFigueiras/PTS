import { withAudit } from '@/lib/audit/with-audit';
import { requireRole } from '@/lib/auth/authorization';
import { BaseService } from '@/services/base.service';
import type { TenantContext } from '@/lib/tenant-context';
import { RecordRepository } from './record.repository';
import { toRecordDto } from './record.mapper';
import type { UpdateRecordInput, RecordDto } from './record.dto';

const updateRecordAudited = withAudit<UpdateRecordInput, RecordDto>(
  {
    action: 'update',
    entityType: 'clinical_record',
    entityId: (input) => input.id,
    metadata: (input) => ({ recordId: input.id }),
  },
  async (ctx: TenantContext, input: UpdateRecordInput): Promise<RecordDto> => {
    requireRole(ctx, 'professional');
    const repo = new RecordRepository(ctx);

    const existing = await repo.findById(input.id);
    if (!existing) throw new Error(`Registro ${input.id} não encontrado`);
    if (existing.status === 'finalized') throw new Error('Registros finalizados não podem ser editados');

    const { id, ...data } = input;
    const updated = await repo.update(id, data);
    if (!updated) throw new Error(`Falha ao atualizar registro ${id}`);
    return toRecordDto(updated);
  },
);

export class UpdateRecordService extends BaseService {
  async execute(input: UpdateRecordInput): Promise<RecordDto> {
    return updateRecordAudited(this.ctx, input);
  }
}
