import { getAuthUser } from '@/lib/auth/get-user';
import { getActiveTenantContext } from '@/lib/auth/get-tenant-context';

export const metadata = { title: 'Dashboard' };

export default async function DashboardPage() {
  const user = await getAuthUser();
  const ctx = await getActiveTenantContext();

  return (
    <main className="mx-auto max-w-3xl space-y-4 p-6">
      <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
      <p className="text-muted-foreground text-sm">
        Placeholder protegido pelo middleware — só carrega se o usuário estiver autenticado.
      </p>
      <div className="bg-muted/40 rounded-md border p-4 text-sm">
        <p>
          <span className="font-medium">Usuário:</span> {user?.email ?? '—'}
        </p>
        <p>
          <span className="font-medium">Tenant ativo:</span> {ctx?.tenantId ?? 'nenhum'}
        </p>
        <p>
          <span className="font-medium">Role:</span> {ctx?.role ?? '—'}
        </p>
      </div>
    </main>
  );
}
