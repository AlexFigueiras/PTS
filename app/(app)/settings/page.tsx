import { redirect } from 'next/navigation';
import { eq } from 'drizzle-orm';
import { getActiveTenantContext } from '@/lib/auth/get-tenant-context';
import { getDb } from '@/lib/db/client';
import { tenants } from '@/lib/db/schema';
import { TenantForm } from '@/modules/tenants/components/tenant-form';

export const metadata = { title: 'Configurações gerais' };

export default async function SettingsPage() {
  const ctx = await getActiveTenantContext();
  if (!ctx) redirect('/login');

  const [tenant] = await getDb()
    .select({ name: tenants.name, slug: tenants.slug })
    .from(tenants)
    .where(eq(tenants.id, ctx.tenantId))
    .limit(1);

  if (!tenant) redirect('/login');

  return (
    <div className="rounded-lg border p-6">
      <h2 className="mb-4 text-sm font-medium">Dados da clínica</h2>
      <TenantForm name={tenant.name} slug={tenant.slug} />
    </div>
  );
}
