import postgres from 'postgres';
import dotenv from 'dotenv';
dotenv.config();

async function main() {
  const sql = postgres(process.env.DATABASE_URL!, { ssl: { rejectUnauthorized: false } });
  const columns = await sql`
    SELECT column_name, ordinal_position, is_nullable
    FROM information_schema.columns
    WHERE table_name = 'patients'
    ORDER BY ordinal_position;
  `;
  for (const col of columns) {
      console.log(`${col.ordinal_position}: ${col.column_name} (nullable: ${col.is_nullable})`);
  }
  process.exit(0);
}

main().catch(console.error);
