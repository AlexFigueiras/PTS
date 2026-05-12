'use client';

import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

const days = [
  { day: 'Sáb', date: 9 },
  { day: 'Dom', date: 7 },
  { day: 'Seg', date: 4, active: true },
  { day: 'Ter', date: 8 },
  { day: 'Qua', date: 5 },
  { day: 'Qui', date: 9 },
  { day: 'Sex', date: 7 },
];

export function DutyHourChart() {
  return (
    <div className="rounded-[2rem] bg-white p-8 shadow-sm">
      <div className="mb-8 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-800">Carga Horária</h3>
        <button className="flex items-center gap-2 rounded-lg bg-[#00D094] px-4 py-1.5 text-xs font-medium text-white">
          Semanal <ChevronDown size={14} />
        </button>
      </div>

      <div className="flex items-center justify-between mb-8">
        {days.map((d) => (
          <div key={d.day} className="flex flex-col items-center gap-3">
            <span className="text-xs font-medium text-slate-400">{d.day}</span>
            <div
              className={cn(
                "flex h-10 w-10 items-center justify-center rounded-xl text-sm font-bold transition-all",
                d.active 
                  ? "bg-[#004AAD]/20 text-[#004AAD] ring-2 ring-[#004AAD]/30" 
                  : "text-slate-600 hover:bg-slate-50"
              )}
            >
              {d.date}
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-center">
        <div className="flex items-center gap-2 rounded-full bg-[#004AAD] px-6 py-2.5 text-white">
          <span className="text-lg font-bold">49 horas</span>
          <span className="text-sm font-medium text-white/70">Média de Horas</span>
        </div>
      </div>
    </div>
  );
}
