'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getActiveTenantContext } from '@/lib/auth/get-tenant-context';
import { ForbiddenError } from '@/lib/auth/authorization';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { SendProfessionalInviteService, ActivateAccountService } from './invite.service';

export type InviteActionState = { error: string | null; success: string | null };

const sendProfessionalInviteSchema = z.object({
  fullName: z.string().min(2, 'Informe o nome completo.'),
  cpf: z
    .string()
    .regex(/^\d{3}\.\d{3}\.\d{3}-\d{2}$/, 'CPF inválido (formato: 000.000.000-00).'),
  email: z.string().email('E-mail inválido.'),
  professionalRegistry: z.string().min(1, 'Informe o registro/conselho.'),
  jobTitle: z.string().min(1, 'Informe o cargo.'),
  unitId: z.string().uuid('Selecione uma unidade.'),
  role: z.enum(['MANAGER', 'PROFESSIONAL']),
});

/**
 * Convida (puxa) um profissional para a plataforma. Pré-cadastra a conta,
 * vincula à unidade de origem e dispara o e-mail de ativação.
 */
export async function sendProfessionalInviteAction(
  _prev: InviteActionState,
  formData: FormData,
): Promise<InviteActionState> {
  const ctx = await getActiveTenantContext();
  if (!ctx) return { error: 'Sessão expirada.', success: null };

  const parsed = sendProfessionalInviteSchema.safeParse({
    fullName: formData.get('fullName'),
    cpf: formData.get('cpf'),
    email: formData.get('email'),
    professionalRegistry: formData.get('professionalRegistry'),
    jobTitle: formData.get('jobTitle'),
    unitId: formData.get('unitId'),
    role: formData.get('role') || 'PROFESSIONAL',
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Dados inválidos.', success: null };
  }

  try {
    const result = await new SendProfessionalInviteService(ctx).execute(parsed.data);
    revalidatePath('/settings/team');

    const success =
      result.kind === 'invited'
        ? `Convite de ativação enviado para ${result.email}.`
        : result.kind === 'linked'
          ? `${result.email} já tinha conta — novo vínculo de unidade adicionado.`
          : `${result.email} já está vinculado a esta unidade.`;

    return { error: null, success };
  } catch (err) {
    if (err instanceof ForbiddenError) return { error: err.message, success: null };
    if (err instanceof Error) return { error: err.message, success: null };
    return { error: 'Erro ao enviar convite. Tente novamente.', success: null };
  }
}

const activateAccountSchema = z
  .object({
    token: z.string().uuid('Token inválido.'),
    password: z.string().min(8, 'A senha deve ter ao menos 8 caracteres.'),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'As senhas não conferem.',
    path: ['confirmPassword'],
  });

export type ActivationActionState = { error: string | null };

/**
 * Ativa a conta pré-cadastrada: define a senha, marca o profile como ACTIVE,
 * autentica o profissional e o posiciona no dashboard da sua unidade.
 */
export async function activateAccountAction(
  _prev: ActivationActionState,
  formData: FormData,
): Promise<ActivationActionState> {
  const parsed = activateAccountSchema.safeParse({
    token: formData.get('token'),
    password: formData.get('password'),
    confirmPassword: formData.get('confirmPassword'),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Dados inválidos.' };
  }

  let activation;
  try {
    activation = await new ActivateAccountService().execute(
      parsed.data.token,
      parsed.data.password,
    );
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Erro ao ativar a conta.' };
  }

  // Autentica o profissional recém-ativado.
  const supabase = await createSupabaseServerClient();
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: activation.email,
    password: parsed.data.password,
  });
  if (signInError) {
    return { error: 'Conta ativada, mas o login automático falhou. Faça login manualmente.' };
  }

  const cookieStore = await cookies();
  const cookieOpts = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  };
  cookieStore.set('active_tenant_id', activation.tenantId, cookieOpts);
  if (activation.unitId) cookieStore.set('active_unit_id', activation.unitId, cookieOpts);

  redirect('/dashboard');
}
