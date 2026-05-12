'use client';

import { Check, Clock, X } from 'lucide-react';
import { cn } from '@/lib/utils';

const appointments = [
  { name: 'Linda Brown', type: 'Primeira visita', time: '08:00', status: 'checked' },
  { name: 'Nelly Dean', type: 'Primeira visita', time: '09:00', status: 'checked' },
  { name: 'John Doe', type: 'Primeira visita', time: '10:00', status: 'checked' },
  { name: 'James Vane', type: 'Primeira visita', time: '10:45', status: 'checked' },
  { name: 'Mary Smith', type: 'Consulta', time: '11:00', status: 'cancelled' },
];

export function UpcomingAppointments() {
  return (
    <div className="rounded-[2rem] bg-white p-8 shadow-sm">
      <h3 className="mb-8 text-lg font-semibold text-slate-800">Próximas Consultas</h3>

      <div className="space-y-6">
        {appointments.map((apt, i) => (
          <div key={i} className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 rounded-full bg-slate-200" />
              <div>
                <p className="text-sm font-bold text-slate-800">{apt.name}</p>
                <p className="text-xs text-slate-400">{apt.type}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className={cn(
                "flex h-6 w-6 items-center justify-center rounded-full text-white",
                apt.status === 'checked' ? "bg-[#00D094]" : "bg-rose-500"
              )}>
                {apt.status === 'checked' ? <Check size={14} /> : <X size={14} />}
              </div>
              <span className="text-sm font-medium text-slate-600">{apt.time}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
