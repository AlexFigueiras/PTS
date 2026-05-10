'use server';

import { getActiveTenantContext } from '@/lib/auth/get-tenant-context';
import { ForbiddenError } from '@/lib/auth/authorization';
import { revalidateTenantResource } from '@/lib/cache';
import { createFileSchema } from './file.dto';
import { CreateFileService } from './create-file.service';
import { DeleteFileService } from './delete-file.service';
import type { FileDto } from './file.dto';

export type FileActionState = { error: string | null };
export type CreateFileActionState = { error: string | null; file: FileDto | null };

export async function createFileAction(
  _prev: CreateFileActionState,
  formData: FormData,
): Promise<CreateFileActionState> {
  const ctx = await getActiveTenantContext();
  if (!ctx) return { error: 'Sessão expirada. Faça login novamente.', file: null };

  const parsed = createFileSchema.safeParse({
    storageKey: formData.get('storageKey'),
    originalName: formData.get('originalName'),
    mimeType: formData.get('mimeType'),
    size: formData.get('size'),
    entityType: formData.get('entityType'),
    entityId: formData.get('entityId'),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Dados inválidos.', file: null };
  }

  try {
    const service = new CreateFileService(ctx);
    const file = await service.execute(parsed.data);
    revalidateTenantResource(ctx.tenantId, 'files');
    revalidateTenantResource(ctx.tenantId, 'patients');
    return { error: null, file };
  } catch (err) {
    if (err instanceof ForbiddenError) return { error: 'Sem permissão para fazer upload de arquivos.', file: null };
    return { error: 'Erro ao registrar arquivo.', file: null };
  }
}

export async function deleteFileAction(
  _prev: FileActionState,
  formData: FormData,
): Promise<FileActionState> {
  const ctx = await getActiveTenantContext();
  if (!ctx) return { error: 'Sessão expirada. Faça login novamente.' };

  const fileId = formData.get('fileId');
  if (!fileId || typeof fileId !== 'string') {
    return { error: 'ID do arquivo ausente.' };
  }

  try {
    const service = new DeleteFileService(ctx);
    await service.execute(fileId);
    revalidateTenantResource(ctx.tenantId, 'files');
    revalidateTenantResource(ctx.tenantId, 'patients');
    return { error: null };
  } catch (err) {
    if (err instanceof ForbiddenError) return { error: 'Sem permissão para remover arquivos.' };
    return { error: 'Erro ao remover arquivo. Tente novamente.' };
  }
}

/**
 * Variante para uso direto como `form action` (sem useActionState).
 * Erros são silenciosos — a página re-renderiza via revalidação se tiver sucesso.
 */
export async function deleteFileFormAction(formData: FormData): Promise<void> {
  const ctx = await getActiveTenantContext();
  if (!ctx) return;

  const fileId = formData.get('fileId');
  if (!fileId || typeof fileId !== 'string') return;

  try {
    const service = new DeleteFileService(ctx);
    await service.execute(fileId);
    revalidateTenantResource(ctx.tenantId, 'files');
    revalidateTenantResource(ctx.tenantId, 'patients');
  } catch (err) {
    if (err instanceof ForbiddenError) return;
    // silencioso: a re-renderização confirmará se o arquivo ainda aparece
  }
}
