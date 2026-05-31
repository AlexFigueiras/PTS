/**
 * Aplica as migrações pendentes 0012 e 0013 diretamente no banco.
 *
 * O ledger `drizzle.__drizzle_migrations` deste projeto está inconsistente
 * (migrações 0009–0011 foram aplicadas manualmente), então `drizzle-kit
 * migrate` replicaria DDL já existente. Cada migração roda numa transação
 * própria: falha → rollback limpo.
 */
import { readFileSync } from 'node:fs';
import postgres from 'postgres';
import { config } from 'dotenv';

config({ path: '.env.local' });

const url = process.env.DATABASE_DIRECT_URL ?? process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL ausente.');
  process.exit(1);
}

const FILES = [
  'drizzle/migrations/0012_intersectoral_pivot.sql',
  'drizzle/migrations/0013_governance_rbac.sql',
  'drizzle/migrations/0014_background_jobs.sql',
  'drizzle/migrations/0015_add_cnes_to_service_units.sql',
  'drizzle/migrations/0016_add_inbox_notifications.sql',
  'drizzle/migrations/0017_add_rls_notifications.sql',
  'drizzle/migrations/0018_add_deleted_at.sql',
  'drizzle/migrations/0019_rls_domain_policies.sql',
  'drizzle/migrations/0020_recreate_intersectoral_tasks.sql',
  'drizzle/migrations/0021_peaceful_silver_fox.sql',
  'drizzle/migrations/0022_adjust_cases_rls.sql',
  'drizzle/migrations/0023_signal_engine.sql',
  'drizzle/migrations/0024_demo_sources.sql',
  'drizzle/migrations/0025_consent_recusa.sql',
  'drizzle/migrations/0026_identifier_tokens.sql',
  'drizzle/migrations/0027_cifragem_pii.sql',
];

const sql = postgres(url, { prepare: false, max: 1, idle_timeout: 10, connect_timeout: 20 });

let failed = false;
try {
  for (const file of FILES) {
    const raw = readFileSync(file, 'utf8');
    // os marcadores `--> statement-breakpoint` são comentários SQL válidos.
    try {
      await sql.begin((tx) => [tx.unsafe(raw)]);
      console.log(`[ok] aplicada: ${file}`);
    } catch (err) {
      failed = true;
      console.error(`[falha] ${file}: ${err?.message ?? err}`);
      break;
    }
  }
} finally {
  await sql.end({ timeout: 10 });
}

process.exit(failed ? 1 : 0);
