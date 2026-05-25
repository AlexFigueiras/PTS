import { redirect } from 'next/navigation';
import { getActiveTenantContext } from '@/lib/auth/get-tenant-context';
import { requireRole } from '@/lib/auth/authorization';
import { UnitRepository } from '@/modules/units/unit.repository';
import { toUnitDto } from '@/modules/units/unit.mapper';
import { UnitsManager } from './units-manager';

export const metadata = { title: 'Unidades intersetoriais' };

export default async function UnitsSettingsPage() {
  const ctx = await getActiveTenantContext();
  if (!ctx) redirect('/login');

  // Apenas Administrador Geral (ADMIN) tem autorização para gerenciar unidades do município
  try {
    requireRole(ctx, 'ADMIN');
  } catch {
    redirect('/unauthorized');
  }

  // Busca a lista de unidades do município ordenadas por nome
  const repo = new UnitRepository(ctx);
  const rows = await repo.list();
  const units = rows.map(toUnitDto);

  return (
    <div className="rounded-lg border p-6 bg-card/40 backdrop-blur-sm shadow-sm">
      <div className="mb-6">
        <h1 className="text-lg font-semibold tracking-tight">Unidades Intersetoriais</h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Gerencie os pontos de atendimento do seu município (Saúde, Assistência Social, Educação e Jurídico).
        </p>
      </div>

      <UnitsManager initialUnits={units} />
    </div>
  );
}
