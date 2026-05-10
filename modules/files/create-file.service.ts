import { withAudit } from '@/lib/audit/with-audit';
import { requireRole } from '@/lib/auth/authorization';
import { BaseService } from '@/services/base.service';
import type { TenantContext } from '@/lib/tenant-context';
import { FileRepository } from './file.repository';
import { toFileDto } from './file.mapper';
import type { CreateFileInput, FileDto } from './file.dto';

const createFileAudited = withAudit<CreateFileInput, FileDto>(
  {
    action: 'upload',
    entityType: 'file',
    entityId: (_, output) => output?.id,
    metadata: (input, output) => ({
      originalName: input.originalName,
      mimeType: input.mimeType,
      size: input.size,
      entityType: input.entityType,
      entityId: input.entityId,
      fileId: output?.id,
    }),
  },
  async (ctx: TenantContext, input: CreateFileInput): Promise<FileDto> => {
    requireRole(ctx, 'professional');
    if (!input.storageKey.startsWith(`uploads/${ctx.tenantId}/`)) {
      throw new Error('Acesso negado: arquivo não pertence a este tenant');
    }

    const repo = new FileRepository(ctx);
    const row = await repo.create({
      entityType: input.entityType,
      entityId: input.entityId,
      storageKey: input.storageKey,
      originalName: input.originalName,
      mimeType: input.mimeType,
      size: input.size,
      uploadedBy: ctx.userId,
    });

    return toFileDto(row);
  },
);

export class CreateFileService extends BaseService {
  async execute(input: CreateFileInput): Promise<FileDto> {
    return createFileAudited(this.ctx, input);
  }
}
