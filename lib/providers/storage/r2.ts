/**
 * Implementação Cloudflare R2 via AWS S3 SDK (compatível com API S3).
 *
 * NÃO instanciar fora deste módulo — usar `storageProvider` de ./index.ts.
 * Configuração lazy: env vars só são lidas na primeira chamada, não no boot,
 * para não quebrar builds/testes sem as envs presentes.
 *
 * CORS do bucket: configurar no painel R2 antes de usar uploads diretos.
 * Ver documentação em docs/storage-cors.md.
 */
import { DeleteObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

import type { SignedUploadUrlInput, SignedUploadUrlResult, StorageProvider } from './types';

function getR2Config() {
  const endpoint = process.env.CLOUDFLARE_R2_ENDPOINT;
  const accessKeyId = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY;
  const bucket = process.env.CLOUDFLARE_R2_BUCKET_NAME;

  if (!endpoint || !accessKeyId || !secretAccessKey || !bucket) {
    throw new Error(
      '[StorageProvider/R2] Envs obrigatórias ausentes. ' +
        'Verifique: CLOUDFLARE_R2_ENDPOINT, CLOUDFLARE_R2_ACCESS_KEY_ID, ' +
        'CLOUDFLARE_R2_SECRET_ACCESS_KEY, CLOUDFLARE_R2_BUCKET_NAME',
    );
  }

  return { endpoint, accessKeyId, secretAccessKey, bucket };
}

let _client: S3Client | null = null;

function getClient(): S3Client {
  if (!_client) {
    const { endpoint, accessKeyId, secretAccessKey } = getR2Config();
    _client = new S3Client({
      region: 'auto',
      endpoint,
      credentials: { accessKeyId, secretAccessKey },
    });
  }
  return _client;
}

export const r2Provider: StorageProvider = {
  async getSignedUploadUrl(input: SignedUploadUrlInput): Promise<SignedUploadUrlResult> {
    const { bucket } = getR2Config();
    const { key, mimeType, size, expiresIn = 300 } = input;

    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      ContentType: mimeType,
      ContentLength: size,
    });

    const uploadUrl = await getSignedUrl(getClient(), command, { expiresIn });
    const expiresAt = new Date(Date.now() + expiresIn * 1000);

    return { uploadUrl, key, expiresAt };
  },

  async deleteFile(key: string): Promise<void> {
    const { bucket } = getR2Config();
    await getClient().send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
  },

  getFileUrl(key: string): string {
    const publicUrl = process.env.NEXT_PUBLIC_R2_PUBLIC_URL;
    if (!publicUrl) {
      throw new Error('[StorageProvider/R2] NEXT_PUBLIC_R2_PUBLIC_URL ausente');
    }
    return `${publicUrl.replace(/\/$/, '')}/${key}`;
  },
};
