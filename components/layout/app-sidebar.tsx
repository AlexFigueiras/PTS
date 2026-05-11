'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutGrid, Stethoscope, ClipboardCheck, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';

export function AppSidebar() {
  const pathname = usePathname();

  function SidebarLink({ href, icon: Icon, active = false }: { href: string; icon: any; active?: boolean }) {
    const isActive = active || (href !== '/' && pathname.startsWith(href));
    
    return (
      <Link
        href={href}
        className={cn(
          "relative flex h-12 w-12 items-center justify-center rounded-full transition-all duration-300",
          isActive 
            ? "bg-[#00D094] text-white shadow-[0_0_20px_rgba(0,208,148,0.4)]" 
            : "text-white/60 hover:bg-white/10 hover:text-white"
        )}
      >
        <Icon size={24} />
      </Link>
    );
  }

  return (
    <aside className="flex w-[100px] shrink-0 flex-col items-center bg-[#004AAD] py-8 transition-all duration-300">
      <div className="mb-12 flex flex-col items-center">
        <span className="text-xl font-bold italic text-white">MyDoc</span>
      </div>
      
      <nav className="flex flex-col gap-8">
        <SidebarLink href="/dashboard" icon={LayoutGrid} active={pathname === '/dashboard'} />
        <SidebarLink href="/patients" icon={Stethoscope} />
        <SidebarLink href="/records" icon={ClipboardCheck} />
        <SidebarLink href="/settings" icon={Settings} />
      </nav>
    </aside>
  );
}
