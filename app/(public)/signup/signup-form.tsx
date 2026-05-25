'use client';

import { useActionState } from 'react';
import { Button } from '@/components/ui/button';
import { signupAction, type SignupState } from './actions';

const initialState: SignupState = { error: null, message: null };

const MUNICIPALITIES = [
  'São Paulo - SP',
  'Rio de Janeiro - RJ',
  'Belo Horizonte - MG',
  'Brasília - DF',
  'Salvador - BA',
  'Fortaleza - CE',
  'Recife - PE',
  'Curitiba - PR',
  'Porto Alegre - RS',
  'Manaus - AM',
  'Goiânia - GO',
  'Belém - PA',
  'Guarulhos - SP',
  'Campinas - SP',
  'São Luís - MA',
  'São Gonçalo - RJ',
  'Maceió - AL',
  'Duque de Caxias - RJ',
  'Natal - RN',
  'Teresina - PI',
];

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
          Município / Gestão Municipal
        </label>
        <select
          id="tenantName"
          name="tenantName"
          required
          defaultValue=""
          className="border-input bg-background focus-visible:ring-ring w-full rounded-md border px-3 py-2 text-sm outline-none focus-visible:ring-2"
        >
          <option value="" disabled>
            Selecione seu município…
          </option>
          {MUNICIPALITIES.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="email" className="text-sm font-medium">
          E-mail institucional
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="admin@municipio.gov.br"
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
