/**
 * Fachada unificada do provider de storage.
 *
 * - Hoje: Cloudflare R2 (via AWS S3 SDK).
 * - Futuro: trocar `r2Provider` por outro impl sem alterar nenhum service/module.
 *
 * NÃO importar `r2Provider` diretamente em código de domínio.
 * Sempre usar `getStorageProvider()` para manter o desacoplamento.
 */
import { r2Provider } from './r2';
import type { StorageProvider } from './types';

export function getStorageProvider(): StorageProvider {
  return r2Provider;
}

export type { SignedUploadUrlInput, SignedUploadUrlResult, StorageProvider } from './types';
