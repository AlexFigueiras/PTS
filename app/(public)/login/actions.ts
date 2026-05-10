'use server';

import { redirect } from 'next/navigation';
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
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      console.error('Login error:', error.message);
      return { error: 'E-mail ou senha incorretos.' };
    }

    const rawRedirect = formData.get('redirectTo') as string | null;
    // Só aceita caminhos relativos para evitar open redirect
    to = rawRedirect?.startsWith('/') && !rawRedirect.startsWith('//') ? rawRedirect : '/dashboard';
  } catch (err) {
    console.error('Unexpected error in loginAction:', err);
    return { error: 'Ocorreu um erro inesperado. Tente novamente mais tarde.' };
  }

  // Redirect MUST be outside try/catch to work in Server Actions
  redirect(to);
}
