'use client';

import { useActionState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { updateTenantAction, type TenantActionState } from '../tenant.actions';

const initialState: TenantActionState = { error: null };

const inputClass =
  'border-input bg-background focus-visible:ring-ring w-full rounded-md border px-3 py-2 text-sm outline-none focus-visible:ring-2 disabled:opacity-50';

export function TenantForm({ name, slug }: { name: string; slug: string }) {
  const [state, action, pending] = useActionState(updateTenantAction, initialState);

  const submittedRef = useRef(false);
  useEffect(() => {
    if (submittedRef.current && !pending) {
      if (state.error === null) toast.success('Configurações salvas com sucesso');
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
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <label className="text-sm font-medium">Nome da clínica</label>
        <input name="name" defaultValue={name} className={inputClass} maxLength={100} required />
      </div>
      <div className="space-y-1.5">
        <label className="text-sm font-medium">Identificador (slug)</label>
        <input value={slug} disabled className={inputClass} />
        <p className="text-muted-foreground text-xs">O identificador não pode ser alterado.</p>
      </div>
      {state.error && (
        <p role="alert" className="text-destructive text-sm">
          {state.error}
        </p>
      )}
      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          {pending ? 'Salvando…' : 'Salvar alterações'}
        </Button>
      </div>
    </form>
  );
}
