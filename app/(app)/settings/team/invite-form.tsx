'use client';

import { useActionState, useEffect, useRef, startTransition } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  sendProfessionalInviteAction,
  type InviteActionState,
} from '@/modules/invites/invite.actions';

const initialState: InviteActionState = { error: null, success: null };

const inputClass =
  'border-input bg-background focus-visible:ring-ring w-full rounded-md border px-3 py-2 text-sm outline-none focus-visible:ring-2 disabled:opacity-50';

const maskCpf = (v: string) =>
  v
    .replace(/\D/g, '')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})/, '$1-$2')
    .slice(0, 14);

/**
 * Formulário de convite controlado (fluxo inverso). A organização pré-cadastra
 * o profissional; ele recebe o link de ativação por e-mail.
 */
export function InviteForm({
  units,
  canInviteManager,
}: {
  units: { id: string; name: string }[];
  canInviteManager: boolean;
}) {
  const [state, action, pending] = useActionState(sendProfessionalInviteAction, initialState);
  const formRef = useRef<HTMLFormElement>(null);
  const submittedRef = useRef(false);

  useEffect(() => {
    if (submittedRef.current && !pending) {
      if (state.success) {
        toast.success(state.success);
        formRef.current?.reset();
      } else if (state.error) {
        toast.error(state.error);
      }
      submittedRef.current = false;
    }
  }, [pending, state.error, state.success]);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    submittedRef.current = true;
    const formData = new FormData(e.currentTarget);
    startTransition(() => action(formData));
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="grid gap-3 sm:grid-cols-2">
      <div className="space-y-1.5">
        <label className="text-sm font-medium">Nome completo</label>
        <input name="fullName" className={inputClass} required placeholder="Nome do profissional" />
      </div>
      <div className="space-y-1.5">
        <label className="text-sm font-medium">CPF</label>
        <input
          name="cpf"
          className={inputClass}
          required
          placeholder="000.000.000-00"
          onChange={(e) => {
            e.target.value = maskCpf(e.target.value);
          }}
        />
      </div>
      <div className="space-y-1.5">
        <label className="text-sm font-medium">E-mail</label>
        <input name="email" type="email" className={inputClass} required placeholder="profissional@orgao.gov.br" />
      </div>
      <div className="space-y-1.5">
        <label className="text-sm font-medium">Registro / Conselho</label>
        <input name="professionalRegistry" className={inputClass} required placeholder="Ex.: CRP 06/12345" />
      </div>
      <div className="space-y-1.5">
        <label className="text-sm font-medium">Cargo</label>
        <input name="jobTitle" className={inputClass} required placeholder="Ex.: Psicólogo, Assistente Social" />
      </div>
      <div className="space-y-1.5">
        <label className="text-sm font-medium">Unidade de origem</label>
        <select name="unitId" className={inputClass} required defaultValue="">
          <option value="" disabled>
            Selecione a unidade…
          </option>
          {units.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-1.5 sm:col-span-2">
        <label className="text-sm font-medium">Nível de acesso</label>
        <select name="role" className={inputClass} defaultValue="PROFESSIONAL">
          <option value="PROFESSIONAL">Profissional Técnico</option>
          {canInviteManager && <option value="MANAGER">Gerente de Unidade</option>}
        </select>
      </div>
      <div className="sm:col-span-2">
        <Button type="submit" disabled={pending} className="w-full sm:w-auto">
          {pending ? 'Enviando…' : 'Enviar convite de ativação'}
        </Button>
      </div>
    </form>
  );
}
