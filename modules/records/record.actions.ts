'use server';

import { redirect } from 'next/navigation';
import { getActiveTenantContext } from '@/lib/auth/get-tenant-context';
import { ForbiddenError } from '@/lib/auth/authorization';
import { revalidateTenantResource } from '@/lib/cache';
import { createRecordSchema, updateRecordSchema } from './record.dto';
import { CreateRecordService } from './create-record.service';
import { UpdateRecordService } from './update-record.service';
import { FinalizeRecordService } from './finalize-record.service';
import { DeleteRecordService } from './delete-record.service';

export type RecordActionState = { error: string | null };

export async function createRecordAction(
  _prev: RecordActionState,
  formData: FormData,
): Promise<RecordActionState> {
  const ctx = await getActiveTenantContext();
  if (!ctx) return { error: 'Sessão expirada. Faça login novamente.' };

  const parsed = createRecordSchema.safeParse({
    patientId: formData.get('patientId'),
    type: formData.get('type'),
    title: formData.get('title') || null,
    content: formData.get('content'),
    sessionDate: formData.get('sessionDate'),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Dados inválidos.' };
  }

  let recordId: string;
  try {
    const service = new CreateRecordService(ctx);
    const record = await service.execute(parsed.data);
    revalidateTenantResource(ctx.tenantId, 'records');
    recordId = record.id;
  } catch (err) {
    if (err instanceof ForbiddenError) return { error: 'Sem permissão para criar registros clínicos.' };
    return { error: 'Erro ao criar registro. Tente novamente.' };
  }

  redirect(`/patients/${parsed.data.patientId}/records/${recordId}`);
}

export async function updateRecordAction(
  _prev: RecordActionState,
  formData: FormData,
): Promise<RecordActionState> {
  const ctx = await getActiveTenantContext();
  if (!ctx) return { error: 'Sessão expirada. Faça login novamente.' };

  const parsed = updateRecordSchema.safeParse({
    id: formData.get('id'),
    type: formData.get('type') || undefined,
    title: formData.get('title') || null,
    content: formData.get('content') || undefined,
    sessionDate: formData.get('sessionDate') || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Dados inválidos.' };
  }

  try {
    const service = new UpdateRecordService(ctx);
    await service.execute(parsed.data);
    revalidateTenantResource(ctx.tenantId, 'records');
    return { error: null };
  } catch (err) {
    if (err instanceof ForbiddenError) return { error: 'Sem permissão para editar este registro.' };
    if (err instanceof Error && err.message.includes('finalizados')) return { error: err.message };
    return { error: 'Erro ao salvar registro. Tente novamente.' };
  }
}

export async function finalizeRecordFormAction(formData: FormData): Promise<void> {
  const ctx = await getActiveTenantContext();
  if (!ctx) return;

  const id = formData.get('id');
  const patientId = formData.get('patientId');
  if (!id || typeof id !== 'string' || !patientId || typeof patientId !== 'string') return;

  try {
    const service = new FinalizeRecordService(ctx);
    await service.execute(id);
    revalidateTenantResource(ctx.tenantId, 'records');
  } catch {
    return;
  }

  redirect(`/patients/${patientId}/records/${id}`);
}

export async function deleteRecordFormAction(formData: FormData): Promise<void> {
  const ctx = await getActiveTenantContext();
  if (!ctx) return;

  const id = formData.get('id');
  const patientId = formData.get('patientId');
  if (!id || typeof id !== 'string' || !patientId || typeof patientId !== 'string') return;

  try {
    const service = new DeleteRecordService(ctx);
    await service.execute(id);
    revalidateTenantResource(ctx.tenantId, 'records');
  } catch {
    return;
  }

  redirect(`/patients/${patientId}/records`);
}
