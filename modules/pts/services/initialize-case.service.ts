import { and, eq } from 'drizzle-orm';
import { withTransactionContext } from '@/lib/db/client';
import { serviceUnits, patients, ptsCases, type PtsCase, type PtsPlan } from '@/lib/db/schema';
import { withAudit } from '@/lib/audit/with-audit';
import { requireAnyRole, ForbiddenError } from '@/lib/auth/authorization';
import { BaseService } from '@/services/base.service';
import type { TenantContext } from '@/lib/tenant-context';
import { PtsCaseRepository } from '../repositories/pts-case.repository';
import { PtsPlanRepository } from '../repositories/pts-plan.repository';

export type InitializeCaseInput = {
  patientId: string;
  legalMeasure?: string | null;
  mandatoryReviewDate?: Date | null;
};

export type InitializeCaseOutput = {
  case: PtsCase;
  plan: PtsPlan;
};

const initializeCaseAudited = withAudit<InitializeCaseInput, InitializeCaseOutput>(
  {
    action: 'create',
    entityType: 'pts_case',
    entityId: (_, output) => output?.case.id,
    metadata: (input) => ({
      patientId: input.patientId,
      legalMeasure: input.legalMeasure,
    }),
  },
  async (ctx: TenantContext, input: InitializeCaseInput): Promise<InitializeCaseOutput> => {
    // 1. RBAC check
    requireAnyRole(ctx, ['MANAGER', 'PROFESSIONAL']);

    // 2. Validate activeUnitId
    if (!ctx.activeUnitId) {
      throw new ForbiddenError(
        'Acesso negado: o profissional precisa ter uma unidade de atuação ativa (active_unit_id) para inicializar casos do PTS.'
      );
    }

    return await withTransactionContext(ctx.userId, ctx.tenantId, async (tx) => {
      // 3. Fetch active unit metadata to determine plan type
      const [unit] = await tx
        .select()
        .from(serviceUnits)
        .where(and(eq(serviceUnits.id, ctx.activeUnitId!), eq(serviceUnits.tenantId, ctx.tenantId)))
        .limit(1);

      if (!unit) {
        throw new ForbiddenError(
          'Acesso negado: a unidade de atuação ativa selecionada não foi encontrada ou não pertence a este município.'
        );
      }

      // 4. Verify patient existence in the tenant (Territorial Validation)
      const [patient] = await tx
        .select()
        .from(patients)
        .where(and(eq(patients.id, input.patientId), eq(patients.tenantId, ctx.tenantId)))
        .limit(1);

      if (!patient) {
        throw new Error('Cidadão/Paciente não foi encontrado ou não pertence a este município.');
      }

      // Definição de Plano Único Compartilhado (protótipo unificado)
      const planType = 'PTS';

      const caseRepo = new PtsCaseRepository(ctx, tx);
      const planRepo = new PtsPlanRepository(ctx, tx);

      // Check for active case duplicate
      const activeCase = await caseRepo.findActiveByPatientId(input.patientId);
      let ptsCase: PtsCase;

      if (activeCase) {
        if (activeCase.status === 'observacao') {
          // Acolhimento / Assumir Caso: transita de 'observacao' para 'acompanhamento' (RT associado)
          await tx
            .update(ptsCases)
            .set({ status: 'acompanhamento', updatedAt: new Date() })
            .where(eq(ptsCases.id, activeCase.id));
          ptsCase = { ...activeCase, status: 'acompanhamento', updatedAt: new Date() };
        } else {
          throw new Error('Cidadão já possui um caso intersetorial ativo neste município.');
        }
      } else {
        // Create Case
        ptsCase = await caseRepo.createCase(input.patientId, 'radar');
      }

      // Create Plan setting professional as Reference Tech (RT)
      const reviewDate = input.mandatoryReviewDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days default
      const plan = await planRepo.createPlan(ptsCase.id, planType, ctx.userId, {
        legalMeasure: input.legalMeasure || null,
        mandatoryReviewDate: reviewDate,
      });

      return { case: ptsCase, plan };
    });
  }
);

export class InitializeCaseService extends BaseService {
  async execute(input: InitializeCaseInput): Promise<InitializeCaseOutput> {
    return initializeCaseAudited(this.ctx, input);
  }
}
