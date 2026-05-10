'use client';

import { useActionState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { ROLE_LABELS, type MemberDto } from '@/modules/members/member.dto';
import { updateMemberRoleAction, type MemberActionState } from '@/modules/members/member.actions';

const initialState: MemberActionState = { error: null };

const EDITABLE_ROLES: Array<MemberDto['role']> = ['admin', 'professional', 'assistant'];

const inputClass =
  'border-input bg-background focus-visible:ring-ring rounded-md border px-2 py-1 text-sm outline-none focus-visible:ring-2';

export function MemberRoleForm({
  userId,
  currentRole,
}: {
  userId: string;
  currentRole: MemberDto['role'];
}) {
  const [state, action, pending] = useActionState(updateMemberRoleAction, initialState);

  const submittedRef = useRef(false);
  useEffect(() => {
    if (submittedRef.current && !pending) {
      if (state.error) toast.error(state.error);
      else toast.success('Papel atualizado com sucesso');
      submittedRef.current = false;
    }
  }, [pending, state.error]);

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    submittedRef.current = true;
    const formData = new FormData();
    formData.set('userId', userId);
    formData.set('role', e.target.value);
    action(formData);
  }

  return (
    <select
      defaultValue={currentRole}
      onChange={handleChange}
      disabled={pending}
      className={inputClass}
    >
      {EDITABLE_ROLES.map((r) => (
        <option key={r} value={r}>
          {ROLE_LABELS[r]}
        </option>
      ))}
    </select>
  );
}
