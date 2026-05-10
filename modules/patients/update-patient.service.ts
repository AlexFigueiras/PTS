import { withAudit } from '@/lib/audit/with-audit';
import { requireRole } from '@/lib/auth/authorization';
import { BaseService } from '@/services/base.service';
import type { TenantContext } from '@/lib/tenant-context';
import { PatientRepository } from './patient.repository';
import { toPatientDto } from './patient.mapper';
import type { UpdatePatientInput, PatientDto } from './patient.dto';

const updatePatientAudited = withAudit<UpdatePatientInput, PatientDto>(
  {
    action: 'update',
    entityType: 'patient',
    entityId: (input) => input.id,
    metadata: (input) => ({ id: input.id, fullName: input.fullName }),
  },
  async (ctx: TenantContext, input: UpdatePatientInput): Promise<PatientDto> => {
    requireRole(ctx, 'professional');
    const { id, ...data } = input;
    const repo = new PatientRepository(ctx);
    const patient = await repo.update(id, data);
    if (!patient) throw new Error(`Paciente ${id} não encontrado`);
    return toPatientDto(patient);
  },
);

export class UpdatePatientService extends BaseService {
  async execute(input: UpdatePatientInput): Promise<PatientDto> {
    return updatePatientAudited(this.ctx, input);
  }
}
