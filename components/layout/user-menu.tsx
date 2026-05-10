'use client';

import { useTransition } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { logoutAction } from '@/lib/auth/logout.action';
import { ChevronDown, LogOut } from 'lucide-react';

export function UserMenu({ email }: { email: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-sm transition-colors">
        {email}
        <ChevronDown className="size-3.5 opacity-50" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>{email}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          disabled={pending}
          onClick={() => startTransition(() => logoutAction())}
          className="gap-2"
        >
          <LogOut className="size-4" />
          {pending ? 'Saindo…' : 'Sair'}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
