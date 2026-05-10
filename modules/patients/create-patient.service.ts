import { withAudit } from '@/lib/audit/with-audit';
import { requireRole } from '@/lib/auth/authorization';
import { BaseService } from '@/services/base.service';
import type { TenantContext } from '@/lib/tenant-context';
import { PatientRepository } from './patient.repository';
import { toPatientDto } from './patient.mapper';
import type { CreatePatientInput, PatientDto } from './patient.dto';

const createPatientAudited = withAudit<CreatePatientInput, PatientDto>(
  {
    action: 'create',
    entityType: 'patient',
    entityId: (_, output) => output?.id,
    metadata: (input) => ({ fullName: input.fullName }),
  },
  async (ctx: TenantContext, input: CreatePatientInput): Promise<PatientDto> => {
    requireRole(ctx, 'professional');
    const repo = new PatientRepository(ctx);
    const patient = await repo.create(input);
    return toPatientDto(patient);
  },
);

export class CreatePatientService extends BaseService {
  async execute(input: CreatePatientInput): Promise<PatientDto> {
    return createPatientAudited(this.ctx, input);
  }
}
