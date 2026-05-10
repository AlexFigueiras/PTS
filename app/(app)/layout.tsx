import { getAuthUser } from '@/lib/auth/get-user';
import { AppSidebar } from '@/components/layout/app-sidebar';
import { AppHeader } from '@/components/layout/app-header';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getAuthUser();

  return (
    <div className="flex h-full min-h-screen">
      <AppSidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <AppHeader userEmail={user?.email ?? undefined} />
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
