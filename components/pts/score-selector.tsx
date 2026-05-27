'use client';

import React from 'react';
import { AlertCircle, CheckCircle2, MinusCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useFormContext } from 'react-hook-form';

interface ScoreSelectorProps {
  field: string;
  label?: string;
  className?: string;
}

export function ScoreSelector({ field, label, className }: ScoreSelectorProps) {
  const { watch, setValue } = useFormContext();
  const currentScore = watch(`scores.${field}`) as number | undefined;

  const getStatus = (score: number | undefined) => {
    if (score === undefined) return null;
    if (score <= 1) {
      return {
        icon: AlertCircle,
        color: 'text-rose-800 dark:text-rose-300',
        label: 'Status Crítico',
        bg: 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900/50',
      };
    }
    if (score === 2) {
      return {
        icon: MinusCircle,
        color: 'text-slate-800 dark:text-slate-300',
        label: 'Neutro',
        bg: 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700',
      };
    }
    return {
      icon: CheckCircle2,
      color: 'text-emerald-800 dark:text-emerald-400',
      label: 'Fator de Proteção',
      bg: 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900/50',
    };
  };

  const status = getStatus(currentScore);

  return (
    <div className={cn("space-y-3", className)}>
      {label && (
        <label className="text-xs font-black uppercase tracking-[0.2em] text-slate-800 dark:text-slate-200 block ml-1">
          {label}
        </label>
      )}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex gap-1.5 p-1.5 rounded-2xl border border-border bg-background/30 w-fit">
          {[0, 1, 2, 3, 4].map((score) => (
            <button
              key={score}
              type="button"
              onClick={() => setValue(`scores.${field}`, score, { shouldValidate: true, shouldDirty: true })}
              className={cn(
                "size-12 rounded-xl text-xs font-black transition-all duration-300 active:scale-95 flex items-center justify-center",
                currentScore === score
                  ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                  : "hover:bg-secondary/50 text-slate-600 dark:text-slate-400"
              )}
            >
              {score}
            </button>
          ))}
        </div>

        {status && (
          <div className={cn("flex items-center gap-2 px-4 py-3 rounded-2xl border transition-all animate-in fade-in slide-in-from-left-2 duration-500", status.bg, status.color)}>
            <status.icon size={16} className="shrink-0" />
            <span className="text-xs font-black uppercase tracking-widest">{status.label}</span>
          </div>
        )}
      </div>
    </div>
  );
}
