import { requireRole } from '@/lib/auth/authorization';
import { BaseService } from '@/services/base.service';
import { RecordRepository } from './record.repository';
import { toRecordDto } from './record.mapper';
import type { RecordFilters, RecordDto } from './record.dto';
import type { PaginatedResult } from '@/lib/pagination';

export class ListRecordsService extends BaseService {
  async execute(filters: RecordFilters): Promise<PaginatedResult<RecordDto>> {
    requireRole(this.ctx, 'assistant');
    const repo = new RecordRepository(this.ctx);
    const result = await repo.listByPatient(filters);
    return { ...result, data: result.data.map(toRecordDto) };
  }
}
