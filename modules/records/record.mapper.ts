import type { ClinicalRecord } from '@/lib/db/schema';
import type { RecordDto } from './record.dto';

export function toRecordDto(row: ClinicalRecord): RecordDto {
  return {
    id: row.id,
    patientId: row.patientId,
    professionalId: row.professionalId,
    type: row.type,
    title: row.title ?? null,
    content: row.content,
    sessionDate: row.sessionDate,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
