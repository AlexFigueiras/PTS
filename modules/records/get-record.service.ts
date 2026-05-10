import { requireRole } from '@/lib/auth/authorization';
import { BaseService } from '@/services/base.service';
import { RecordRepository } from './record.repository';
import { toRecordDto } from './record.mapper';
import type { RecordDto } from './record.dto';

export class GetRecordService extends BaseService {
  async execute(id: string): Promise<RecordDto | undefined> {
    requireRole(this.ctx, 'assistant');
    const repo = new RecordRepository(this.ctx);
    const row = await repo.findById(id);
    return row ? toRecordDto(row) : undefined;
  }
}
