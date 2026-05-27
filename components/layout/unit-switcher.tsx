'use client';

import { useTransition } from 'react';
import { MapPin, ChevronDown, Check } from 'lucide-react';
import { toast } from 'sonner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { setActiveUnitAction } from '@/modules/units/unit.actions';
import type { UnitOption } from '@/modules/units/unit.queries';

const TYPE_LABELS: Record<UnitOption['type'], string> = {
  HEALTH: 'Saúde',
  SOCIAL: 'Assistência Social',
  LEGAL: 'Jurídico',
  EDUCATION: 'Educação',
};

/**
 * Seletor de "Local de Atuação Ativo" para profissionais com multi-vínculo.
 * A troca grava o cookie `active_unit_id` e revalida o layout — todas as
 * leituras/mutações de PTS passam a usar a nova unidade.
 */
export function UnitSwitcher({
  units,
  activeUnitId,
}: {
  units: UnitOption[];
  activeUnitId: string | null;
}) {
  const [pending, startTransition] = useTransition();

  if (units.length === 0) return null;

  const active = units.find((u) => u.id === activeUnitId) ?? units[0];

  // Vínculo único: apenas exibe a unidade, sem dropdown.
  if (units.length === 1) {
    return (
      <div className="flex items-center gap-3 rounded-xl bg-slate-100 px-4 py-3 min-h-[48px]">
        <MapPin size={16} className="text-[#004AAD] shrink-0" />
        <span className="text-xs font-black uppercase tracking-widest text-slate-800 dark:text-slate-200">
          {active.name}
        </span>
      </div>
    );
  }

  function switchTo(unitId: string) {
    if (unitId === active.id) return;
    startTransition(async () => {
      const res = await setActiveUnitAction(unitId);
      if (res.error) toast.error(res.error);
      else toast.success('Local de atuação alterado.');
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="flex items-center gap-3 rounded-xl bg-slate-100 px-4 py-3 min-h-[48px] transition-colors hover:bg-slate-200 data-[disabled]:opacity-60 focus:outline-none"
      >
        <MapPin size={16} className="text-[#004AAD] shrink-0" />
        <span className="text-xs font-black uppercase tracking-widest text-slate-800 dark:text-slate-200">
          {active.name}
        </span>
        <ChevronDown size={16} className="text-slate-600 shrink-0" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        <DropdownMenuLabel className="text-xs font-black uppercase tracking-[0.2em] text-slate-800 dark:text-slate-200 py-2">
          Local de Atuação Ativo
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {units.map((u) => (
          <DropdownMenuItem
            key={u.id}
            disabled={pending}
            onClick={() => switchTo(u.id)}
            className="flex items-start gap-2 p-3"
          >
            <Check
              size={14}
              className={u.id === active.id ? 'mt-0.5 text-[#00D094] shrink-0' : 'mt-0.5 opacity-0 shrink-0'}
            />
            <span className="flex flex-col">
              <span className="text-sm font-bold text-slate-800 dark:text-slate-100">{u.name}</span>
              <span className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 mt-1">
                {TYPE_LABELS[u.type]}
                {u.isPrimary ? ' · Principal' : ''}
              </span>
            </span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
