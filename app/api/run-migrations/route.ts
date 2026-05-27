import { NextResponse } from 'next/server';
import { readFileSync } from 'node:fs';
import postgres from 'postgres';

export async function GET() {
  const url = process.env.DATABASE_DIRECT_URL ?? process.env.DATABASE_URL;
  if (!url) {
    return NextResponse.json({ ok: false, error: 'DATABASE_URL is not set' }, { status: 500 });
  }

  const FILES = [
    'drizzle/migrations/0012_intersectoral_pivot.sql',
    'drizzle/migrations/0013_governance_rbac.sql',
    'drizzle/migrations/0014_background_jobs.sql',
  ];

  const sql = postgres(url, { prepare: false, max: 1 });
  const results: any[] = [];

  try {
    for (const file of FILES) {
      const raw = readFileSync(file, 'utf8');
      
      // Split the migration statements by `--> statement-breakpoint` to avoid PostgreSQL catalog issues
      const statements = raw
        .split('--> statement-breakpoint')
        .map((s) => s.trim())
        .filter((s) => s.length > 0);

      results.push({ file, statementsCount: statements.length, status: 'starting' });

      try {
        await sql.begin(async (tx) => {
          for (const stmt of statements) {
            // execute each statement individually inside the transaction
            await tx.unsafe(stmt);
          }
        });
        results[results.length - 1].status = 'success';
      } catch (err: any) {
        results[results.length - 1].status = 'failed';
        results[results.length - 1].error = err?.message ?? String(err);
        results[results.length - 1].failedStatement = err?.query ?? '';
        
        // Let's also try executing the raw file as a fallback, just in case
        try {
          await sql.begin((tx) => [tx.unsafe(raw)]);
          results[results.length - 1].status = 'success_fallback';
          results[results.length - 1].error = null;
        } catch (fallbackErr: any) {
          results[results.length - 1].fallbackError = fallbackErr?.message ?? String(fallbackErr);
          break;
        }
      }
    }

    return NextResponse.json({
      ok: true,
      results,
    });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message ?? String(err) }, { status: 500 });
  } finally {
    await sql.end();
  }
}
