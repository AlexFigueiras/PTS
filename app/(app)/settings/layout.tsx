import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getActiveTenantContext } from '@/lib/auth/get-tenant-context';
import { ForbiddenError, requireRole } from '@/lib/auth/authorization';

export default async function SettingsLayout({ children }: { children: React.ReactNode }) {
  const ctx = await getActiveTenantContext();
  if (!ctx) redirect('/login');

  try {
    requireRole(ctx, 'admin');
  } catch (err) {
    if (err instanceof ForbiddenError) redirect('/unauthorized');
    throw err;
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-6">
      <h1 className="text-2xl font-semibold tracking-tight">Configurações</h1>
      <div className="flex gap-1 border-b">
        {[
          { href: '/settings', label: 'Geral' },
          { href: '/settings/team', label: 'Equipe' },
        ].map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            className="text-muted-foreground hover:text-foreground border-b-2 border-transparent px-4 py-2 text-sm font-medium transition-colors"
          >
            {label}
          </Link>
        ))}
      </div>
      {children}
    </div>
  );
}
