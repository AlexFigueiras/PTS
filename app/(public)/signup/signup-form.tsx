'use client';

import { useActionState } from 'react';
import { Button } from '@/components/ui/button';
import { signupAction, type SignupState } from './actions';

const initialState: SignupState = { error: null, message: null };

export function SignupForm() {
  const [state, action, pending] = useActionState(signupAction, initialState);

  if (state.message) {
    return (
      <div className="rounded-md border border-green-200 bg-green-50 p-4 text-sm text-green-900">
        {state.message}
      </div>
    );
  }

  return (
    <form action={action} className="space-y-4">
      <div className="space-y-1.5">
        <label htmlFor="fullName" className="text-sm font-medium">
          Nome completo
        </label>
        <input
          id="fullName"
          name="fullName"
          type="text"
          autoComplete="name"
          required
          placeholder="Maria Silva"
          className="border-input bg-background focus-visible:ring-ring w-full rounded-md border px-3 py-2 text-sm outline-none focus-visible:ring-2"
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="tenantName" className="text-sm font-medium">
          Nome da clínica <span className="text-muted-foreground font-normal">(opcional)</span>
        </label>
        <input
          id="tenantName"
          name="tenantName"
          type="text"
          autoComplete="organization"
          placeholder="Clínica São José"
          className="border-input bg-background focus-visible:ring-ring w-full rounded-md border px-3 py-2 text-sm outline-none focus-visible:ring-2"
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="email" className="text-sm font-medium">
          E-mail
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="email@clinica.com"
          className="border-input bg-background focus-visible:ring-ring w-full rounded-md border px-3 py-2 text-sm outline-none focus-visible:ring-2"
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="password" className="text-sm font-medium">
          Senha
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          placeholder="Mínimo 8 caracteres"
          className="border-input bg-background focus-visible:ring-ring w-full rounded-md border px-3 py-2 text-sm outline-none focus-visible:ring-2"
        />
      </div>

      {state.error && (
        <p role="alert" className="text-destructive text-sm">
          {state.error}
        </p>
      )}

      <Button type="submit" disabled={pending} className="w-full">
        {pending ? 'Criando conta…' : 'Criar conta'}
      </Button>
    </form>
  );
}
