import { getAuthUser } from '@/lib/auth/get-user';
import { getActiveTenantContext } from '@/lib/auth/get-tenant-context';
import { RoleProvider } from '@/lib/auth/role-provider';
import { AppSidebar } from '@/components/layout/app-sidebar';
import { AppHeader } from '@/components/layout/app-header';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const [user, ctx] = await Promise.all([getAuthUser(), getActiveTenantContext()]);

  return (
    <div className="flex h-full min-h-screen">
      <AppSidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <AppHeader userEmail={user?.email ?? undefined} />
        <RoleProvider role={ctx?.role ?? null}>
          <main className="flex-1 overflow-y-auto">{children}</main>
        </RoleProvider>
      </div>
    </div>
  );
}
