require('dotenv').config({ path: '.env.local' });
const postgres = require('postgres');
const fs = require('fs');

async function main() {
  const sqlContent = fs.readFileSync('drizzle/migrations/0011_conscious_baron_zemo.sql', 'utf8');
  const statements = sqlContent.split('--> statement-breakpoint');
  
  const sql = postgres(process.env.DATABASE_URL, { ssl: 'require' });
  
  console.log(`Starting execution of ${statements.length} statements...`);
  
  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i].trim();
    if (!stmt) continue;
    
    try {
      console.log(`Executing statement ${i + 1}...`);
      await sql.unsafe(stmt);
    } catch (err) {
      if (err.message.includes('already exists')) {
        console.log(`Statement ${i + 1} skipped: already exists`);
      } else {
        console.error(`Error in statement ${i + 1}:`, err.message);
      }
    }
  }
  
  console.log('Execution finished.');
  await sql.end();
}

main();
