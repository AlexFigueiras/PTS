import { requireRole } from '@/lib/auth/authorization';
import { BaseService } from '@/services/base.service';
import { PatientRepository } from './patient.repository';
import { toPatientDto } from './patient.mapper';
import type { PatientDto } from './patient.dto';
import { withTransactionContext } from '@/lib/db/client';

export class GetPatientService extends BaseService {
  async execute(id: string): Promise<PatientDto | undefined> {
    requireRole(this.ctx, 'PROFESSIONAL');
    return await withTransactionContext(this.ctx.userId, this.ctx.tenantId, async (tx) => {
      const txCtx = { ...this.ctx, tx };
      const repo = new PatientRepository(txCtx);
      const patient = await repo.findById(id);
      return patient ? toPatientDto(patient) : undefined;
    });
  }
}
