import postgres from 'postgres';
import { config } from 'dotenv';

config({ path: '.env.local' });

const url = process.env.DATABASE_DIRECT_URL ?? process.env.DATABASE_URL;
const sql = postgres(url, { prepare: false, max: 1 });

try {
  const result = await sql`
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public' AND tablename = 'inbox_notifications';
  `;
  console.log("=== INBOX TABLE EXISTENCE ===");
  console.log(JSON.stringify(result, null, 2));
} catch (err) {
  console.error("Error executing query:", err.message || err);
} finally {
  await sql.end();
}
