'use client';

import { removeMemberFormAction } from '../member.actions';

interface RemoveMemberButtonProps {
  userId: string;
  userName: string;
}

export function RemoveMemberButton({ userId, userName }: RemoveMemberButtonProps) {
  return (
    <form action={removeMemberFormAction}>
      <input type="hidden" name="userId" value={userId} />
      <button
        type="submit"
        className="text-destructive hover:text-destructive/80 rounded px-2 py-1 text-xs transition-colors"
        onClick={(e) => {
          if (!confirm(`Remover ${userName} da equipe?`)) {
            e.preventDefault();
          }
        }}
      >
        Remover
      </button>
    </form>
  );
}
