const postgres = require('postgres');
require('dotenv').config();

async function main() {
  const sql = postgres(process.env.DATABASE_URL, { ssl: { rejectUnauthorized: false } });
  const res = await sql`
    SELECT column_name, is_nullable
    FROM information_schema.columns
    WHERE table_name = 'patients'
    ORDER BY ordinal_position;
  `;
  console.log(res);
  await sql.end();
}

main().catch(console.error);
