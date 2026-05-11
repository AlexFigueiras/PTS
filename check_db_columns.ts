import { getDb } from './lib/db/client';
import { sql } from 'drizzle-orm';

async function main() {
  const db = await getDb();
  const result = await db.execute(sql`
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_name = 'patients'
    ORDER BY ordinal_position;
  `);
  console.log(JSON.stringify(result, null, 2));
}

main().catch(console.error);
