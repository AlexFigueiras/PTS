import { getStorageProvider } from '@/lib/providers/storage';
import type { FileRecord } from '@/lib/db/schema';
import type { FileDto } from './file.dto';

function resolvePublicUrl(storageKey: string): string | null {
  try {
    return getStorageProvider().getFileUrl(storageKey);
  } catch {
    return null;
  }
}

export function toFileDto(row: FileRecord): FileDto {
  return {
    id: row.id,
    entityType: row.entityType,
    entityId: row.entityId,
    originalName: row.originalName,
    mimeType: row.mimeType,
    size: row.size,
    publicUrl: resolvePublicUrl(row.storageKey),
    uploadedBy: row.uploadedBy,
    createdAt: row.createdAt.toISOString(),
  };
}
