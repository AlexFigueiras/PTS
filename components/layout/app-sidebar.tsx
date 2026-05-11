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
    <aside className="flex w-64 shrink-0 flex-col border-r bg-card shadow-xl transition-all duration-300">
      <div className="flex h-16 items-center border-b px-8">
        <span className="text-[11px] font-black uppercase tracking-[0.4em] text-primary">CAPS</span>
      </div>
      <nav className="flex flex-col gap-2 p-6">
        <Link href="/dashboard" className={linkClass('/dashboard', true)}>
          <LayoutDashboard className="size-4 shrink-0" />
          <span className="tracking-tight">Dashboard</span>
        </Link>
        <Link href="/patients" className={linkClass('/patients')}>
          <Users className="size-4 shrink-0" />
          <span className="tracking-tight">Pacientes</span>
        </Link>
        {isAdmin && (
          <>
            <div className="my-4 h-px bg-border/50 mx-2" />
            <Link href="/settings" className={linkClass('/settings')}>
              <Settings className="size-4 shrink-0" />
              <span className="tracking-tight">Configurações</span>
            </Link>
          </>
        )}
      </nav>
    </aside>
  );
}
