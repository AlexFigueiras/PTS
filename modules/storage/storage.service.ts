import { withAudit } from '@/lib/audit/with-audit';
import { getStorageProvider } from '@/lib/providers/storage';
import { BaseService } from '@/services/base.service';
import type { TenantContext } from '@/lib/tenant-context';

import type { PresignedUrlRequest, PresignedUrlResponse } from './storage.dto';

/**
 * Gera a key do arquivo no bucket.
 * Formato: uploads/{tenantId}/{entity}/{yyyy}/{mm}/{uuid}.{ext}
 *
 * - tenantId garante isolamento multi-tenant
 * - yyyy/mm facilita lifecycle policies e listagem por período
 * - uuid evita colisões e path traversal (nunca usar filename do usuário como key)
 */
function buildFileKey(tenantId: string, entity: string, filename: string): string {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const ext = filename.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '') ?? 'bin';
  const uuid = crypto.randomUUID();
  return `uploads/${tenantId}/${entity}/${yyyy}/${mm}/${uuid}.${ext}`;
}

type UploadInput = Omit<PresignedUrlRequest, 'tenantId'>;

const requestUploadAudited = withAudit<UploadInput, PresignedUrlResponse>(
  {
    action: 'upload',
    entityType: 'storage_file',
    entityId: (_, output) => output?.key,
    metadata: (input, output) => ({
      filename: input.filename,
      mimeType: input.mimeType,
      size: input.size,
      entity: input.entity,
      key: output?.key,
    }),
  },
  async (ctx: TenantContext, input: UploadInput): Promise<PresignedUrlResponse> => {
    const provider = getStorageProvider();
    const key = buildFileKey(ctx.tenantId, input.entity, input.filename);

    const result = await provider.getSignedUploadUrl({
      key,
      mimeType: input.mimeType,
      size: input.size,
    });

    const publicUrl = provider.getFileUrl(key);

    return {
      uploadUrl: result.uploadUrl,
      key: result.key,
      publicUrl,
      expiresAt: result.expiresAt.toISOString(),
    };
  },
);

const deleteFileAudited = withAudit<string, void>(
  {
    action: 'delete',
    entityType: 'storage_file',
    entityId: (key) => key,
    metadata: (key) => ({ key }),
  },
  async (ctx: TenantContext, key: string): Promise<void> => {
    if (!key.startsWith(`uploads/${ctx.tenantId}/`)) {
      throw new Error('Acesso negado: arquivo não pertence a este tenant');
    }
    await getStorageProvider().deleteFile(key);
  },
);

export class StorageService extends BaseService {
  async requestUpload(input: UploadInput): Promise<PresignedUrlResponse> {
    return requestUploadAudited(this.ctx, input);
  }

  async deleteFile(key: string): Promise<void> {
    return deleteFileAudited(this.ctx, key);
  }
}
