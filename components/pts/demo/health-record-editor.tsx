'use client';

import { useState, useTransition } from 'react';
import { HeartPulse, Edit3, Check, X } from 'lucide-react';
import { updateSourceRecordAction } from '@/modules/pts/actions/ingest.action';

type Record = {
  id: string;
  patientId: string;
  patientName: string;
  unitLabel: string;
  rawText: string;
  recordedAt: string;
};

export function HealthRecordEditor({ record }: { record: Record }) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(record.rawText);
  const [saved, setSaved] = useState(false);
  const [isPending, startTransition] = useTransition();

  function save() {
    startTransition(async () => {
      await updateSourceRecordAction({ id: record.id, rawText: text, source: 'health' });
      setSaved(true);
      setEditing(false);
      setTimeout(() => setSaved(false), 2000);
    });
  }

  return (
    <div className="rounded-2xl border border-rose-500/20 bg-card p-6 shadow-sm">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-rose-500/10 p-2">
            <HeartPulse size={16} className="text-rose-600" />
          </div>
          <div>
            <p className="text-sm font-bold text-foreground">{record.unitLabel}</p>
            <p className="text-xs text-muted-foreground">
              {new Date(record.recordedAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
              {' · '}
              <span className="font-medium">{record.patientName}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {saved && <span className="text-[10px] font-bold uppercase text-emerald-600">Salvo</span>}
          {editing ? (
            <>
              <button
                onClick={save}
                disabled={isPending}
                className="flex items-center gap-1.5 rounded-xl bg-emerald-500/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-emerald-600 transition hover:bg-emerald-500/20 disabled:opacity-50"
              >
                <Check size={12} /> Salvar
              </button>
              <button
                onClick={() => { setText(record.rawText); setEditing(false); }}
                className="flex items-center gap-1.5 rounded-xl bg-slate-500/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-muted-foreground transition hover:bg-slate-500/20"
              >
                <X size={12} /> Cancelar
              </button>
            </>
          ) : (
            <button
              onClick={() => setEditing(true)}
              className="flex items-center gap-1.5 rounded-xl bg-rose-500/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-rose-600 transition hover:bg-rose-500/20"
            >
              <Edit3 size={12} /> Editar fator
            </button>
          )}
        </div>
      </div>

      {editing ? (
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={8}
          className="w-full resize-none rounded-xl border border-rose-500/30 bg-background/50 p-4 text-sm text-foreground outline-none focus:border-rose-500/60 focus:ring-2 focus:ring-rose-500/10"
        />
      ) : (
        <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-wrap">{text}</p>
      )}
    </div>
  );
}
