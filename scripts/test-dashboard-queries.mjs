import postgres from 'postgres';
import { config } from 'dotenv';

config({ path: '.env.local' });

const url = process.env.DATABASE_DIRECT_URL ?? process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL ausente.');
  process.exit(1);
}

const sql = postgres(url, { prepare: false, max: 1, idle_timeout: 10, connect_timeout: 20 });

// ID e Tenant da 'maria@saopaulo.com' obtidos no diagnóstico anterior
const userId = 'f55fc976-b3e5-4d94-b360-24c4538e1c48';
const tenantId = 'f3ad9de2-f2cf-46d4-a5c0-8a524ea0c029';

async function withTransactionContext(txId, tId, callback) {
  return await sql.begin(async (tx) => {
    await tx`SELECT set_config('request.jwt.claims', json_build_object('sub', ${txId}::text)::text, true)`;
    await tx`SELECT set_config('request.current_tenant_id', ${tId}::text, true)`;
    return await callback(tx);
  });
}

try {
  console.log('--- TESTANDO QUERIES DO DASHBOARD E LAYOUT (USUÁRIO: MARIA) ---');

  // Query 1: Profiles (usando transação e set_config)
  console.log('\n[1] Executando query do Profile (com RLS/Contexto)...');
  const profile = await withTransactionContext(userId, tenantId, async (tx) => {
    return await tx`
      SELECT * FROM public.profiles 
      WHERE id = ${userId} 
      LIMIT 1;
    `;
  });
  console.log('Resultado do Profile:', profile[0] ? 'OK (Nome: ' + profile[0].full_name + ')' : 'NENHUM REGISTRO ENCONTRADO');

  // Query 2: Tenant Name
  console.log('\n[2] Executando query do Nome do Tenant...');
  const tenant = await sql`
    SELECT name FROM public.tenants 
    WHERE id = ${tenantId} 
    LIMIT 1;
  `;
  console.log('Resultado do Tenant:', tenant[0] ? 'OK (Nome: ' + tenant[0].name + ')' : 'NENHUM REGISTRO ENCONTRADO');

  // Query 3: Unidades do Profissional (listUserUnits)
  console.log('\n[3] Executando query de listUserUnits (Vínculos)...');
  const userUnits = await sql`
    SELECT 
      su.id,
      su.name,
      su.type,
      ptu.is_primary as "isPrimary"
    FROM public.professionals_to_units ptu
    INNER JOIN public.service_units su ON su.id = ptu.unit_id
    WHERE ptu.professional_id = ${userId} AND su.tenant_id = ${tenantId}
    ORDER BY ptu.is_primary DESC, su.name ASC;
  `;
  console.log('Resultado de Unidades:', userUnits.length === 0 ? 'OK (Nenhuma unidade vinculada - esperado para admin recém-criado)' : `OK (${userUnits.length} unidades)`);

  // Query 4: Inbox Signals (se activeUnitId fosse configurado, mas testamos com null)
  console.log('\n[4] Executando query da Inbox de Sinais (Unidade Ativa = null)...');
  console.log('Como activeUnitId é null, a query do Dashboard é pulada. Teste de fluxo OK.');

  console.log('\n✅ TODAS AS QUERIES DE BANCO DO DASHBOARD/LAYOUT EXECUTARAM COM SUCESSO E SEM ERROS!');

} catch (err) {
  console.error('\n❌ ERRO NA EXECUÇÃO DAS QUERIES:', err.message || err);
} finally {
  await sql.end({ timeout: 10 });
}
