'use client';

import React from 'react';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { useFormContext } from 'react-hook-form';
import { AlertTriangle } from 'lucide-react';

interface RiskSwitchProps {
  field: string;
  className?: string;
}

export function RiskSwitch({ field, className }: RiskSwitchProps) {
  const { watch, setValue } = useFormContext();
  const isRisk = watch(`risks.${field}`) as boolean | undefined;

  return (
    <div className={cn("flex items-center gap-4 py-2", className)}>
      <div className="flex items-center gap-3">
        <Switch
          id={`risk-${field}`}
          checked={isRisk || false}
          onCheckedChange={(checked) => setValue(`risks.${field}`, checked, { shouldValidate: true, shouldDirty: true })}
          className="data-[state=checked]:bg-destructive"
        />
        <label
          htmlFor={`risk-${field}`}
          className={cn(
            "text-[9px] font-black uppercase tracking-widest cursor-pointer transition-colors",
            isRisk ? "text-destructive" : "text-muted-foreground"
          )}
        >
          Sinalizar Risco
        </label>
      </div>

      {isRisk && (
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-destructive/10 text-destructive animate-in zoom-in duration-300">
          <AlertTriangle size={10} />
          <span className="text-[8px] font-black uppercase tracking-widest">Área Prioritária</span>
        </div>
      )}
    </div>
  );
}
