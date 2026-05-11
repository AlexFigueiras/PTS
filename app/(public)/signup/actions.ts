'use server';

import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export type SignupState = { error: string | null; message: string | null };

export async function signupAction(
  _prev: SignupState,
  formData: FormData,
): Promise<SignupState> {
  let shouldRedirect = false;

  try {
    const email = (formData.get('email') as string | null)?.trim() ?? '';
    const password = (formData.get('password') as string | null) ?? '';
    const fullName = (formData.get('fullName') as string | null)?.trim() ?? '';
    const tenantName = (formData.get('tenantName') as string | null)?.trim() ?? '';

    if (!email || !password || !fullName) {
      return { error: 'Preencha nome, e-mail e senha.', message: null };
    }
    if (password.length < 8) {
      return { error: 'Senha deve ter ao menos 8 caracteres.', message: null };
    }

    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      console.error('Missing Supabase environment variables.');
      return { error: 'Erro de configuração do servidor.', message: null };
    }

    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          ...(tenantName ? { tenant_name: tenantName } : {}),
        },
      },
    });

    if (error) {
      console.error('[signup] error:', error.message);
      const friendly =
        error.message.toLowerCase().includes('already registered')
          ? 'Este e-mail já está cadastrado.'
          : 'Não foi possível criar a conta. Tente novamente.';
      return { error: friendly, message: null };
    }

    console.log('[signup] user created:', data.user?.id);

    if (!data.session) {
      return {
        error: null,
        message: 'Conta criada! Verifique seu e-mail para confirmar o cadastro antes de entrar.',
      };
    }

    shouldRedirect = true;
  } catch (err) {
    console.error('Unexpected error in signupAction:', err);
    return { error: 'Ocorreu um erro inesperado. Tente novamente mais tarde.', message: null };
  }

  if (shouldRedirect) redirect('/dashboard');
  return { error: null, message: null };
}
