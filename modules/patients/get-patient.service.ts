import { requireRole } from '@/lib/auth/authorization';
import { BaseService } from '@/services/base.service';
import { PatientRepository } from './patient.repository';
import { toPatientDto } from './patient.mapper';
import type { PatientDto } from './patient.dto';

export class GetPatientService extends BaseService {
  async execute(id: string): Promise<PatientDto | undefined> {
    requireRole(this.ctx, 'assistant');
    const repo = new PatientRepository(this.ctx);
    const patient = await repo.findById(id);
    return patient ? toPatientDto(patient) : undefined;
  }
}
