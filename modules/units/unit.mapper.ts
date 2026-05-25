import type { ServiceUnit } from '@/lib/db/schema';
import type { UnitDto } from './unit.dto';

export function toUnitDto(row: ServiceUnit): UnitDto {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    fullAddress: row.fullAddress ?? null,
    lat: row.lat ?? null,
    lon: row.lon ?? null,
    phone: row.phone ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
