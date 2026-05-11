import { eq } from 'drizzle-orm';
import { getAuthUser } from '@/lib/auth/get-user';
import { getActiveTenantContext } from '@/lib/auth/get-tenant-context';
import { RoleProvider } from '@/lib/auth/role-provider';
import { getDb } from '@/lib/db/client';
import { tenants } from '@/lib/db/schema';
import { AppSidebar } from '@/components/layout/app-sidebar';
import { AppHeader } from '@/components/layout/app-header';
import { Toaster } from '@/components/ui/sonner';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const [user, ctx] = await Promise.all([getAuthUser(), getActiveTenantContext()]);

  const tenantName = ctx
    ? await getDb()
        .select({ name: tenants.name })
        .from(tenants)
        .where(eq(tenants.id, ctx.tenantId))
        .limit(1)
        .then((r) => r[0]?.name)
    : undefined;

  return (
    <div className="flex h-screen overflow-hidden bg-[#F8FAFC] font-sans antialiased selection:bg-primary/20 selection:text-primary">
      <AppSidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <AppHeader userEmail={user?.email ?? undefined} tenantName={tenantName} />
        <RoleProvider role={ctx?.role ?? null}>
          <main className="flex-1 overflow-y-auto overflow-x-hidden">
            {children}
          </main>
        </RoleProvider>
      </div>
      <Toaster />
    </div>
  );
}
