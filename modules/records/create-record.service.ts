import { withAudit } from '@/lib/audit/with-audit';
import { requireRole } from '@/lib/auth/authorization';
import { BaseService } from '@/services/base.service';
import type { TenantContext } from '@/lib/tenant-context';
import { RecordRepository } from './record.repository';
import { toRecordDto } from './record.mapper';
import type { CreateRecordInput, RecordDto } from './record.dto';

const createRecordAudited = withAudit<CreateRecordInput, RecordDto>(
  {
    action: 'create',
    entityType: 'clinical_record',
    entityId: (_, output) => output?.id,
    metadata: (input, output) => ({
      patientId: input.patientId,
      type: input.type,
      sessionDate: input.sessionDate,
      recordId: output?.id,
    }),
  },
  async (ctx: TenantContext, input: CreateRecordInput): Promise<RecordDto> => {
    requireRole(ctx, 'professional');
    const repo = new RecordRepository(ctx);
    const row = await repo.create({
      patientId: input.patientId,
      professionalId: ctx.userId,
      type: input.type,
      title: input.title ?? null,
      content: input.content,
      sessionDate: input.sessionDate,
      status: 'draft',
    });
    return toRecordDto(row);
  },
);

export class CreateRecordService extends BaseService {
  async execute(input: CreateRecordInput): Promise<RecordDto> {
    return createRecordAudited(this.ctx, input);
  }
}
