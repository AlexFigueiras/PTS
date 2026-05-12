'use client';

import * as React from 'react';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { AnimatePresence, motion } from 'framer-motion';

type AttendanceItem = {
  patientId: string;
  patientName: string;
  isPresent: boolean;
  participationNotes?: string;
  outcomes?: string;
};

interface AttendanceListProps {
  members: { patientId: string; patientName: string }[];
  onChange: (attendance: AttendanceItem[]) => void;
}

export function AttendanceList({ members, onChange }: AttendanceListProps) {
  const [attendance, setAttendance] = React.useState<AttendanceItem[]>(
    members.map((m) => ({ ...m, isPresent: true }))
  );

  const updateItem = (patientId: string, updates: Partial<AttendanceItem>) => {
    const newList = attendance.map((item) =>
      item.patientId === patientId ? { ...item, ...updates } : item
    );
    setAttendance(newList);
    onChange(newList);
  };

  return (
    <div className="space-y-4">
      {attendance.map((item) => (
        <Card key={item.patientId} className="overflow-hidden border-zinc-200/50 shadow-sm transition-all hover:shadow-md">
          <CardContent className="p-6">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary font-bold">
                  {item.patientName.charAt(0)}
                </div>
                <div>
                  <p className="font-semibold text-slate-800">{item.patientName}</p>
                  <p className="text-xs text-slate-400">Paciente</p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Label htmlFor={`presence-${item.patientId}`} className="text-sm font-medium">
                    {item.isPresent ? 'Presente' : 'Faltou'}
                  </Label>
                  <Switch
                    id={`presence-${item.patientId}`}
                    checked={item.isPresent}
                    onCheckedChange={(checked) => updateItem(item.patientId, { isPresent: checked })}
                  />
                </div>
              </div>
            </div>

            <AnimatePresence>
              {(!item.isPresent || item.participationNotes !== undefined) && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="mt-6 space-y-4 overflow-hidden border-t pt-6"
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                        Observações de Participação
                      </Label>
                      <Textarea
                        placeholder="Como foi a participação do paciente?"
                        value={item.participationNotes || ''}
                        onChange={(e) => updateItem(item.patientId, { participationNotes: e.target.value })}
                        className="min-h-[100px] resize-none border-zinc-100 bg-zinc-50/30"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                        Desfechos e Ações
                      </Label>
                      <Textarea
                        placeholder="Alguma ação necessária ou desfecho específico?"
                        value={item.outcomes || ''}
                        onChange={(e) => updateItem(item.patientId, { outcomes: e.target.value })}
                        className="min-h-[100px] resize-none border-zinc-100 bg-zinc-50/30"
                      />
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            
            {item.isPresent && item.participationNotes === undefined && (
              <button
                type="button"
                onClick={() => updateItem(item.patientId, { participationNotes: '' })}
                className="mt-4 text-xs font-medium text-primary hover:underline"
              >
                + Adicionar notas de participação
              </button>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
