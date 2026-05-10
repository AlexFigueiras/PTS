import { requireRole } from '@/lib/auth/authorization';
import { BaseService } from '@/services/base.service';
import { FileRepository } from './file.repository';
import { toFileDto } from './file.mapper';
import type { FileDto } from './file.dto';

export class ListFilesService extends BaseService {
  async execute(entityType: string, entityId: string): Promise<FileDto[]> {
    requireRole(this.ctx, 'assistant');
    const repo = new FileRepository(this.ctx);
    const rows = await repo.listByEntity(entityType, entityId);
    return rows.map(toFileDto);
  }
}
