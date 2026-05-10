'use client';

import { useActionState, useEffect, useRef } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  createRecordSchema,
  updateRecordSchema,
  RECORD_TYPES,
  RECORD_TYPE_LABELS,
  type RecordDto,
} from '../record.dto';
import { createRecordAction, updateRecordAction, type RecordActionState } from '../record.actions';

const initialState: RecordActionState = { error: null };

function today() {
  return new Date().toISOString().split('T')[0];
}

type CreateProps = { mode: 'create'; patientId: string };
type EditProps = { mode: 'edit'; record: RecordDto };
type ViewProps = { mode: 'view'; record: RecordDto };
type Props = CreateProps | EditProps | ViewProps;

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
    <div className="space-y-1.5">
      <label className="text-sm font-medium">{label}</label>
      {children}
      {error && (
        <p role="alert" className="text-destructive text-xs">
          {error}
        </p>
      )}
    </div>
  );
}

const inputClass =
  'border-input bg-background focus-visible:ring-ring w-full rounded-md border px-3 py-2 text-sm outline-none focus-visible:ring-2 disabled:opacity-50';

function RecordViewContent({ record }: { record: RecordDto }) {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">Tipo</p>
          <p className="mt-1 text-sm">{RECORD_TYPE_LABELS[record.type]}</p>
        </div>
        <div>
          <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
            Data da sessão
          </p>
          <p className="mt-1 text-sm">
            {new Date(record.sessionDate + 'T00:00:00').toLocaleDateString('pt-BR')}
          </p>
        </div>
        {record.title && (
          <div>
            <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
              Título
            </p>
            <p className="mt-1 text-sm">{record.title}</p>
          </div>
        )}
      </div>
      <div>
        <p className="text-muted-foreground mb-2 text-xs font-medium uppercase tracking-wide">
          Conteúdo
        </p>
        <div className="bg-muted/50 rounded-md border p-4">
          <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">
            {record.content}
          </pre>
        </div>
      </div>
    </div>
  );
}

export function RecordForm(props: Props) {
  const isCreate = props.mode === 'create';
  const isEdit = props.mode === 'edit';
  const isView = props.mode === 'view';
  const record = isView || isEdit ? props.record : undefined;
  const patientId = isCreate ? props.patientId : record?.patientId ?? '';

  const [state, action, pending] = useActionState(
    isCreate ? createRecordAction : updateRecordAction,
    initialState,
  );

  const submittedRef = useRef(false);
  useEffect(() => {
    if (submittedRef.current && !pending) {
      if (state.error === null) toast.success('Registro salvo com sucesso');
      submittedRef.current = false;
    }
  }, [pending, state.error]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const form = useForm<any>({
    resolver: zodResolver(isCreate ? createRecordSchema : updateRecordSchema),
    defaultValues: {
      patientId,
      type: record?.type ?? 'session_note',
      title: record?.title ?? '',
      content: record?.content ?? '',
      sessionDate: record?.sessionDate ?? today(),
    },
  });

  if (isView && record) {
    return <RecordViewContent record={record} />;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function onSubmit(data: Record<string, any>) {
    const formData = new FormData();
    if (!isCreate && record) formData.set('id', record.id);
    formData.set('patientId', patientId);
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
      <input type="hidden" {...form.register('patientId')} />

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Tipo de registro" error={errors.type?.message}>
          <select {...form.register('type')} className={inputClass}>
            {RECORD_TYPES.map((t) => (
              <option key={t} value={t}>
                {RECORD_TYPE_LABELS[t]}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Data da sessão *" error={errors.sessionDate?.message}>
          <input
            {...form.register('sessionDate')}
            type="date"
            className={cn(inputClass, errors.sessionDate && 'border-destructive')}
          />
        </Field>

        <div className="sm:col-span-2">
          <Field label="Título (opcional)" error={errors.title?.message}>
            <input
              {...form.register('title')}
              className={inputClass}
              placeholder="Resumo breve da sessão..."
            />
          </Field>
        </div>
      </div>

      <Field label="Registro clínico *" error={errors.content?.message}>
        <textarea
          {...form.register('content')}
          rows={18}
          className={cn(inputClass, 'resize-y', errors.content && 'border-destructive')}
          placeholder="Descreva a evolução, intervenções realizadas, observações clínicas relevantes..."
        />
      </Field>

      {state.error && (
        <p role="alert" className="text-destructive text-sm">
          {state.error}
        </p>
      )}

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={pending}
          className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-md px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50"
        >
          {pending
            ? isCreate
              ? 'Criando…'
              : 'Salvando…'
            : isCreate
              ? 'Criar registro'
              : 'Salvar alterações'}
        </button>
      </div>
    </form>
  );
}
