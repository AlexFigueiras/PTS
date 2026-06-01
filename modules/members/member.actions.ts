'use server';

import { revalidatePath } from 'next/cache';
import { getActiveTenantContext } from '@/lib/auth/get-tenant-context';
import { ForbiddenError, requireRole } from '@/lib/auth/authorization';
import { MemberRepository } from './member.repository';
import { updateMemberRoleSchema, removeMemberSchema } from './member.dto';
import { withTransactionContext } from '@/lib/db/client';

export type MemberActionState = { error: string | null };

export async function updateMemberRoleAction(
  _prev: MemberActionState,
  formData: FormData,
): Promise<MemberActionState> {
  const ctx = await getActiveTenantContext();
  if (!ctx) return { error: 'Sessão expirada.' };

  try {
    requireRole(ctx, 'MANAGER');
  } catch {
    return { error: 'Sem permissão.' };
  }

  const parsed = updateMemberRoleSchema.safeParse({
    userId: formData.get('userId'),
    role: formData.get('role'),
  });
  if (!parsed.success) return { error: 'Dados inválidos.' };

  if (parsed.data.userId === ctx.userId) return { error: 'Não é possível alterar seu próprio papel.' };

  // Só o Administrador Geral concede o papel de Administrador.
  if (parsed.data.role === 'ADMIN' && ctx.role !== 'ADMIN') {
    return { error: 'Apenas o Administrador Geral pode conceder o papel de Administrador.' };
  }

  try {
    const success = await withTransactionContext(ctx.userId, ctx.tenantId, async (tx) => {
      const repo = new MemberRepository({ ...ctx, tx });
      return await repo.updateRole(parsed.data.userId, parsed.data.role);
    });
    if (!success) return { error: 'Usuário não encontrado ou não pertence a este município.' };
    revalidatePath('/settings/team');
    return { error: null };
  } catch (err) {
    if (err instanceof ForbiddenError) return { error: 'Sem permissão.' };
    return { error: 'Erro ao salvar. Tente novamente.' };
  }
}

export async function removeMemberFormAction(formData: FormData): Promise<void> {
  const ctx = await getActiveTenantContext();
  if (!ctx) return;

  try {
    requireRole(ctx, 'MANAGER');
  } catch {
    return;
  }

  const parsed = removeMemberSchema.safeParse({ userId: formData.get('userId') });
  if (!parsed.success) return;
  if (parsed.data.userId === ctx.userId) return;

  try {
    await withTransactionContext(ctx.userId, ctx.tenantId, async (tx) => {
      const repo = new MemberRepository({ ...ctx, tx });
      await repo.remove(parsed.data.userId);
    });
    revalidatePath('/settings/team');
  } catch {
    return;
  }
}
