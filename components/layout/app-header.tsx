import { UserMenu } from './user-menu';

interface AppHeaderProps {
  userEmail?: string;
  tenantName?: string;
}

export function AppHeader({ userEmail, tenantName }: AppHeaderProps) {
  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b px-6">
      <span className="text-sm font-medium">{tenantName}</span>
      {userEmail && <UserMenu email={userEmail} />}
    </header>
  );
}
