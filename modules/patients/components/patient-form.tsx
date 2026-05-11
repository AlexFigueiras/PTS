'use client';

import { useActionState, useEffect, useRef } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  createPatientSchema,
  updatePatientSchema,
  PATIENT_GENDER,
  type PatientDto,
} from '../patient.dto';
import {
  createPatientAction,
  updatePatientAction,
  type PatientActionState,
} from '../patient.actions';

const initialState: PatientActionState = { error: null };

const GENDER_LABELS: Record<string, string> = {
  masculino: 'Masculino',
  feminino: 'Feminino',
  nao_binario: 'Não-binário',
  outro: 'Outro',
};

type CreateProps = { mode: 'create' };
type EditProps = { mode: 'edit'; patient: PatientDto };
type Props = CreateProps | EditProps;

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-3">
      <label className="ml-1 text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">{label}</label>
      {children}
      {error && (
        <p role="alert" className="ml-1 text-[9px] font-bold uppercase tracking-wide text-destructive animate-in fade-in slide-in-from-left-2">
          {error}
        </p>
      )}
    </div>
  );
}

const inputClass =
  'w-full rounded-2xl border border-border bg-background/30 px-5 py-4 text-sm font-medium text-foreground placeholder:text-muted-foreground/30 focus:border-primary focus:ring-4 focus:ring-primary/10 focus:outline-none transition-all duration-300 disabled:opacity-40';

export function PatientForm(props: Props) {
  const isEdit = props.mode === 'edit';
  const patient = isEdit ? props.patient : undefined;

  const [state, action, pending] = useActionState(
    isEdit ? updatePatientAction : createPatientAction,
    initialState,
  );

  const submittedRef = useRef(false);
  useEffect(() => {
    if (submittedRef.current && !pending) {
      if (state.error === null) toast.success('Alterações salvas com sucesso');
      submittedRef.current = false;
    }
  }, [pending, state.error]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const form = useForm<any>({
    resolver: zodResolver(isEdit ? updatePatientSchema : createPatientSchema),
    defaultValues: {
      fullName: patient?.fullName ?? '',
      preferredName: patient?.preferredName ?? '',
      birthDate: patient?.birthDate ?? '',
      gender: patient?.gender ?? '',
      cpf: patient?.cpf ?? '',
      phone: patient?.phone ?? '',
      email: patient?.email ?? '',
      notes: patient?.notes ?? '',
      status: patient?.status ?? 'active',
    },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function onSubmit(data: Record<string, any>) {
    const formData = new FormData();
    if (isEdit && patient) formData.set('id', patient.id);
    Object.entries(data).forEach(([key, value]) => {
      if (value != null && value !== '') formData.set(key, String(value));
    });
    submittedRef.current = true;
    action(formData);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const errors = form.formState.errors as Record<string, any>;

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nome completo *" error={errors.fullName?.message}>
          <input
            {...form.register('fullName')}
            className={cn(inputClass, errors.fullName && 'border-destructive')}
            placeholder="Nome completo do paciente"
          />
        </Field>

        <Field label="Nome preferido" error={errors.preferredName?.message}>
          <input
            {...form.register('preferredName')}
            className={inputClass}
            placeholder="Como prefere ser chamado"
          />
        </Field>

        <Field label="Data de nascimento" error={errors.birthDate?.message}>
          <input {...form.register('birthDate')} type="date" className={inputClass} />
        </Field>

        <Field label="Gênero" error={errors.gender?.message}>
          <select {...form.register('gender')} className={inputClass}>
            <option value="">Selecionar...</option>
            {PATIENT_GENDER.map((g) => (
              <option key={g} value={g}>
                {GENDER_LABELS[g]}
              </option>
            ))}
          </select>
        </Field>

        <Field label="CPF" error={errors.cpf?.message}>
          <input
            {...form.register('cpf')}
            className={inputClass}
            placeholder="000.000.000-00"
          />
        </Field>

        <Field label="Telefone" error={errors.phone?.message}>
          <input
            {...form.register('phone')}
            className={inputClass}
            placeholder="(00) 00000-0000"
          />
        </Field>

        <div className="sm:col-span-2">
          <Field label="E-mail" error={errors.email?.message}>
            <input
              {...form.register('email')}
              type="email"
              className={inputClass}
              placeholder="email@exemplo.com"
            />
          </Field>
        </div>

        {isEdit && (
          <Field label="Status" error={errors.status?.message}>
            <select {...form.register('status')} className={inputClass}>
              <option value="active">Ativo</option>
              <option value="inactive">Inativo</option>
            </select>
          </Field>
        )}
      </div>

      <Field label="Observações" error={errors.notes?.message}>
        <textarea
          {...form.register('notes')}
          rows={4}
          className={inputClass}
          placeholder="Informações adicionais relevantes..."
        />
      </Field>

      {state.error && (
        <p role="alert" className="text-destructive text-sm">
          {String(state.error)}
        </p>
      )}

      <div className="flex justify-end border-t border-border pt-8">
        <Button 
          type="submit" 
          disabled={pending}
          className="rounded-2xl bg-primary px-10 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-primary-foreground shadow-[0_0_30px_rgba(var(--primary),0.2)] transition-all hover:scale-105 active:scale-95"
        >
          {pending
            ? isEdit
              ? 'Salvando…'
              : 'Criando…'
            : isEdit
              ? 'Salvar alterações'
              : 'Criar paciente'}
        </Button>
      </div>
    </form>
  );
}
