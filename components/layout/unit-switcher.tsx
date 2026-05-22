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
      <div className="flex items-center gap-2 rounded-xl bg-slate-100 px-3 py-1.5">
        <MapPin size={12} className="text-[#004AAD]" />
        <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
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
        className="flex items-center gap-2 rounded-xl bg-slate-100 px-3 py-1.5 transition-colors hover:bg-slate-200 data-[disabled]:opacity-60"
      >
        <MapPin size={12} className="text-[#004AAD]" />
        <span className="text-[10px] font-black uppercase tracking-widest text-slate-600">
          {active.name}
        </span>
        <ChevronDown size={12} className="text-slate-400" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        <DropdownMenuLabel className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">
          Local de Atuação Ativo
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {units.map((u) => (
          <DropdownMenuItem
            key={u.id}
            disabled={pending}
            onClick={() => switchTo(u.id)}
            className="flex items-start gap-2"
          >
            <Check
              size={14}
              className={u.id === active.id ? 'mt-0.5 text-[#00D094]' : 'mt-0.5 opacity-0'}
            />
            <span className="flex flex-col">
              <span className="text-sm font-bold text-slate-800">{u.name}</span>
              <span className="text-[10px] font-medium uppercase tracking-widest text-slate-400">
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
