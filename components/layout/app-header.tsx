interface AppHeaderProps {
  userEmail?: string;
}

export function AppHeader({ userEmail }: AppHeaderProps) {
  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b px-6">
      <div />
      {userEmail && (
        <span className="text-muted-foreground text-sm">{userEmail}</span>
      )}
    </header>
  );
}
