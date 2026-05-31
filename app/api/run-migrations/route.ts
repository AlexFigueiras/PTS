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
    'drizzle/migrations/0015_add_cnes_to_service_units.sql',
    'drizzle/migrations/0016_add_inbox_notifications.sql',
    'drizzle/migrations/0017_add_rls_notifications.sql',
    'drizzle/migrations/0018_add_deleted_at.sql',
    'drizzle/migrations/0019_rls_domain_policies.sql',
    'drizzle/migrations/0020_recreate_intersectoral_tasks.sql',
    'drizzle/migrations/0021_peaceful_silver_fox.sql',
    'drizzle/migrations/0022_adjust_cases_rls.sql',
    'drizzle/migrations/0023_signal_engine.sql',
    'drizzle/migrations/0024_demo_sources.sql',
    'drizzle/migrations/0025_consent_recusa.sql',
    'drizzle/migrations/0026_identifier_tokens.sql',
    'drizzle/migrations/0027_cifragem_pii.sql',
  ];

  const sql = postgres(url, { prepare: false, max: 1 });
  const results: {
    file: string;
    statementsCount: number;
    status: string;
    error?: string | null;
    failedStatement?: string;
    fallbackError?: string;
  }[] = [];

  try {
    for (const file of FILES) {
      const raw = readFileSync(file, 'utf8');
      
      // Split the migration statements by `--> statement-breakpoint` to avoid PostgreSQL catalog issues
      const statements = raw
        .split('--> statement-breakpoint')
        .map((s) => s.trim())
        .filter((s) => s.length > 0);

      const currentResult: {
        file: string;
        statementsCount: number;
        status: string;
        error?: string | null;
        failedStatement?: string;
        fallbackError?: string;
      } = { file, statementsCount: statements.length, status: 'starting' };

      results.push(currentResult);

      try {
        await sql.begin(async (tx) => {
          for (const stmt of statements) {
            // execute each statement individually inside the transaction
            await tx.unsafe(stmt);
          }
        });
        currentResult.status = 'success';
      } catch (err: unknown) {
        currentResult.status = 'failed';
        const error = err as { message?: string; query?: string };
        currentResult.error = error?.message ?? String(err);
        currentResult.failedStatement = error?.query ?? '';
        
        // Let's also try executing the raw file as a fallback, just in case
        try {
          await sql.begin((tx) => [tx.unsafe(raw)]);
          currentResult.status = 'success_fallback';
          currentResult.error = null;
        } catch (fallbackErr: unknown) {
          const error = fallbackErr as { message?: string };
          currentResult.fallbackError = error?.message ?? String(fallbackErr);
          break;
        }
      }
    }

    return NextResponse.json({
      ok: true,
      results,
    });
  } catch (err: unknown) {
    const error = err as { message?: string };
    return NextResponse.json({ ok: false, error: error?.message ?? String(err) }, { status: 500 });
  } finally {
    await sql.end();
  }
}
