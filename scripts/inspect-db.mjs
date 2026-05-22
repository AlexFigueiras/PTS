import postgres from 'postgres';
import { config } from 'dotenv';

config({ path: '.env.local' });

const url = process.env.DATABASE_DIRECT_URL ?? process.env.DATABASE_URL;
if (!url) {
  console.log(JSON.stringify({ ok: false, reason: 'no DATABASE_URL' }));
  process.exit(0);
}

const sql = postgres(url, { prepare: false, max: 1, idle_timeout: 5, connect_timeout: 15 });

try {
  const tables = await sql`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public' ORDER BY table_name`;
  const names = tables.map((t) => t.table_name);

  const profileCols = await sql`
    SELECT column_name FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles'`;

  let ledger = null;
  try {
    const rows = await sql`SELECT count(*)::int AS n FROM drizzle.__drizzle_migrations`;
    ledger = rows[0].n;
  } catch {
    ledger = 'absent';
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        has_service_units: names.includes('service_units'),
        has_professionals_to_units: names.includes('professionals_to_units'),
        has_clinical_records: names.includes('clinical_records'),
        profiles_has_role: profileCols.some((c) => c.column_name === 'role'),
        profiles_has_status: profileCols.some((c) => c.column_name === 'status'),
        drizzle_ledger_rows: ledger,
        table_count: names.length,
      },
      null,
      2,
    ),
  );
} catch (err) {
  console.log(JSON.stringify({ ok: false, reason: String(err?.message ?? err) }));
} finally {
  await sql.end({ timeout: 5 });
}
