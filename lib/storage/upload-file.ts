'use client';

/**
 * Helper client-side para upload seguro de arquivos.
 *
 * Fluxo (arquivo NÃO passa pelo servidor Next.js):
 *   Browser → POST /api/storage/presigned-url → recebe signed URL
 *   Browser → PUT <signedUrl> → upload direto ao R2
 *
 * Credenciais R2 NUNCA chegam ao browser.
 */

export type UploadFileInput = {
  tenantId: string;
  file: File;
  /** Contexto do upload: "patients", "documents", "avatars", etc. */
  entity: string;
};

export type UploadFileResult = {
  key: string;
  publicUrl: string;
};

export async function uploadFile({
  tenantId,
  file,
  entity,
}: UploadFileInput): Promise<UploadFileResult> {
  // Passo 1: solicitar presigned URL ao nosso backend
  const res = await fetch('/api/storage/presigned-url', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      tenantId,
      filename: file.name,
      mimeType: file.type,
      size: file.size,
      entity,
    }),
  });

  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(data.error ?? `Erro ${res.status} ao solicitar URL de upload`);
  }

  const { uploadUrl, key, publicUrl } = (await res.json()) as {
    uploadUrl: string;
    key: string;
    publicUrl: string;
  };

  // Passo 2: upload direto para o R2 (PUT)
  const uploadRes = await fetch(uploadUrl, {
    method: 'PUT',
    body: file,
    headers: { 'Content-Type': file.type },
  });

  if (!uploadRes.ok) {
    throw new Error(`Erro ${uploadRes.status} ao fazer upload para o storage`);
  }

  return { key, publicUrl };
}
