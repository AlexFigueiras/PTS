import type { Patient } from '@/lib/db/schema';
import type { PatientDto } from './patient.dto';

export function toPatientDto(row: Patient): PatientDto {
  return {
    id: row.id,
    fullName: row.fullName,
    preferredName: row.preferredName ?? null,
    birthDate: row.birthDate ?? null,
    gender: row.gender ?? null,
    cpf: row.cpf ?? null,
    phone: row.phone ?? null,
    email: row.email ?? null,
    notes: row.notes ?? null,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
