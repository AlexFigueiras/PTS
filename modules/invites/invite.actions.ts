'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getActiveTenantContext } from '@/lib/auth/get-tenant-context';
import { requireAuthUser } from '@/lib/auth/get-user';
import { ForbiddenError } from '@/lib/auth/authorization';
import { CreateInviteService, AcceptInviteService } from './invite.service';

export type InviteActionState = { error: string | null };

const createInviteSchema = z.object({
  email: z.string().email('E-mail inválido'),
  role: z.enum(['admin', 'professional', 'assistant']),
});

export async function createInviteAction(
  _prev: InviteActionState,
  formData: FormData,
): Promise<InviteActionState> {
  const ctx = await getActiveTenantContext();
  if (!ctx) return { error: 'Sessão expirada.' };

  const parsed = createInviteSchema.safeParse({
    email: formData.get('email'),
    role: formData.get('role'),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Dados inválidos.' };

  try {
    await new CreateInviteService(ctx).execute(parsed.data.email, parsed.data.role);
    revalidatePath('/settings/team');
    return { error: null };
  } catch (err) {
    if (err instanceof ForbiddenError) return { error: 'Sem permissão para convidar.' };
    if (err instanceof Error) return { error: err.message };
    return { error: 'Erro ao enviar convite. Tente novamente.' };
  }
}

export async function acceptInviteAction(formData: FormData): Promise<void> {
  const token = formData.get('token');
  if (!token || typeof token !== 'string') return;

  let user;
  try {
    user = await requireAuthUser();
  } catch {
    redirect(`/login?redirect=/invite/${token}`);
  }

  let tenantId: string;
  try {
    tenantId = await new AcceptInviteService().execute(token, user.id);
  } catch (err) {
    redirect(`/invite/${token}?error=${encodeURIComponent(err instanceof Error ? err.message : 'Erro')}`);
  }

  const cookieStore = await cookies();
  cookieStore.set('active_tenant_id', tenantId, { path: '/', httpOnly: true, sameSite: 'lax' });
  redirect('/dashboard');
}
