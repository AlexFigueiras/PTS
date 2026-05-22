import type { Patient } from '@/lib/db/schema';
import type { PatientDto } from './patient.dto';

export function toPatientDto(row: Patient): PatientDto {
  return {
    id: row.id,
    fullName: row.fullName,
    socialName: row.socialName ?? null,
    motherName: row.motherName ?? null,
    birthDate: row.birthDate ?? null,
    cpf: row.cpf ?? null,
    nis: row.nis ?? null,
    cns: row.cns ?? null,
    gender: row.gender ?? null,
    phone: row.phone ?? null,
    email: row.email ?? null,
    fullAddress: row.fullAddress ?? null,
    lat: row.lat ?? null,
    lon: row.lon ?? null,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
