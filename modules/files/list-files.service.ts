import { BaseService } from '@/services/base.service';
import { FileRepository } from './file.repository';
import { toFileDto } from './file.mapper';
import type { FileDto } from './file.dto';

export class ListFilesService extends BaseService {
  async execute(entityType: string, entityId: string): Promise<FileDto[]> {
    const repo = new FileRepository(this.ctx);
    const rows = await repo.listByEntity(entityType, entityId);
    return rows.map(toFileDto);
  }
}
