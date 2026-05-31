'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { eq, and, desc } from 'drizzle-orm';
import { getActiveTenantContext } from '@/lib/auth/get-tenant-context';
import { getDb, withTransactionContext } from '@/lib/db/client';
import {
  ptsResponses,
  ptsEvolutions,
  patients,
  predefinedActions,
  professionalsToUnits,
  serviceUnits,
  profiles,
  type ServiceUnitType,
} from '@/lib/db/schema';
import { getClinicalAiSuggestions } from '@/lib/pts/ai-recommender';
import { PtsSchema } from '@/validations/pts-schema';
import type { TenantContext } from '@/lib/tenant-context';
import { RndsQueueService } from '@/modules/rnds/services/rnds-queue.service';
import { getServerEnv } from '@/lib/env';

export type PtsStatus = 'draft' | 'completed';

type Database = ReturnType<typeof getDb>;

/**
 * Resolve a unidade de origem do PTS para rastreabilidade.
 * Prioriza o "Local de Atuação Ativo" do profissional (`ctx.activeUnitId`,
 * controlado pelo seletor de contexto); cai para o vínculo primário.
 */
async function resolveOriginUnit(
  db: Database | any,
  ctx: TenantContext,
): Promise<{ unitId: string; unitType: ServiceUnitType } | null> {
  // Unidade ativa selecionada no header — fonte primária da rastreabilidade.
  if (ctx.activeUnitId) {
    const [active] = await db
      .select({ unitId: serviceUnits.id, unitType: serviceUnits.type })
      .from(serviceUnits)
      .where(and(eq(serviceUnits.id, ctx.activeUnitId), eq(serviceUnits.tenantId, ctx.tenantId)))
      .limit(1);
    if (active) return active;
  }

  // Fallback: vínculo primário do profissional.
  const [row] = await db
    .select({ unitId: professionalsToUnits.unitId, unitType: serviceUnits.type })
    .from(professionalsToUnits)
    .innerJoin(serviceUnits, eq(serviceUnits.id, professionalsToUnits.unitId))
    .where(
      and(
        eq(professionalsToUnits.professionalId, ctx.userId),
        eq(serviceUnits.tenantId, ctx.tenantId),
      ),
    )
    .orderBy(desc(professionalsToUnits.isPrimary))
    .limit(1);

  return row ?? null;
}

