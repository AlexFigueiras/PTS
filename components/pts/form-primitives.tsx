'use client';

import React from 'react';
import { Target } from 'lucide-react';
import { useFormContext } from 'react-hook-form';
import type { PtsSchema } from '@/validations/pts-schema';
import { ScoreSelector } from './score-selector';

export type PtsFormData = PtsSchema;

export const masks = {
  cpf: (v: string) =>
    v
      .replace(/\D/g, '')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})/, '$1-$2')
      .slice(0, 14),
  phone: (v: string) =>
    v
      .replace(/\D/g, '')
      .replace(/(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{5})(\d)/, '$1-$2')
      .slice(0, 15),
  cep: (v: string) =>
    v.replace(/\D/g, '').replace(/(\d{5})(\d)/, '$1-$2').slice(0, 9),
};

export function Field({
  label,
  field,
  placeholder,
  className = 'col-span-12 md:col-span-6',
  type = 'text',
  mask,
}: {
  label: string;
  field: keyof PtsFormData;
  placeholder?: string;
  className?: string;
  type?: string;
  mask?: keyof typeof masks;
}) {
  const {
    register,
    formState: { errors },
    setValue,
  } = useFormContext<PtsFormData>();
  const error = errors[field]?.message as string;

  const handle = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    let v = e.target.value;
    if (mask && type !== 'date') v = masks[mask](v);
    setValue(field, v as any, { shouldValidate: true, shouldDirty: true });
  };

  const fieldProps = register(field as any);

  return (
    <div className={className}>
      <label className="mb-2.5 ml-1 block text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">{label}</label>
      {type === 'textarea' ? (
        <textarea
          {...fieldProps}
          className={`min-h-[120px] w-full resize-none rounded-2xl border bg-background/30 p-5 text-sm font-medium text-foreground placeholder:text-muted-foreground/20 focus:ring-4 focus:outline-none transition-all duration-300 ${error ? 'border-destructive/50 focus:border-destructive focus:ring-destructive/10' : 'border-border focus:border-primary focus:ring-primary/10'}`}
          placeholder={placeholder || 'Digite aqui…'}
        />
      ) : (
        <input
          {...fieldProps}
          type={type}
          onChange={(e) => {
            fieldProps.onChange(e);
            handle(e);
          }}
          className={`w-full rounded-2xl border bg-background/30 px-5 py-4 text-sm font-medium text-foreground placeholder:text-muted-foreground/20 focus:ring-4 focus:outline-none transition-all duration-300 ${error ? 'border-destructive/50 focus:border-destructive focus:ring-destructive/10' : 'border-border focus:border-primary focus:ring-primary/10'}`}
          placeholder={placeholder || '…'}
        />
      )}
      {error && <p className="mt-2 ml-1 text-[9px] font-bold text-destructive uppercase tracking-widest animate-reveal">{error}</p>}
    </div>
  );
}

export function Radio({
  label,
  field,
  options,
  className = 'col-span-12',
}: {
  label: string;
  field: keyof PtsFormData;
  options: string[];
  className?: string;
}) {
  const {
    formState: { errors },
    watch,
    setValue,
  } = useFormContext<PtsFormData>();
  const error = errors[field]?.message as string;
  const current = watch(field);

  return (
    <div className={className}>
      <label className="mb-4 ml-1 block text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">{label}</label>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => (
          <button
            key={opt}
            type="button"
            onClick={() => setValue(field, opt as any, { shouldValidate: true, shouldDirty: true })}
            className={`rounded-xl border px-6 py-3.5 min-h-[48px] text-[10px] font-black uppercase tracking-widest transition-all duration-300 active:scale-95 flex items-center justify-center ${current === opt ? 'border-primary bg-primary text-primary-foreground shadow-[0_0_15px_rgba(var(--primary),0.2)]' : 'border-border bg-background/30 text-muted-foreground hover:bg-secondary/30 hover:text-foreground'}`}
          >
            {opt}
          </button>
        ))}
      </div>
      {error && <p className="mt-2 ml-1 text-[9px] font-bold text-destructive uppercase tracking-widest animate-reveal">{error}</p>}
    </div>
  );
}

export function Checkbox({
  label,
  field,
  options,
  className = 'col-span-12',
}: {
  label: string;
  field: keyof PtsFormData;
  options: string[];
  className?: string;
}) {
  const {
    formState: { errors },
    watch,
    setValue,
  } = useFormContext<PtsFormData>();
  const error = errors[field]?.message as string;
  const current = (watch(field) as string[]) || [];

  const toggle = (opt: string) => {
    const next = current.includes(opt) ? current.filter((i) => i !== opt) : [...current, opt];
    setValue(field, next as any, { shouldValidate: true, shouldDirty: true });
  };

  return (
    <div className={className}>
      <label className="mb-4 ml-1 block text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">{label}</label>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => (
          <button
            key={opt}
            type="button"
            onClick={() => toggle(opt)}
            className={`rounded-xl border px-6 py-3.5 min-h-[48px] text-[10px] font-black uppercase tracking-widest transition-all duration-300 active:scale-95 flex items-center justify-center ${current.includes(opt) ? 'border-primary bg-primary text-primary-foreground shadow-[0_0_15px_rgba(var(--primary),0.2)]' : 'border-border bg-background/30 text-muted-foreground hover:bg-secondary/30 hover:text-foreground'}`}
          >
            {opt}
          </button>
        ))}
      </div>
      {error && <p className="mt-2 ml-1 text-[9px] font-bold text-destructive uppercase tracking-widest animate-reveal">{error}</p>}
    </div>
  );
}

/**
 * Cabeçalho de um domínio de avaliação. Deixa explícito que QUALQUER
 * profissional logado pode pontuar o domínio e expõe o seletor de escore.
 */
export function DomainIntro({
  domainKey,
  label,
  description,
}: {
  domainKey: string;
  label: string;
  description: string;
}) {
  return (
    <div className="space-y-6 rounded-3xl border border-primary/10 bg-primary/[0.03] p-8">
      <div className="flex items-start gap-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Target size={18} />
        </div>
        <div className="space-y-1">
          <h3 className="text-sm font-black uppercase tracking-tight text-foreground">{label}</h3>
          <p className="text-[11px] font-medium leading-relaxed text-muted-foreground">
            {description} Qualquer profissional da rede — Saúde, Assistência Social,
            Jurídico ou Educação — pode pontuar este domínio.
          </p>
        </div>
      </div>
      <ScoreSelector field={domainKey} label="Pontuação do domínio · 0 = crítico · 4 = pleno" />
    </div>
  );
}
