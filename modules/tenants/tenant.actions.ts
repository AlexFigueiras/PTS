'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { getActiveTenantContext } from '@/lib/auth/get-tenant-context';
import { ForbiddenError } from '@/lib/auth/authorization';
import { UpdateTenantService } from './update-tenant.service';

export type TenantActionState = { error: string | null };

const updateTenantSchema = z.object({
  name: z.string().min(2, 'Nome deve ter ao menos 2 caracteres').max(100),
});

export async function updateTenantAction(
  _prev: TenantActionState,
  formData: FormData,
): Promise<TenantActionState> {
  const ctx = await getActiveTenantContext();
  if (!ctx) return { error: 'Sessão expirada. Faça login novamente.' };

  const parsed = updateTenantSchema.safeParse({ name: formData.get('name') });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Dados inválidos.' };

  try {
    await new UpdateTenantService(ctx).execute(parsed.data);
    revalidatePath('/settings');
    return { error: null };
  } catch (err) {
    if (err instanceof ForbiddenError) return { error: 'Sem permissão para editar as configurações.' };
    return { error: 'Erro ao salvar. Tente novamente.' };
  }
}
