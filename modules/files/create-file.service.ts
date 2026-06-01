import { withAudit } from '@/lib/audit/with-audit';
import { requireRole } from '@/lib/auth/authorization';
import { BaseService } from '@/services/base.service';
import type { TenantContext } from '@/lib/tenant-context';
import { FileRepository } from './file.repository';
import { toFileDto } from './file.mapper';
import type { CreateFileInput, FileDto } from './file.dto';
import { withTransactionContext } from '@/lib/db/client';

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
    requireRole(ctx, 'PROFESSIONAL');
    if (!input.storageKey.startsWith(`uploads/${ctx.tenantId}/`)) {
      throw new Error('Acesso negado: arquivo não pertence a este tenant');
    }

    return await withTransactionContext(ctx.userId, ctx.tenantId, async (tx) => {
      const txCtx = { ...ctx, tx };
      const repo = new FileRepository(txCtx);
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
    });
  },
);

export class CreateFileService extends BaseService {
  async execute(input: CreateFileInput): Promise<FileDto> {
    return createFileAudited(this.ctx, input);
  }
}
