'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Users, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRole } from '@/lib/auth/role-provider';
import { hasRole } from '@/lib/auth/authorization';

export function AppSidebar() {
  const pathname = usePathname();
  const role = useRole();
  const isAdmin = role ? hasRole(role, 'admin') : false;

  function linkClass(href: string, exact = false) {
    const active = exact
      ? pathname === href
      : pathname === href || pathname.startsWith(href + '/');
    return cn(
      'flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors',
      active
        ? 'bg-accent text-accent-foreground'
        : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
    );
  }

  return (
    <aside className="flex w-56 shrink-0 flex-col border-r bg-background">
      <div className="flex h-14 items-center border-b px-4">
        <span className="text-sm font-semibold tracking-tight">CAPS</span>
      </div>
      <nav className="flex flex-col gap-1 p-2">
        <Link href="/dashboard" className={linkClass('/dashboard', true)}>
          <LayoutDashboard className="size-4 shrink-0" />
          Dashboard
        </Link>
        <Link href="/patients" className={linkClass('/patients')}>
          <Users className="size-4 shrink-0" />
          Pacientes
        </Link>
        {isAdmin && (
          <>
            <div className="bg-border my-1 h-px" />
            <Link href="/settings" className={linkClass('/settings')}>
              <Settings className="size-4 shrink-0" />
              Configurações
            </Link>
          </>
        )}
      </nav>
    </aside>
  );
}
