'use server';

import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { getActiveTenantContext } from '@/lib/auth/get-tenant-context';
import { listUserUnits } from './unit.queries';

export type SetActiveUnitState = { error: string | null };

/**
 * Troca o "Local de Atuação Ativo" do profissional (multi-vínculo).
 *
 * Valida que o usuário realmente possui vínculo com a unidade alvo antes de
 * gravar o cookie `active_unit_id`. A unidade ativa passa a ser usada nas
 * leituras e mutações do PTS em tempo de execução.
 */
export async function setActiveUnitAction(unitId: string): Promise<SetActiveUnitState> {
  const ctx = await getActiveTenantContext();
  if (!ctx) return { error: 'Sessão expirada.' };

  const units = await listUserUnits(ctx);
  if (!units.some((u) => u.id === unitId)) {
    return { error: 'Você não possui vínculo com esta unidade.' };
  }

  const cookieStore = await cookies();
  cookieStore.set('active_unit_id', unitId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  });

  revalidatePath('/', 'layout');
  return { error: null };
}
