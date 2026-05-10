import postgres from 'postgres';
import { readFileSync } from 'fs';
import { createHash } from 'crypto';

const url = process.env.DATABASE_DIRECT_URL ?? process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_DIRECT_URL or DATABASE_URL not set');

const migrationFile = process.argv[2];
if (!migrationFile) throw new Error('Usage: node scripts/apply-migration.mjs <sql-file>');

// Try direct URL first, fall back to pooler
const directUrl = process.env.DATABASE_DIRECT_URL;
const poolerUrl = process.env.DATABASE_URL;

async function tryConnect(connUrl, label) {
  const sql = postgres(connUrl, { max: 1, connect_timeout: 20 });
  try {
    await sql`SELECT 1`;
    console.log(`Connected via ${label}`);
    return sql;
  } catch {
    await sql.end();
    return null;
  }
}

const content = readFileSync(migrationFile, 'utf8');
const statements = content.split('--> statement-breakpoint').map(s => s.trim()).filter(Boolean);

console.log(`Applying ${statements.length} statement(s) from ${migrationFile}...`);

let sql = null;
if (directUrl) sql = await tryConnect(directUrl, 'direct URL');
if (!sql && poolerUrl) sql = await tryConnect(poolerUrl, 'pooler URL');
if (!sql) throw new Error('Could not connect to database');

try {
  for (let i = 0; i < statements.length; i++) {
    console.log(`  [${i + 1}/${statements.length}] ${statements[i].slice(0, 60).replace(/\n/g, ' ')}...`);
    await sql.unsafe(statements[i]);
  }

  const hash = createHash('sha256').update(content).digest('hex');
  const createdAt = BigInt(Date.now());
  await sql`INSERT INTO drizzle.__drizzle_migrations (hash, created_at) VALUES (${hash}, ${createdAt})`;
  console.log('Migration recorded in drizzle.__drizzle_migrations');
  console.log('Done!');
} catch (err) {
  console.error('Error:', err.message);
  process.exit(1);
} finally {
  await sql.end();
}
