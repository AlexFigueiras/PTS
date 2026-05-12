import { getDb } from './lib/db/client';
import { sql } from 'drizzle-orm';

async function main() {
  try {
    const result = await getDb().execute(sql`SELECT count(*) FROM groups`);
    console.log('Groups table exists:', result);
  } catch (err) {
    console.error('Error checking groups table:', err);
  }
}

main();