export async function savePtsDocument(
  patientId: string,
  data: any, // Use any for simplicity in this transition
  status: PtsStatus,
) {
  const ctx = await getActiveTenantContext();
  if (!ctx) redirect('/login');

  const rndsEnabled = getServerEnv().RNDS_ENABLED;

  const scores = data.scores || {};
  const suggestedGoals = data.suggestedActions || [];

  // Clean up data before saving to 'data' field
  const { scores: _, risks: __, suggestedActions: ___, ...formData } = data;
  const isCompleted = status === 'completed';

  await withTransactionContext(ctx.userId, ctx.tenantId, async (tx) => {
    // Rastreabilidade intersetorial: quem e de qual unidade gerou o PTS.
    const originUnit = await resolveOriginUnit(tx, ctx);

    const existing = await tx
      .select({ id: ptsResponses.id })
      .from(ptsResponses)
      .where(and(eq(ptsResponses.patientId, patientId), eq(ptsResponses.tenantId, ctx.tenantId)))
      .limit(1);

    if (existing.length > 0) {
      await tx
        .update(ptsResponses)
        .set({
          data: formData,
          scores,
          suggestedGoals,
          status,
          isLocked: isCompleted,
          professionalId: ctx.userId,
          unitId: originUnit?.unitId ?? null,
          unitType: originUnit?.unitType ?? null,
          ...(isCompleted && {
            nextReviewAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          }),
          updatedAt: new Date(),
        })
        .where(eq(ptsResponses.id, existing[0].id));
    } else {
      await tx.insert(ptsResponses).values({
        tenantId: ctx.tenantId,
        patientId,
        status,
        isLocked: isCompleted,
        professionalId: ctx.userId,
        unitId: originUnit?.unitId ?? null,
        unitType: originUnit?.unitType ?? null,
        ...(isCompleted && {
          nextReviewAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        }),
        createdBy: ctx.userId,
        data: formData,
        scores,
        suggestedGoals,
      });
    }

    // Sync lat/lon/fullAddress/socialName back to the patients table
    const addr = formData.fullAddress as string | undefined;
    const lat = formData.lat as number | null | undefined;
    const lon = formData.lon as number | null | undefined;
    const socialName = formData.socialName as string | undefined;

    if (addr !== undefined || lat !== undefined || socialName !== undefined) {
      await tx
        .update(patients)
        .set({
          ...(addr !== undefined && { fullAddress: addr }),
          ...(lat !== undefined && { lat: lat ?? undefined }),
          ...(lon !== undefined && { lon: lon ?? undefined }),
          ...(socialName !== undefined && { socialName }),
          updatedAt: new Date(),
        })
        .where(and(eq(patients.id, patientId), eq(patients.tenantId, ctx.tenantId)));
    }

    // Se concluído, RNDS habilitado e unidade de origem for SAÚDE ('HEALTH'), enfileira na RNDS (Transactional Outbox)
    if (rndsEnabled && isCompleted && originUnit?.unitType === 'HEALTH') {
      // Busca paciente
      const [patient] = await tx
        .select()
        .from(patients)
        .where(and(eq(patients.id, patientId), eq(patients.tenantId, ctx.tenantId)))
        .limit(1);

      // Busca profissional
      const [prof] = await tx
        .select()
        .from(profiles)
        .where(eq(profiles.id, ctx.userId))
        .limit(1);

      if (patient) {
        // Busca CNES real da unidade
        let unitCnes = '9999999';
        if (originUnit?.unitId) {
          const [unitRow] = await tx
            .select({ cnes: serviceUnits.cnes })
            .from(serviceUnits)
            .where(and(eq(serviceUnits.id, originUnit.unitId), eq(serviceUnits.tenantId, ctx.tenantId)))
            .limit(1);
          if (unitRow?.cnes) {
            unitCnes = unitRow.cnes;
          }
        }

        // Monta DTO do Registro de Atendimento Clínico (RAC) compatível com racSchema
        const rndsGender1: 'unknown' | 'male' | 'female' | 'other' =
          patient.gender === 'male' ? 'male' :
          patient.gender === 'female' ? 'female' :
          patient.gender === 'other' ? 'other' : 'unknown';
        const patientDto = {
          fullName: patient.fullName,
          cpf: patient.cpf,
          cns: patient.cns,
          motherName: patient.motherName || 'Mãe não informada',
          birthDate: patient.birthDate ? new Date(patient.birthDate).toISOString().split('T')[0] : '2000-01-01',
          gender: rndsGender1,
          raceCode: '99', // RNDS Sem informação
          birthCountryCode: 'BRA',
          birthCityCode: '3550308',
          postalCode: '',
          fullAddress: patient.fullAddress || '',
        };

        const encounterDto = {
          status: 'finished' as const,
          priorityCode: '1', // 1 = Eletivo / Rotina
          periodStart: new Date().toISOString(),
          periodEnd: new Date().toISOString(),
          cnes: unitCnes,
          participant: {
            fullName: prof?.fullName || 'Profissional de Saúde do PTS',
            cnsOrCpf: prof?.cpf || '00000000191',
            cbo: '251510', // CBO padrão de Psicólogo
          }
        };

        const rndsQueue = new RndsQueueService(ctx);
        await rndsQueue.enqueueRac({
          status: 'final',
          categoryCode: '1',
          date: new Date().toISOString(),
          title: 'Registro de Atendimento Clínico - PTS',
          patient: patientDto,
          encounter: encounterDto,
          diagnosticos: [
            {
              code: 'F99',
              display: 'Transtorno mental não especificado (PTS)',
              system: 'http://hl7.org/fhir/sid/cid-10' as const,
              type: 'primary' as const
            }
          ],
          sinaisVitais: [],
          alergias: [],
          prescricoes: []
        }, { tx });
      }
    }
  });

  revalidatePath(`/patients/${patientId}/pts`);
  revalidatePath('/dashboard');
}

export async function loadPtsDocument(patientId: string) {
  const ctx = await getActiveTenantContext();
  if (!ctx) return null;

  return withTransactionContext(ctx.userId, ctx.tenantId, async (tx) => {
    const [doc] = await tx
      .select()
      .from(ptsResponses)
      .where(and(eq(ptsResponses.patientId, patientId), eq(ptsResponses.tenantId, ctx.tenantId)))
      .limit(1);

    if (!doc) return null;

    // Reconstruct the form data object
    return {
      ...doc,
      data: {
        ...(doc.data as Record<string, unknown>),
        scores: doc.scores,
        suggestedActions: doc.suggestedGoals,
      },
    };
  });
}

export async function generateAiSuggestions(formData: PtsSchema) {
  const ctx = await getActiveTenantContext();
  if (!ctx) {
    throw new Error('Unauthorized');
  }

  try {
    const result = await getClinicalAiSuggestions(formData);
    return result;
  } catch (error) {
    console.error('[Server Action] AI Suggestion generation failed:', error);
    throw error;
  }
}

export async function getPredefinedActions() {
  const ctx = await getActiveTenantContext();
  if (!ctx) return [];

  return withTransactionContext(ctx.userId, ctx.tenantId, async (tx) => {
    return await tx.select().from(predefinedActions);
  });
}

