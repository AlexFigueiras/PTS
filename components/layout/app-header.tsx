import { UserMenu } from './user-menu';
import { UnitSwitcher } from './unit-switcher';
import type { UnitOption } from '@/modules/units/unit.queries';

interface AppHeaderProps {
  userEmail?: string;
  tenantName?: string;
  units?: UnitOption[];
  activeUnitId?: string | null;
}

export function AppHeader({ userEmail, tenantName, units = [], activeUnitId = null }: AppHeaderProps) {
  return (
    <header className="flex h-16 shrink-0 items-center justify-between px-10">
      <div className="flex items-center gap-4">
        <div className="h-2 w-2 rounded-full bg-[#004AAD] shadow-[0_0_10px_rgba(0,74,173,0.5)]" />
        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 italic">{tenantName}</span>
      </div>
      <div className="flex items-center gap-5">
        <UnitSwitcher units={units} activeUnitId={activeUnitId} />
        {userEmail && <UserMenu email={userEmail} />}
      </div>
    </header>
  );
}
