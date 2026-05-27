import { BaseService } from '@/services/base.service';
import { EnqueueJobService } from '@/modules/jobs/services/enqueue-job.service';
import { racSchema, type RacDto } from '../dto/rac.dto';
import { type BackgroundJob } from '@/lib/db/schema/background-jobs';
import { getDb } from '@/lib/db/client';
import { and, eq } from 'drizzle-orm';
import { patients, profiles, serviceUnits, ptsResponses } from '@/lib/db/schema';

export class RndsQueueService extends BaseService {
  /**
   * Enfileira o envio de um Registro de Atendimento Clínico (RAC) para a RNDS de forma resiliente.
   * Realiza validação Zod estrita síncrona para impedir o enfileiramento de payloads incorretos.
   * Suporta opcionalmente uma instância de transação do Drizzle (tx) para atomicidade transacional (Transactional Outbox).
   *
   * @param dto Payload completo do Registro de Atendimento Clínico
   * @param options Configurações opcionais como transação ativa (tx)
   */
  async enqueueRac(dto: RacDto, options?: { tx?: any }): Promise<BackgroundJob> {
    // 1. Validação estrita Zod síncrona no hot path
    // Isso garante que erros de schema de negócio (como falta de CPF/CNS em contingência)
    // falhem imediatamente na UI do usuário antes de tocar na fila.
    const validatedDto = racSchema.parse(dto);

    // 2. Enfileira o job na tabela transacional background_jobs sob o tenant ativo
    const enqueueJobService = new EnqueueJobService(this.ctx);
    
    return await enqueueJobService.execute('rnds', validatedDto as unknown as Record<string, unknown>, {
      maxRetries: 5, // Limite de 5 tentativas com backoff exponencial + jitter
      tx: options?.tx,
    });
  }

  /**
   * Reconstrói e reserializa o payload do job RNDS trazendo os dados cadastrais mais recentes
   * dos cidadãos (patients), profissionais (profiles) e unidades (service_units) para evitar stale payloads.
   */
  async rebuildPayload(job: BackgroundJob): Promise<Record<string, unknown>> {
    if (!job.payload || typeof job.payload !== 'object') {
      return job.payload as Record<string, unknown>;
    }

    const payload = JSON.parse(JSON.stringify(job.payload)) as Record<string, any>;
    const db = getDb();

    // A) Sincroniza dados frescos do Paciente
    let freshPatientId: string | null = null;
    if (payload.patient && typeof payload.patient === 'object') {
      const p = payload.patient;
      const conditions = [eq(patients.tenantId, this.ctx.tenantId)];

      if (p.cpf) {
        conditions.push(eq(patients.cpf, p.cpf.replace(/\D/g, '')));
      } else if (p.cns) {
        conditions.push(eq(patients.cns, p.cns.replace(/\D/g, '')));
      } else if (p.fullName) {
        conditions.push(eq(patients.fullName, p.fullName));
      }

      const [freshPatient] = await db
        .select()
        .from(patients)
        .where(and(...conditions))
        .limit(1);

      if (freshPatient) {
        freshPatientId = freshPatient.id;
        payload.patient = {
          ...p,
          fullName: freshPatient.fullName,
          birthDate: freshPatient.birthDate || p.birthDate || '1990-01-01',
          gender: (freshPatient.gender === 'female' || freshPatient.gender === 'F' ? 'F' : 'M'),
          cpf: freshPatient.cpf || p.cpf || null,
          cns: freshPatient.cns || p.cns || null,
          motherName: freshPatient.motherName || p.motherName || null,
          fullAddress: freshPatient.fullAddress || p.fullAddress || null,
        };
      }
    }

    // B) Sincroniza dados frescos do Profissional participante
    if (
      payload.encounter &&
      typeof payload.encounter === 'object' &&
      payload.encounter.participant &&
      typeof payload.encounter.participant === 'object'
    ) {
      const part = payload.encounter.participant;
      const conditions = [];

      if (part.cnsOrCpf) {
        conditions.push(eq(profiles.cpf, part.cnsOrCpf.replace(/\D/g, '')));
      } else if (part.fullName) {
        conditions.push(eq(profiles.fullName, part.fullName));
      }

      if (conditions.length > 0) {
        const [freshProf] = await db
          .select()
          .from(profiles)
          .where(and(...conditions))
          .limit(1);

        if (freshProf) {
          payload.encounter.participant = {
            ...part,
            fullName: freshProf.fullName || part.fullName,
            cnsOrCpf: freshProf.cpf || part.cnsOrCpf,
          };
        }
      }
    }

    // C) Sincroniza o CNES fresco da unidade de saúde (CNES Sync)
    if (payload.encounter && typeof payload.encounter === 'object') {
      let resolvedUnitId: string | null = null;

      // 1. Tenta resolver via o PTS do paciente
      if (freshPatientId) {
        const [ptsRes] = await db
          .select({ unitId: ptsResponses.unitId })
          .from(ptsResponses)
          .where(and(eq(ptsResponses.patientId, freshPatientId), eq(ptsResponses.tenantId, this.ctx.tenantId)))
          .limit(1);
        if (ptsRes?.unitId) {
          resolvedUnitId = ptsRes.unitId;
        }
      }

      // 2. Fallback para activeUnitId do contexto
      if (!resolvedUnitId && this.ctx.activeUnitId) {
        resolvedUnitId = this.ctx.activeUnitId;
      }

      if (resolvedUnitId) {
        const [unitRow] = await db
          .select({ cnes: serviceUnits.cnes })
          .from(serviceUnits)
          .where(and(eq(serviceUnits.id, resolvedUnitId), eq(serviceUnits.tenantId, this.ctx.tenantId)))
          .limit(1);
        if (unitRow?.cnes) {
          payload.encounter.cnes = unitRow.cnes;
        }
      }
    }

    // Valida o novo payload com Zod antes de retornar para garantir integridade estrutural
    racSchema.parse(payload);

    return payload;
  }
}
