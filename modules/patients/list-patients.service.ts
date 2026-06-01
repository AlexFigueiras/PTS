import { requireRole } from '@/lib/auth/authorization';
import { BaseService } from '@/services/base.service';
import { PatientRepository } from './patient.repository';
import { toPatientDto } from './patient.mapper';
import type { PatientFilters, PatientDto } from './patient.dto';
import type { PaginatedResult } from '@/lib/pagination';
import { getDb, withTransactionContext } from '@/lib/db/client';
import { ptsResponses, tenants } from '@/lib/db/schema';
import { eq, inArray } from 'drizzle-orm';
import { calculateIvc } from '@/lib/pts/intelligence-engine';
import type { PtsSchema } from '@/validations/pts-schema';

export class ListPatientsService extends BaseService {
  async execute(filters: PatientFilters): Promise<PaginatedResult<PatientDto & { hasHighVulnerabilityAlert?: boolean; ivcScore?: number }>> {
    requireRole(this.ctx, 'PROFESSIONAL');

    return await withTransactionContext(this.ctx.userId, this.ctx.tenantId, async (tx) => {
      const repo = new PatientRepository(this.ctx, tx);
      const result = await repo.list(filters);

      if (result.data.length === 0) {
        return { ...result, data: [] };
      }

      const patientIds = result.data.map((p) => p.id);

      // 1. Obter pesos do tenant
      const [tenantRow] = await tx
        .select({ settings: tenants.settings })
        .from(tenants)
        .where(eq(tenants.id, this.ctx.tenantId))
        .limit(1);

      const settings = tenantRow?.settings as { ivc_weights?: { alpha: number; beta: number; gamma: number } } | null;
      const weights = settings?.ivc_weights || { alpha: 0.35, beta: 0.35, gamma: 0.30 };

      // 2. Buscar PTS dos pacientes
      const ptsList = await tx
        .select()
        .from(ptsResponses)
        .where(inArray(ptsResponses.patientId, patientIds));

      const ptsMap = new Map<string, typeof ptsResponses.$inferSelect>();
      ptsList.forEach((pts: typeof ptsResponses.$inferSelect) => {
        ptsMap.set(pts.patientId, pts);
      });

      const mappedData = result.data.map((p) => {
        const dto = toPatientDto(p);
        const pts = ptsMap.get(p.id);
        
        let hasHighVulnerabilityAlert = false;
        let ivcScore = 0;

        if (pts) {
          const ptsSchemaData = {
            ...((pts.data as Record<string, unknown>) || {}),
            scores: pts.scores || {},
          };
          const ivcResult = calculateIvc(ptsSchemaData as unknown as PtsSchema, weights);
          ivcScore = ivcResult.ivc;
          if (ivcResult.vulnerabilityIndex === 'E' || ivcResult.vulnerabilityIndex === 'D') {
            hasHighVulnerabilityAlert = true;
          }
        }

        return {
          ...dto,
          hasHighVulnerabilityAlert,
          ivcScore,
        };
      });

      return { ...result, data: mappedData };
    });
  }
}
