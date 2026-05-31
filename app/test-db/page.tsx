import React from 'react';
import postgres from 'postgres';
import { readFileSync } from 'node:fs';

export const dynamic = 'force-dynamic';

export default async function TestDbPage() {
  const url = process.env.DATABASE_DIRECT_URL ?? process.env.DATABASE_URL;
  if (!url) {
    return (
      <div className="p-8 max-w-4xl mx-auto space-y-6 bg-slate-900 text-slate-100 min-h-screen">
        <h1 className="text-3xl font-bold text-red-500">Database Connection Error</h1>
        <p className="text-slate-300">Neither DATABASE_DIRECT_URL nor DATABASE_URL environment variables are configured.</p>
      </div>
    );
  }

  const sql = postgres(url, { prepare: false, max: 1 });
  let errorMsg: string | null = null;
  let tables: any[] = [];
  let profileCols: any[] = [];
  let ledger: any = null;
  let triggers: any[] = [];
  let userCount: any = 0;
  let profileCount: any = 0;
  let testQueryOk = false;

  try {
    // 1. Get list of tables
    const tableRows = await sql`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public' ORDER BY table_name
    `;
    tables = tableRows.map((t) => t.table_name);

    // 2. Get profile columns
    if (tables.includes('profiles')) {
      const colRows = await sql`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'profiles'
      `;
      profileCols = colRows;
    }

    // 3. Get ledger status
    try {
      const rows = await sql`SELECT count(*)::int AS n FROM drizzle.__drizzle_migrations`;
      ledger = rows[0].n;
    } catch (e: any) {
      ledger = 'absent (' + e.message + ')';
    }

    // 4. Get active users in auth.users and profiles
    userCount = await sql`SELECT count(*)::int AS n FROM auth.users`.then(r => r[0].n).catch((e) => 'error: ' + e.message);
    profileCount = await sql`SELECT count(*)::int AS n FROM public.profiles`.then(r => r[0].n).catch((e) => 'error: ' + e.message);

    // 5. Check triggers
    triggers = await sql`
      SELECT trigger_name, event_manipulation, event_object_table, action_statement
      FROM information_schema.triggers
      WHERE trigger_schema = 'public' OR trigger_name = 'on_auth_user_created'
    `.catch((e) => []);

    testQueryOk = true;
  } catch (err: any) {
    errorMsg = err?.message ?? String(err);
  } finally {
    await sql.end();
  }

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8 bg-slate-950 text-slate-100 min-h-screen font-sans">
      <div className="border-b border-slate-800 pb-6">
        <h1 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-teal-400 via-cyan-500 to-blue-600 bg-clip-text text-transparent">
          Diagnóstico e Governança do Banco de Dados
        </h1>
        <p className="text-slate-400 mt-2">
          Painel interativo para verificar a saúde do Supabase, triggers de autenticação e migrations.
        </p>
      </div>

      {errorMsg && (
        <div className="p-4 bg-red-950/40 border border-red-800 text-red-300 rounded-lg">
          <h2 className="font-bold text-lg">Erro na Conexão:</h2>
          <pre className="text-sm overflow-x-auto whitespace-pre-wrap mt-2">{errorMsg}</pre>
        </div>
      )}

      {testQueryOk && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="p-5 bg-slate-900 border border-slate-800 rounded-xl space-y-1">
            <span className="text-xs text-slate-400 font-semibold uppercase">Tabelas Criadas</span>
            <div className="text-3xl font-black text-teal-400">{tables.length}</div>
          </div>
          <div className="p-5 bg-slate-900 border border-slate-800 rounded-xl space-y-1">
            <span className="text-xs text-slate-400 font-semibold uppercase">Usuários no Auth</span>
            <div className="text-3xl font-black text-cyan-400">{userCount}</div>
          </div>
          <div className="p-5 bg-slate-900 border border-slate-800 rounded-xl space-y-1">
            <span className="text-xs text-slate-400 font-semibold uppercase">Perfis Sincronizados</span>
            <div className="text-3xl font-black text-indigo-400">{profileCount}</div>
          </div>
          <div className="p-5 bg-slate-900 border border-slate-800 rounded-xl space-y-1">
            <span className="text-xs text-slate-400 font-semibold uppercase">Drizzle Ledger Rows</span>
            <div className="text-3xl font-black text-pink-400">{typeof ledger === 'number' ? ledger : '0 (Inconsistente)'}</div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-800 font-bold bg-slate-900/50 flex justify-between items-center">
              <span>Tabelas Públicas Ativas</span>
              <span className="px-2 py-0.5 text-xs bg-slate-800 rounded text-slate-300">Esquema &#39;public&#39;</span>
            </div>
            <div className="p-5">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {tables.map((table) => {
                  const hasRequired = ['profiles', 'tenants', 'tenant_members', 'patients', 'clinical_records', 'service_units'].includes(table);
                  return (
                    <div
                      key={table}
                      className={`p-3 rounded-lg border text-sm font-semibold flex items-center justify-between ${
                        hasRequired
                          ? 'bg-emerald-950/20 border-emerald-800/40 text-emerald-300'
                          : 'bg-slate-950 border-slate-800 text-slate-400'
                      }`}
                    >
                      <span>{table}</span>
                      {hasRequired && (
                        <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-800 font-bold bg-slate-900/50">
              Colunas na Tabela &#39;profiles&#39;
            </div>
            <div className="p-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {profileCols.map((col) => {
                  const isRoleOrStatus = ['role', 'status'].includes(col.column_name);
                  return (
                    <div
                      key={col.column_name}
                      className={`p-3 rounded-lg border flex justify-between items-center ${
                        isRoleOrStatus
                          ? 'bg-indigo-950/20 border-indigo-800/50 text-indigo-200'
                          : 'bg-slate-950 border-slate-800 text-slate-300'
                      }`}
                    >
                      <span className="font-mono font-bold">{col.column_name}</span>
                      <span className="text-xs bg-slate-900 px-2 py-1 rounded text-slate-400">
                        {col.data_type} ({col.is_nullable === 'YES' ? 'null' : 'not null'})
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-800 font-bold bg-slate-900/50">
              Triggers de Autenticação
            </div>
            <div className="p-5 space-y-4">
              {triggers.length === 0 ? (
                <div className="p-4 bg-amber-950/20 border border-amber-800/50 rounded-lg text-amber-300 text-sm">
                  ⚠️ Nenhum trigger de autenticação foi encontrado. Isso causará falha no signup, pois o perfil e o tenant não serão criados!
                </div>
              ) : (
                triggers.map((t) => (
                  <div key={t.trigger_name} className="p-4 bg-slate-950 border border-slate-800 rounded-lg space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="font-mono text-cyan-400 font-bold">{t.trigger_name}</span>
                      <span className="text-xs px-2 py-0.5 bg-emerald-950 border border-emerald-950 text-emerald-400 rounded">
                        {t.event_manipulation}
                      </span>
                    </div>
                    <div className="text-xs text-slate-400">
                      Tabela: <span className="font-mono text-slate-300">{t.event_object_table}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
            <h3 className="font-bold text-lg text-slate-200">Ações de Governança</h3>
            <p className="text-xs text-slate-400">
              Use a rota de migrações customizada para aplicar as tabelas necessárias de forma segura e idempotente sem quebrar a consistência.
            </p>
            <a
              href="/api/run-migrations"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full block text-center py-2.5 px-4 bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700 text-white font-bold rounded-lg transition"
            >
              Executar Migrações Pendentes (0012 à 0027)
            </a>
            <a
              href="/api/inspect"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full block text-center py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-lg transition"
            >
              Visualizar JSON de Inspeção
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
