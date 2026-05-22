'use server';

import { redirect } from 'next/navigation';
import { getActiveTenantContext } from '@/lib/auth/get-tenant-context';
import { ForbiddenError } from '@/lib/auth/authorization';
import { revalidateTenantResource } from '@/lib/cache';
import { createPatientSchema, updatePatientSchema } from './patient.dto';
import { CreatePatientService } from './create-patient.service';
import { UpdatePatientService } from './update-patient.service';

export type PatientActionState = { error: string | null };

export async function createPatientAction(
  _prev: PatientActionState,
  formData: FormData,
): Promise<PatientActionState> {
  const ctx = await getActiveTenantContext();
  if (!ctx) {
    return { error: 'Sessão expirada. Faça login novamente.' };
  }

  const parsed = createPatientSchema.safeParse({
    fullName: formData.get('fullName'),
    socialName: formData.get('socialName') || null,
    motherName: formData.get('motherName') || null,
    birthDate: formData.get('birthDate') || null,
    cpf: formData.get('cpf') || null,
    nis: formData.get('nis') || null,
    cns: formData.get('cns') || null,
    gender: formData.get('gender') || null,
    phone: formData.get('phone') || null,
    email: formData.get('email') || null,
    fullAddress: formData.get('fullAddress') || null,
    status: formData.get('status') || 'active',
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Dados inválidos.' };
  }

  let patientId: string;
  try {
    const service = new CreatePatientService(ctx);
    const patient = await service.execute(parsed.data);
    revalidateTenantResource(ctx.tenantId, 'patients');
    patientId = patient.id;
  } catch (err) {
    if (err instanceof ForbiddenError) return { error: 'Sem permissão para criar cidadãos.' };
    return { error: 'Erro ao criar cidadão. Tente novamente.' };
  }

  redirect(`/patients/${patientId}`);
}

export async function updatePatientAction(
  _prev: PatientActionState,
  formData: FormData,
): Promise<PatientActionState> {
  const ctx = await getActiveTenantContext();
  if (!ctx) return { error: 'Sessão expirada. Faça login novamente.' };

  const parsed = updatePatientSchema.safeParse({
    id: formData.get('id'),
    fullName: formData.get('fullName'),
    socialName: formData.get('socialName') || null,
    motherName: formData.get('motherName') || null,
    birthDate: formData.get('birthDate') || null,
    cpf: formData.get('cpf') || null,
    nis: formData.get('nis') || null,
    cns: formData.get('cns') || null,
    gender: formData.get('gender') || null,
    phone: formData.get('phone') || null,
    email: formData.get('email') || null,
    fullAddress: formData.get('fullAddress') || null,
    status: formData.get('status') || 'active',
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Dados inválidos.' };
  }

  try {
    const service = new UpdatePatientService(ctx);
    await service.execute(parsed.data);
    revalidateTenantResource(ctx.tenantId, 'patients');
    return { error: null };
  } catch (err) {
    if (err instanceof ForbiddenError) return { error: 'Sem permissão para editar cidadãos.' };
    return { error: 'Erro ao atualizar cidadão. Tente novamente.' };
  }
}
