import { getIvcWeightsAction } from './actions';
import { requireRole } from '@/lib/auth/authorization';
import { getActiveTenantContext } from '@/lib/auth/get-tenant-context';
import { redirect } from 'next/navigation';
import { IvcSettingsForm } from './settings-form';

export const metadata = { title: 'Pesos do IVC | MentalGest' };

export default async function IvcSettingsPage() {
  const ctx = await getActiveTenantContext();
  if (!ctx) redirect('/login');

  // Restrição estrita a nível de página
  requireRole(ctx, 'ADMIN');

  const initialWeights = await getIvcWeightsAction();

  return (
    <div className="space-y-6 animate-reveal">
      <div className="space-y-1">
        <h2 className="text-xl font-medium tracking-tight text-foreground">Calibrar Pesos do IVC</h2>
        <p className="text-xs text-muted-foreground/80">
          Como Administrador Geral, defina a ponderação dos domínios federativos do Índice de Vulnerabilidade e Complexidade (IVC). A soma total dos pesos deve ser exatamente 100% (1.00).
        </p>
      </div>

      <IvcSettingsForm initialWeights={initialWeights} />
    </div>
  );
}
