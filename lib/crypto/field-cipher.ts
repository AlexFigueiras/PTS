import crypto from 'node:crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;

function getEncryptionKey(): Buffer {
  const rawKey = process.env.PTS_PII_ENCRYPTION_KEY;
  if (!rawKey) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('PTS_PII_ENCRYPTION_KEY ausente em ambiente de produção!');
    }
    // Chave padrão para dev
    return crypto.createHash('sha256').update('dev-fallback-key-must-be-changed-in-prod').digest();
  }
  return crypto.createHash('sha256').update(rawKey).digest();
}

/**
 * Criptografa uma string usando AES-256-GCM.
 * Retorna no formato iv:authTag:ciphertext (hex)
 */
export function encrypt(text: string | null | undefined): string | null {
  if (!text) return null;
  
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag().toString('hex');
  
  // Retorna serializado
  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

/**
 * Decriptografa dados em formato iv:authTag:ciphertext usando AES-256-GCM.
 * Se o dado não estiver no formato esperado (dados antigos), retorna o dado crú.
 */
export function decrypt(encryptedText: string | null | undefined): string | null {
  if (!encryptedText) return null;
  
  const parts = encryptedText.split(':');
  if (parts.length !== 3) {
    // Retorna crú se não estiver no formato criptografado (garante compatibilidade retroativa temporária)
    return encryptedText;
  }
  
  try {
    const [ivHex, authTagHex, ciphertextHex] = parts;
    const key = getEncryptionKey();
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(ciphertextHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (err) {
    console.error('Falha ao decifrar dado PII. Retornando crú como fallback.', err);
    return encryptedText;
  }
}

/**
 * Gera um HMAC determinístico (SHA-256) para busca exata de campos criptografados.
 */
export function generateHMAC(text: string | null | undefined): string | null {
  if (!text) return null;
  const key = getEncryptionKey();
  return crypto.createHmac('sha256', key).update(text).digest('hex');
}
