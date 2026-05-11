import postgres from 'postgres';
import dotenv from 'dotenv';
dotenv.config();

async function main() {
  const sql = postgres(process.env.DATABASE_URL!, { ssl: { rejectUnauthorized: false } });
  const columns = await sql`
    SELECT column_name, ordinal_position
    FROM information_schema.columns
    WHERE table_name = 'patients'
    ORDER BY ordinal_position;
  `;
  console.log(JSON.stringify(columns, null, 2));
  process.exit(0);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
