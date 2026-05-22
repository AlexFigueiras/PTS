'use client';

import { useActionState, startTransition } from 'react';
import { Lock } from 'lucide-react';
import { activateAccountAction, type ActivationActionState } from '@/modules/invites/invite.actions';

const initialState: ActivationActionState = { error: null };

/**
 * Tela de ativação única. Os dados do pré-cadastro (Nome, CPF, E-mail) são
 * exibidos bloqueados (leitura pura); o profissional define apenas a senha.
 */
export function ActivationForm({
  token,
  fullName,
  cpf,
  email,
}: {
  token: string;
  fullName: string;
  cpf: string;
  email: string;
}) {
  const [state, action, pending] = useActionState(activateAccountAction, initialState);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(() => action(formData));
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <input type="hidden" name="token" value={token} />

      {/* Dados do pré-cadastro — somente leitura */}
      <fieldset className="space-y-3" disabled>
        <legend className="mb-1 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
          Dados do pré-cadastro
        </legend>
        <ReadOnlyField label="Nome completo" value={fullName} />
        <ReadOnlyField label="CPF" value={cpf || '—'} />
        <ReadOnlyField label="E-mail" value={email} />
      </fieldset>

      {/* Definição de senha */}
      <div className="space-y-3 border-t border-slate-100 pt-6">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
          Defina sua senha de acesso
        </p>
        <Field label="Nova senha" name="password" placeholder="Mínimo de 8 caracteres" />
        <Field label="Confirmação de senha" name="confirmPassword" placeholder="Repita a senha" />
      </div>

      {state.error && (
        <p role="alert" className="text-xs font-bold uppercase tracking-wide text-rose-600">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#00D094] px-6 py-4 text-[11px] font-black uppercase tracking-[0.2em] text-white shadow-lg transition-all hover:scale-[1.01] active:scale-95 disabled:opacity-60"
      >
        <Lock size={14} />
        {pending ? 'Ativando…' : 'Ativar conta e entrar'}
      </button>
    </form>
  );
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1.5">
      <label className="ml-1 text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">
        {label}
      </label>
      <div className="w-full rounded-2xl border border-slate-200 bg-slate-100 px-5 py-3.5 text-sm font-medium text-slate-500">
        {value}
      </div>
    </div>
  );
}

function Field({
  label,
  name,
  placeholder,
}: {
  label: string;
  name: string;
  placeholder: string;
}) {
  return (
    <div className="space-y-1.5">
      <label className="ml-1 text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">
        {label}
      </label>
      <input
        type="password"
        name={name}
        required
        minLength={8}
        autoComplete="new-password"
        placeholder={placeholder}
        className="w-full rounded-2xl border border-slate-200 bg-white px-5 py-3.5 text-sm font-medium text-slate-900 placeholder:text-slate-300 transition-all focus:border-[#004AAD] focus:outline-none focus:ring-4 focus:ring-[#004AAD]/10"
      />
    </div>
  );
}
