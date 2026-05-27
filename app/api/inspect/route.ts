import { NextResponse } from 'next/server';
import postgres from 'postgres';

export async function GET() {
  const url = process.env.DATABASE_DIRECT_URL ?? process.env.DATABASE_URL;
  if (!url) {
    return NextResponse.json({ ok: false, error: 'DATABASE_URL is not set' }, { status: 500 });
  }

  const sql = postgres(url, { prepare: false, max: 1 });

  try {
    // 1. Get list of tables
    const tables = await sql`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public' ORDER BY table_name
    `;
    const names = tables.map((t) => t.table_name);

    // 2. Get profile columns
    const profileCols = await sql`
      SELECT column_name, data_type FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'profiles'
    `;

    // 3. Get ledger status
    let ledger = null;
    try {
      const rows = await sql`SELECT count(*)::int AS n FROM drizzle.__drizzle_migrations`;
      ledger = rows[0].n;
    } catch (e: any) {
      ledger = 'absent (' + e.message + ')';
    }

    // 4. Get active users in auth.users and profiles
    const usersCount = await sql`SELECT count(*)::int AS n FROM auth.users`.catch((e) => 'error: ' + e.message);
    const profilesCount = await sql`SELECT count(*)::int AS n FROM public.profiles`.catch((e) => 'error: ' + e.message);

    // 5. Check trigger on_auth_user_created
    const triggers = await sql`
      SELECT trigger_name, event_manipulation, event_object_table, action_statement
      FROM information_schema.triggers
      WHERE event_object_table = 'users' OR trigger_name = 'on_auth_user_created'
    `.catch((e) => 'error: ' + e.message);

    return NextResponse.json({
      ok: true,
      tables: names,
      profilesColumns: profileCols,
      ledger,
      usersCount,
      profilesCount,
      triggers,
    });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message ?? String(err) }, { status: 500 });
  } finally {
    await sql.end();
  }
}
