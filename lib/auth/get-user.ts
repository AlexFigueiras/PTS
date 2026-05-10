import { cache } from 'react';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import type { AuthenticatedUser } from './types';

/**
 * Retorna o usuário autenticado (ou null) — cacheado por request via React.cache.
 * Escopo do cache: o render desta request. NUNCA cruza requests, logo NUNCA
 * vaza entre usuários ou tenants.
 *
 * Sempre passa por `supabase.auth.getUser()` (revalida o JWT no Auth server).
 * Nunca usar `getSession()` para autorização — ele lê do cookie sem revalidar.
 *
 * Retorno é a interface de domínio `AuthenticatedUser`, NÃO o tipo do Supabase
 * SDK — isolamos a app do provedor de auth.
 */
export const getAuthUser = cache(async (): Promise<AuthenticatedUser | null> => {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  return {
    id: user.id,
    email: user.email ?? null,
    emailVerified: !!user.email_confirmed_at,
    metadata: user.user_metadata ?? {},
  };
});

export class UnauthorizedError extends Error {
  constructor(message = 'Não autenticado') {
    super(message);
    this.name = 'UnauthorizedError';
  }
}

export async function requireAuthUser(): Promise<AuthenticatedUser> {
  const user = await getAuthUser();
  if (!user) throw new UnauthorizedError();
  return user;
}
