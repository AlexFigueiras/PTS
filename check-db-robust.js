require('dotenv').config({ path: '.env.local' });
const postgres = require('postgres');

async function main() {
  const sql = postgres(process.env.DATABASE_URL, { ssl: 'require' });
  try {
    const result = await sql`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'`;
    console.log('Tables in public schema:', result.map(r => r.table_name));
    
    const groups = await sql`SELECT count(*) FROM groups`.catch(e => {
        console.log('Groups table check failed:', e.message);
        return null;
    });
    if (groups) console.log('Groups count:', groups);
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await sql.end();
  }
}

main();
