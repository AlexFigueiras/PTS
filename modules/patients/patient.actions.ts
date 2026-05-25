'use server';

import { redirect } from 'next/navigation';
import { getActiveTenantContext } from '@/lib/auth/get-tenant-context';
import { ForbiddenError } from '@/lib/auth/authorization';
import { revalidateTenantResource } from '@/lib/cache';
import { getLogger } from '@/lib/logger';
import { createPatientSchema, updatePatientSchema } from './patient.dto';
import { CreatePatientService } from './create-patient.service';
import { UpdatePatientService } from './update-patient.service';

export type PatientActionState = { error: string | null };

function friendlyUniqueViolation(err: unknown): string | null {
  const cause = (err as { cause?: unknown })?.cause;
  const pg = (cause ?? err) as { code?: string; constraint?: string; detail?: string };
  if (pg?.code !== '23505') return null;
  if (pg.constraint?.includes('cpf')) return 'Já existe um cidadão cadastrado com este CPF.';
  if (pg.constraint?.includes('cns')) return 'Já existe um cidadão cadastrado com este CNS.';
  if (pg.constraint?.includes('nis')) return 'Já existe um cidadão cadastrado com este NIS.';
  if (pg.constraint?.includes('email')) return 'Já existe um cidadão cadastrado com este e-mail.';
  return 'Registro duplicado: já existe um cidadão com um destes identificadores.';
}

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
    const friendly = friendlyUniqueViolation(err);
    if (friendly) return { error: friendly };
    getLogger().error(
      {
        err,
        cause: (err as { cause?: unknown })?.cause,
        fullName: parsed.data.fullName,
        tenantId: ctx.tenantId,
        userId: ctx.userId,
      },
      'createPatientAction failed',
    );
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
    const friendly = friendlyUniqueViolation(err);
    if (friendly) return { error: friendly };
    getLogger().error(
      {
        err,
        cause: (err as { cause?: unknown })?.cause,
        id: parsed.data.id,
        tenantId: ctx.tenantId,
        userId: ctx.userId,
      },
      'updatePatientAction failed',
    );
    return { error: 'Erro ao atualizar cidadão. Tente novamente.' };
  }
}