export async function createPtsEvolution(
  ptsId: string,
  patientId: string,
  data: any,
  status: PtsStatus,
) {
  const ctx = await getActiveTenantContext();
  if (!ctx) redirect('/login');

  const rndsEnabled = getServerEnv().RNDS_ENABLED;
  const scores = data.scores || {};
  const { scores: _, risks: __, suggestedActions: ___, ...formData } = data;

  const isCompleted = status === 'completed';

  await withTransactionContext(ctx.userId, ctx.tenantId, async (tx) => {
    // Rastreabilidade intersetorial da evolução.
    const originUnit = await resolveOriginUnit(tx, ctx);

    const evolutions = await tx
      .select({ version: ptsEvolutions.version })
      .from(ptsEvolutions)
      .where(eq(ptsEvolutions.ptsId, ptsId))
      .orderBy(desc(ptsEvolutions.version))
      .limit(1);

    const nextVersion = evolutions.length > 0 ? evolutions[0].version + 1 : 2;

    await tx.insert(ptsEvolutions).values({
      ptsId,
      tenantId: ctx.tenantId,
      patientId,
      version: nextVersion,
      status,
      professionalId: ctx.userId,
      unitId: originUnit?.unitId ?? null,
      unitType: originUnit?.unitType ?? null,
      createdBy: ctx.userId,
      data: formData,
      scores,
    });

    if (isCompleted) {
      await tx
        .update(ptsResponses)
        .set({
          nextReviewAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          updatedAt: new Date(),
        })
        .where(eq(ptsResponses.id, ptsId));

      // Se RNDS habilitado e unidade de origem for SAÚDE ('HEALTH'), enfileira na RNDS (Transactional Outbox)
      if (rndsEnabled && originUnit?.unitType === 'HEALTH') {
        // Busca paciente
        const [patient] = await tx
          .select()
          .from(patients)
          .where(and(eq(patients.id, patientId), eq(patients.tenantId, ctx.tenantId)))
          .limit(1);

        // Busca profissional
        const [prof] = await tx
          .select()
          .from(profiles)
          .where(eq(profiles.id, ctx.userId))
          .limit(1);

        if (patient) {
          // Busca CNES real da unidade
          let unitCnes = '9999999';
          if (originUnit?.unitId) {
            const [unitRow] = await tx
              .select({ cnes: serviceUnits.cnes })
              .from(serviceUnits)
              .where(and(eq(serviceUnits.id, originUnit.unitId), eq(serviceUnits.tenantId, ctx.tenantId)))
              .limit(1);
            if (unitRow?.cnes) {
              unitCnes = unitRow.cnes;
            }
          }

          // Monta DTO do Registro de Atendimento Clínico (RAC) compatível com racSchema
          const rndsGender2: 'unknown' | 'male' | 'female' | 'other' =
            patient.gender === 'male' ? 'male' :
            patient.gender === 'female' ? 'female' :
            patient.gender === 'other' ? 'other' : 'unknown';
          const patientDto = {
            fullName: patient.fullName,
            cpf: patient.cpf,
            cns: patient.cns,
            motherName: patient.motherName || 'Mãe não informada',
            birthDate: patient.birthDate ? new Date(patient.birthDate).toISOString().split('T')[0] : '2000-01-01',
            gender: rndsGender2,
            raceCode: '99', // RNDS Sem informação
            birthCountryCode: 'BRA',
            birthCityCode: '3550308',
            postalCode: '',
            fullAddress: patient.fullAddress || '',
          };

          const encounterDto = {
            status: 'finished' as const,
            priorityCode: '1', // 1 = Eletivo / Rotina
            periodStart: new Date().toISOString(),
            periodEnd: new Date().toISOString(),
            cnes: unitCnes,
            participant: {
              fullName: prof?.fullName || 'Profissional de Saúde do PTS',
              cnsOrCpf: prof?.cpf || '00000000191',
              cbo: '251510', // CBO padrão de Psicólogo
            }
          };

          const rndsQueue = new RndsQueueService(ctx);
          await rndsQueue.enqueueRac({
            status: 'final',
            categoryCode: '1',
            date: new Date().toISOString(),
            title: 'Registro de Atendimento Clínico - Evolução PTS',
            patient: patientDto,
            encounter: encounterDto,
            diagnosticos: [
              {
                code: 'F99',
                display: 'Transtorno mental não especificado (PTS)',
                system: 'http://hl7.org/fhir/sid/cid-10' as const,
                type: 'primary' as const
              }
            ],
            sinaisVitais: [],
            alergias: [],
            prescricoes: []
          }, { tx });
        }
      }
    }
  });

  revalidatePath(`/patients/${patientId}/pts/evolution`);
  revalidatePath(`/patients/${patientId}`);
}

export async function getPtsEvolutions(ptsId: string) {
  const ctx = await getActiveTenantContext();
  if (!ctx) return [];

  return withTransactionContext(ctx.userId, ctx.tenantId, async (tx) => {
    return await tx
      .select()
      .from(ptsEvolutions)
      .where(and(eq(ptsEvolutions.ptsId, ptsId), eq(ptsEvolutions.tenantId, ctx.tenantId)))
      .orderBy(desc(ptsEvolutions.createdAt));
  });
}
