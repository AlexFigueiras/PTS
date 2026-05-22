import { createClient } from '@supabase/supabase-js';

/**
 * Cliente Supabase com a SERVICE ROLE KEY.
 *
 * Bypassa RLS e libera a Admin API (`auth.admin.*`) — usada no fluxo inverso
 * de convites para pré-cadastrar contas e definir senhas na ativação.
 *
 * USO ESTRITAMENTE SERVER-SIDE. A chave nunca pode chegar ao client.
 * Não persiste sessão: cada chamada é uma operação administrativa pontual.
 */
export function createSupabaseAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error(
      'Cliente admin do Supabase requer NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY.',
    );
  }

  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
