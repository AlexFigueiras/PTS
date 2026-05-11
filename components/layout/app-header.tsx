import { UserMenu } from './user-menu';

interface AppHeaderProps {
  userEmail?: string;
  tenantName?: string;
}

export function AppHeader({ userEmail, tenantName }: AppHeaderProps) {
  return (
    <header className="flex h-16 shrink-0 items-center justify-between px-10">
      <div className="flex items-center gap-4">
        <div className="h-2 w-2 rounded-full bg-[#004AAD] shadow-[0_0_10px_rgba(0,74,173,0.5)]" />
        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 italic">{tenantName}</span>
      </div>
      {userEmail && <UserMenu email={userEmail} />}
    </header>
  );
}
