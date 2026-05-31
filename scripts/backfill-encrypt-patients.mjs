import postgres from 'postgres';
import crypto from 'node:crypto';
import { config } from 'dotenv';

config({ path: '.env.local' });

const url = process.env.DATABASE_DIRECT_URL ?? process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL ausente.');
  process.exit(1);
}

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;

function getEncryptionKey() {
  const rawKey = process.env.PTS_PII_ENCRYPTION_KEY;
  if (!rawKey) {
    return crypto.createHash('sha256').update('dev-fallback-key-must-be-changed-in-prod').digest();
  }
  return crypto.createHash('sha256').update(rawKey).digest();
}

function encrypt(text) {
  if (!text) return null;
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');
  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

function generateHMAC(text) {
  if (!text) return null;
  const key = getEncryptionKey();
  return crypto.createHmac('sha256', key).update(text).digest('hex');
}

const sql = postgres(url, { prepare: false, max: 1 });

try {
  console.log('Buscando pacientes para backfill de criptografia...');
  const rows = await sql`SELECT id, cpf, nis, cns FROM patients`;
  
  let updated = 0;
  for (const row of rows) {
    const { id, cpf, nis, cns } = row;
    
    // Verifica se já está criptografado (contém os dois separadores de GCM ":")
    const isCpfCrypted = cpf && cpf.split(':').length === 3;
    
    if (isCpfCrypted) {
      console.log(`[skip] paciente ${id} já possui dados criptografados.`);
      continue;
    }
    
    const cpfEncrypted = encrypt(cpf);
    const nisEncrypted = encrypt(nis);
    const cnsEncrypted = encrypt(cns);
    const cpfHash = generateHMAC(cpf);
    
    await sql`
      UPDATE patients 
      SET 
        cpf = ${cpfEncrypted},
        nis = ${nisEncrypted},
        cns = ${cnsEncrypted},
        cpf_hash = ${cpfHash},
        updated_at = NOW()
      WHERE id = ${id}
    `;
    updated++;
    console.log(`[ok] paciente ${id} atualizado e criptografado.`);
  }
  console.log(`Backfill concluído! Pacientes atualizados: ${updated}`);
} catch (err) {
  console.error('Erro durante o backfill:', err);
} finally {
  await sql.end();
}
