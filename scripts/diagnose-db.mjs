import postgres from 'postgres';
import { config } from 'dotenv';

config({ path: '.env.local' });

const url = process.env.DATABASE_DIRECT_URL ?? process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL ausente.');
  process.exit(1);
}

const sql = postgres(url, { prepare: false, max: 1, idle_timeout: 10, connect_timeout: 20 });

try {
  console.log('--- DIAGNÓSTICO DO BANCO DE DADOS ---');
  
  // 1. Verificar usuários recentes no auth.users
  console.log('\n[1] Usuários recentes em auth.users:');
  const authUsers = await sql`
    SELECT id, email, created_at, raw_user_meta_data 
    FROM auth.users 
    ORDER BY created_at DESC 
    LIMIT 3;
  `;
  console.table(authUsers.map(u => ({
    id: u.id,
    email: u.email,
    created_at: u.created_at,
    meta_name: u.raw_user_meta_data?.full_name || u.raw_user_meta_data?.name,
    meta_tenant: u.raw_user_meta_data?.tenant_name
  })));

  // 2. Verificar perfis recentes em public.profiles
  console.log('\n[2] Perfis recentes em public.profiles:');
  const profiles = await sql`
    SELECT id, email, full_name, role, created_at 
    FROM public.profiles 
    ORDER BY created_at DESC 
    LIMIT 3;
  `;
  console.table(profiles);

  // 3. Verificar tenants recentes em public.tenants
  console.log('\n[3] Tenants recentes em public.tenants:');
  const tenants = await sql`
    SELECT id, name, slug, created_at 
    FROM public.tenants 
    ORDER BY created_at DESC 
    LIMIT 3;
  `;
  console.table(tenants);

  // 4. Verificar relacionamentos em public.tenant_members
  console.log('\n[4] Membros de tenants recentes em public.tenant_members:');
  const members = await sql`
    SELECT tenant_id, user_id, role, created_at 
    FROM public.tenant_members 
    ORDER BY created_at DESC 
    LIMIT 3;
  `;
  console.table(members);

  // 5. Verificar a existência da função de trigger handle_new_user
  console.log('\n[5] Verificando existência da função handle_new_user:');
  const triggerFunc = await sql`
    SELECT routine_name, routine_type 
    FROM information_schema.routines 
    WHERE routine_schema = 'public' AND routine_name = 'handle_new_user';
  `;
  console.table(triggerFunc);

  // 6. Verificar se o trigger on_auth_user_created está ativo na tabela auth.users
  console.log('\n[6] Verificando se o trigger on_auth_user_created está ativo:');
  const trigger = await sql`
    SELECT trigger_name, event_manipulation, event_object_table, action_statement 
    FROM information_schema.triggers 
    WHERE event_object_table = 'users' AND trigger_name = 'on_auth_user_created';
  `;
  console.table(trigger);

} catch (err) {
  console.error('Erro durante diagnóstico:', err);
} finally {
  await sql.end({ timeout: 10 });
}
