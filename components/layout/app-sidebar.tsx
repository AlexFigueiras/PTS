'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutGrid, 
  Stethoscope, 
  ClipboardCheck, 
  Settings,
  ChevronLeft,
  ChevronRight,
  Users
} from 'lucide-react';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutGrid },
  { href: '/patients', label: 'Pacientes', icon: Stethoscope },
  { href: '/groups', label: 'Grupos', icon: Users },
  { href: '/records', label: 'Prontuários', icon: ClipboardCheck, prefetch: false },
  { href: '/settings', label: 'Configurações', icon: Settings },
];

export function AppSidebar() {
  const pathname = usePathname();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  // O menu expande se estiver explicitamente aberto ou se o mouse estiver sobre ele
  const effectiveExpanded = isExpanded || isHovered;

  return (
    <aside 
      className={cn(
        "relative flex h-screen shrink-0 flex-col bg-[#004AAD] py-8 transition-all duration-500 ease-in-out z-50",
        effectiveExpanded ? "w-64" : "w-20"
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Botão de Toggle Fixo */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="absolute -right-3 top-20 flex h-6 w-6 items-center justify-center rounded-full bg-[#00D094] text-white shadow-lg transition-transform hover:scale-110 active:scale-95"
      >
        {isExpanded ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
      </button>

      {/* Brand Logo */}
      <div className={cn(
        "mb-12 flex items-center px-6 transition-all duration-300",
        effectiveExpanded ? "justify-start" : "justify-center px-0"
      )}>
        <span className={cn(
          "font-bold italic text-white whitespace-nowrap transition-all duration-300",
          effectiveExpanded ? "text-xl opacity-100" : "text-[0px] opacity-0"
        )}>
          MentalGest
        </span>
        {!effectiveExpanded && (
          <span className="text-xl font-bold italic text-white">MG</span>
        )}
      </div>
      
      {/* Navigation */}
      <nav className="flex flex-col gap-4 px-4">
        {NAV_ITEMS.map((item) => {
          const isActive = item.href !== '/' && pathname.startsWith(item.href);
          
          return (
            <Link
              key={item.href}
              href={item.href}
              prefetch={item.prefetch}
              className={cn(
                "group relative flex h-12 items-center rounded-2xl transition-all duration-300",
                effectiveExpanded ? "w-full px-4 gap-4" : "w-12 justify-center",
                isActive 
                  ? "bg-[#00D094] text-white shadow-[0_0_20px_rgba(0,208,148,0.4)]" 
                  : "text-white/60 hover:bg-white/10 hover:text-white"
              )}
            >
              <item.icon size={24} className="shrink-0" />
              
              <span className={cn(
                "font-medium whitespace-nowrap transition-all duration-300",
                effectiveExpanded ? "opacity-100 translate-x-0" : "absolute left-20 opacity-0 -translate-x-4 pointer-events-none"
              )}>
                {item.label}
              </span>

              {/* Tooltip quando encolhido */}
              {!effectiveExpanded && (
                <div className="absolute left-16 hidden rounded-md bg-slate-900 px-2 py-1 text-xs text-white group-hover:block whitespace-nowrap">
                  {item.label}
                </div>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer / Info extra se necessário */}
      <div className="mt-auto flex flex-col items-center px-4">
        <div className={cn(
          "h-10 w-10 overflow-hidden rounded-full border-2 border-white/20 transition-all",
          effectiveExpanded && "h-12 w-12"
        )}>
          <div className="flex h-full w-full items-center justify-center bg-white/10 text-[10px] font-bold text-white">
            ADM
          </div>
        </div>
      </div>
    </aside>
  );
}
