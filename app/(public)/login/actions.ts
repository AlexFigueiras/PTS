'use server';

import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export type LoginState = { error: string | null };

export async function loginAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  let to = '/dashboard';

  try {
    const email = (formData.get('email') as string | null)?.trim() ?? '';
    const password = (formData.get('password') as string | null) ?? '';

    if (!email || !password) {
      return { error: 'Preencha e-mail e senha.' };
    }

    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      console.error('Missing Supabase environment variables.');
      return { error: 'Erro de configuração do servidor. Contate o suporte.' };
    }

    const supabase = await createSupabaseServerClient();
    const { data: authData, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error || !authData.user) {
      console.error('[login] auth error:', error?.message);
      return { error: 'E-mail ou senha incorretos.' };
    }

    console.log('[login] auth ok, userId:', authData.user.id);

    const { data: memberships } = await supabase
      .from('tenant_members')
      .select('tenant_id')
      .eq('user_id', authData.user.id)
      .limit(1);
    const membership = memberships?.[0] ? { tenantId: memberships[0].tenant_id as string } : undefined;

    console.log('[login] membership found:', membership ?? 'NONE');

    if (membership) {
      const cookieStore = await cookies();
      cookieStore.set('active_tenant_id', membership.tenantId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 30,
      });
      console.log('[login] cookie active_tenant_id set:', membership.tenantId);
    } else {
      console.error('[login] FATAL: user has no tenant membership, cannot set cookie');
    }

    const rawRedirect = formData.get('redirectTo') as string | null;
    to = rawRedirect?.startsWith('/') && !rawRedirect.startsWith('//') ? rawRedirect : '/dashboard';
    console.log('[login] redirecting to:', to);
  } catch (err) {
    console.error('Unexpected error in loginAction:', err);
    return { error: 'Ocorreu um erro inesperado. Tente novamente mais tarde.' };
  }

  // Redirect MUST be outside try/catch to work in Server Actions
  redirect(to);
}
