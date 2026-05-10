'use client';

import { useActionState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { createInviteAction, type InviteActionState } from '@/modules/invites/invite.actions';

const initialState: InviteActionState = { error: null };

const inputClass =
  'border-input bg-background focus-visible:ring-ring w-full rounded-md border px-3 py-2 text-sm outline-none focus-visible:ring-2 disabled:opacity-50';

export function InviteForm() {
  const [state, action, pending] = useActionState(createInviteAction, initialState);
  const formRef = useRef<HTMLFormElement>(null);
  const submittedRef = useRef(false);

  useEffect(() => {
    if (submittedRef.current && !pending) {
      if (state.error === null) {
        toast.success('Convite enviado com sucesso');
        formRef.current?.reset();
      }
      submittedRef.current = false;
    }
  }, [pending, state.error]);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    submittedRef.current = true;
    const formData = new FormData(e.currentTarget);
    action(formData);
    e.preventDefault();
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="flex flex-col gap-3 sm:flex-row sm:items-end">
      <div className="flex-1 space-y-1.5">
        <label className="text-sm font-medium">E-mail</label>
        <input
          name="email"
          type="email"
          placeholder="colaborador@clinica.com"
          className={inputClass}
          required
        />
      </div>
      <div className="space-y-1.5">
        <label className="text-sm font-medium">Papel</label>
        <select name="role" className={inputClass} defaultValue="assistant">
          <option value="assistant">Assistente</option>
          <option value="professional">Profissional</option>
          <option value="admin">Administrador</option>
        </select>
      </div>
      <Button type="submit" disabled={pending} className="shrink-0">
        {pending ? 'Enviando…' : 'Enviar convite'}
      </Button>
      {state.error && (
        <p role="alert" className="text-destructive w-full text-sm">
          {state.error}
        </p>
      )}
    </form>
  );
}
