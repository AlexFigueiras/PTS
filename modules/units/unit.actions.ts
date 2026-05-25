'use server';

import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { getActiveTenantContext } from '@/lib/auth/get-tenant-context';
import { ForbiddenError } from '@/lib/auth/authorization';
import { listUserUnits } from './unit.queries';
import { createUnitSchema, updateUnitSchema } from './unit.dto';
import { CreateUnitService } from './create-unit.service';
import { UpdateUnitService } from './update-unit.service';
import { DeleteUnitService } from './delete-unit.service';

export type SetActiveUnitState = { error: string | null };
export type UnitActionState = { error: string | null; success: string | null };

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

/**
 * Cria uma nova unidade intersetorial.
 */
export async function createUnitAction(
  _prev: UnitActionState,
  formData: FormData,
): Promise<UnitActionState> {
  const ctx = await getActiveTenantContext();
  if (!ctx) return { error: 'Sessão expirada. Faça login novamente.', success: null };

  const rawData = {
    name: formData.get('name'),
    type: formData.get('type'),
    fullAddress: formData.get('fullAddress'),
    lat: formData.get('lat') ? parseFloat(formData.get('lat') as string) : null,
    lon: formData.get('lon') ? parseFloat(formData.get('lon') as string) : null,
    phone: formData.get('phone'),
  };

  const parsed = createUnitSchema.safeParse(rawData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Dados inválidos.', success: null };
  }

  try {
    await new CreateUnitService(ctx).execute(parsed.data);
    revalidatePath('/settings/units');
    return { error: null, success: 'Unidade criada com sucesso!' };
  } catch (err) {
    if (err instanceof ForbiddenError) {
      return { error: 'Acesso negado: apenas Administradores podem criar unidades.', success: null };
    }
    return { error: 'Erro interno ao criar unidade. Tente novamente.', success: null };
  }
}

/**
 * Atualiza uma unidade intersetorial existente.
 */
export async function updateUnitAction(
  _prev: UnitActionState,
  formData: FormData,
): Promise<UnitActionState> {
  const ctx = await getActiveTenantContext();
  if (!ctx) return { error: 'Sessão expirada. Faça login novamente.', success: null };

  const rawData = {
    id: formData.get('id'),
    name: formData.get('name'),
    type: formData.get('type'),
    fullAddress: formData.get('fullAddress'),
    lat: formData.get('lat') ? parseFloat(formData.get('lat') as string) : null,
    lon: formData.get('lon') ? parseFloat(formData.get('lon') as string) : null,
    phone: formData.get('phone'),
  };

  const parsed = updateUnitSchema.safeParse(rawData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Dados inválidos.', success: null };
  }

  try {
    const updated = await new UpdateUnitService(ctx).execute(parsed.data);
    if (!updated) {
      return { error: 'Unidade não encontrada ou não pertence a este município.', success: null };
    }
    revalidatePath('/settings/units');
    return { error: null, success: 'Unidade atualizada com sucesso!' };
  } catch (err) {
    if (err instanceof ForbiddenError) {
      return { error: 'Acesso negado: apenas Administradores podem editar unidades.', success: null };
    }
    return { error: 'Erro interno ao atualizar unidade. Tente novamente.', success: null };
  }
}

/**
 * Exclui uma unidade intersetorial.
 */
export async function deleteUnitAction(id: string): Promise<UnitActionState> {
  const ctx = await getActiveTenantContext();
  if (!ctx) return { error: 'Sessão expirada. Faça login novamente.', success: null };

  try {
    const deleted = await new DeleteUnitService(ctx).execute(id);
    if (!deleted) {
      return { error: 'Unidade não encontrada ou não pertence a este município.', success: null };
    }
    revalidatePath('/settings/units');
    return { error: null, success: 'Unidade excluída com sucesso!' };
  } catch (err) {
    if (err instanceof ForbiddenError) {
      return { error: 'Acesso negado: apenas Administradores podem excluir unidades.', success: null };
    }
    return { error: 'Erro interno ao excluir unidade. Tente novamente.', success: null };
  }
}
