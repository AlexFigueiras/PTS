import postgres from 'postgres';
import { config } from 'dotenv';

config({ path: '.env.local' });

const url = process.env.DATABASE_DIRECT_URL ?? process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL or DATABASE_DIRECT_URL is not set.");
  process.exit(1);
}

const sql = postgres(url, { prepare: false, max: 1 });

try {
  console.log("=== public tables ===");
  const tables = await sql`
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public'
    ORDER BY tablename;
  `;
  console.log(JSON.stringify(tables, null, 2));

  console.log("=== tenant_id columns in specific tables ===");
  const cols = await sql`
    SELECT table_name, column_name, data_type
    FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name IN (
      'pts_master', 'pts_clinico_geral', 'pts_geral', 'pts_enfermagem',
      'pts_psicologia', 'pts_psiquiatria', 'pts_nutricao', 'pts_servico_social',
      'pts_terapia_ocupacional', 'pts_educacao_fisica'
    )
    AND column_name = 'tenant_id'
    ORDER BY table_name;
  `;
  console.log(JSON.stringify(cols, null, 2));

  console.log("=== columns in all pts_* tables ===");
  const allPtsCols = await sql`
    SELECT table_name, column_name, data_type
    FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name LIKE 'pts_%'
    ORDER BY table_name, column_name;
  `;
  console.log(JSON.stringify(allPtsCols, null, 2));

} catch (err) {
  console.error("Error inspecting database:", err.message || err);
} finally {
  await sql.end();
}
