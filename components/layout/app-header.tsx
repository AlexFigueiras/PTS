import { UserMenu } from './user-menu';

interface AppHeaderProps {
  userEmail?: string;
  tenantName?: string;
}

export function AppHeader({ userEmail, tenantName }: AppHeaderProps) {
  return (
    <header className="flex h-20 shrink-0 items-center justify-between border-b border-border bg-card/40 px-10 backdrop-blur-2xl">
      <div className="flex items-center gap-4">
        <div className="h-2 w-2 rounded-full bg-primary shadow-[0_0_10px_rgba(var(--primary),0.5)]" />
        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground/60 italic">{tenantName}</span>
      </div>
      {userEmail && <UserMenu email={userEmail} />}
    </header>
  );
}
