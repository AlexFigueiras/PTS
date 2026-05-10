/**
 * Interface de domínio para armazenamento de arquivos — independente do vendor.
 * Services e helpers consomem StorageProvider, NUNCA o SDK da Cloudflare/AWS direto.
 *
 * Preparado para:
 *   - bucket privado em produção (download signed URLs)
 *   - troca de provider (S3, GCS, Azure Blob) sem alterar domínio
 *   - antivirus scanning, checksum/hash, lifecycle policies (futuro)
 */

export type SignedUploadUrlInput = {
  key: string;
  mimeType: string;
  size: number;
  /** Tempo de validade da URL em segundos. Default: 300 (5 min). */
  expiresIn?: number;
};

export type SignedUploadUrlResult = {
  uploadUrl: string;
  key: string;
  expiresAt: Date;
};

export interface StorageProvider {
  /** Gera uma signed URL para upload direto (PUT) do browser para o bucket. */
  getSignedUploadUrl(input: SignedUploadUrlInput): Promise<SignedUploadUrlResult>;

  /** Remove um arquivo do bucket. */
  deleteFile(key: string): Promise<void>;

  /**
   * Retorna a URL pública do arquivo.
   * Em staging: URL pública direta (bucket público).
   * Em produção (bucket privado): gerar signed download URL aqui.
   */
  getFileUrl(key: string): string;
}
