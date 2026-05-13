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
    if (score <= 1) return { icon: AlertCircle, color: 'text-destructive', label: 'Status Crítico', bg: 'bg-destructive/10' };
    if (score === 2) return { icon: MinusCircle, color: 'text-muted-foreground', label: 'Neutro', bg: 'bg-muted/10' };
    return { icon: CheckCircle2, color: 'text-emerald-500', label: 'Fator de Proteção', bg: 'bg-emerald-500/10' };
  };

  const status = getStatus(currentScore);

  return (
    <div className={cn("space-y-3", className)}>
      {label && (
        <label className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 block ml-1">
          {label}
        </label>
      )}
      <div className="flex items-center gap-4">
        <div className="flex gap-1 p-1 rounded-2xl border border-border bg-background/30 w-fit">
          {[0, 1, 2, 3, 4].map((score) => (
            <button
              key={score}
              type="button"
              onClick={() => setValue(`scores.${field}`, score, { shouldValidate: true, shouldDirty: true })}
              className={cn(
                "size-10 rounded-xl text-xs font-black transition-all duration-300 active:scale-95",
                currentScore === score
                  ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                  : "hover:bg-secondary/50 text-muted-foreground"
              )}
            >
              {score}
            </button>
          ))}
        </div>

        {status && (
          <div className={cn("flex items-center gap-2 px-4 py-2.5 rounded-2xl border transition-all animate-in fade-in slide-in-from-left-2 duration-500", status.bg, status.color, "border-current/10")}>
            <status.icon size={16} />
            <span className="text-[10px] font-black uppercase tracking-widest">{status.label}</span>
          </div>
        )}
      </div>
    </div>
  );
}
