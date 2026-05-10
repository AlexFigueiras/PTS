import { BaseService } from '@/services/base.service';
import { PatientRepository } from './patient.repository';
import { toPatientDto } from './patient.mapper';
import type { PatientFilters, PatientDto } from './patient.dto';
import type { PaginatedResult } from '@/lib/pagination';

export class ListPatientsService extends BaseService {
  async execute(filters: PatientFilters): Promise<PaginatedResult<PatientDto>> {
    const repo = new PatientRepository(this.ctx);
    const result = await repo.list(filters);
    return { ...result, data: result.data.map(toPatientDto) };
  }
}
