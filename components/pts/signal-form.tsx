'use client';

import { useState, useTransition } from 'react';
import {
  NEED_TYPES,
  NETWORK_COMPONENTS,
  getComponentsForNeed,
  type SignalPriority,
} from '@pts/domain';
import { createSignalAction } from '@/modules/pts/actions';
import { Plus, Loader2, ChevronRight, AlertTriangle, Radio, Zap, Handshake } from 'lucide-react';

const COMPONENT_NAME_BY_ID = new Map<string, string>(NETWORK_COMPONENTS.map((c) => [c.id, c.name]));

export function SignalForm({ caseId, onCreated }: { caseId: string; onCreated: () => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [needTypeId, setNeedTypeId] = useState('');
  const [priority, setPriority] = useState<SignalPriority>('pactuada');

  const suggestedComponents = needTypeId ? getComponentsForNeed(needTypeId) : [];

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const form = e.currentTarget;
    const formData = new FormData(form);
    const abstractReason = formData.get('abstractReason') as string;

    startTransition(async () => {
      const result = await createSignalAction({
        caseId,
        needTypeId,
        priority,
        abstractReason,
      });

      if (result.error) {
        setError(result.error);
      } else {
        form.reset();
        setNeedTypeId('');
        setPriority('pactuada');
        setIsOpen(false);
        onCreated();
      }
    });
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="
          inline-flex items-center gap-2 rounded-2xl border border-dashed border-primary/30
          bg-primary/5 px-6 py-3 text-[10px] font-black uppercase tracking-[0.2em]
          text-primary transition-all duration-200 hover:border-primary/60
          hover:bg-primary/10 active:scale-95
        "
      >
        <Plus size={14} /> Nova Sinalização
      </button>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="
        space-y-4 rounded-2xl border border-primary/20 bg-primary/5 p-6
        animate-in fade-in slide-in-from-top-2 duration-300
      "
    >
      <p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-primary">
        <Radio size={12} /> Nova Sinalização Cruzada
      </p>

      <div className="space-y-3">
        {/* Tipo de necessidade */}
        <div>
          <label htmlFor="signal-need" className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Tipo de Necessidade
          </label>
          <select
            id="signal-need"
            name="needTypeId"
            required
            value={needTypeId}
            onChange={(e) => setNeedTypeId(e.target.value)}
            className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            <option value="" disabled>Selecione a necessidade...</option>
            {NEED_TYPES.map((n) => (
              <option key={n.id} value={n.id}>{n.label}</option>
            ))}
          </select>
        </div>

        {/* Sugestão de roteamento */}
        {suggestedComponents.length > 0 && (
          <div className="rounded-xl border border-sky-200 bg-sky-50/50 px-4 py-2.5">
            <p className="text-[9px] font-black uppercase tracking-widest text-sky-700">
              Roteamento sugerido
            </p>
            <p className="mt-1 text-xs text-sky-900">
              {suggestedComponents.map((c) => COMPONENT_NAME_BY_ID.get(c) ?? c).join(' · ')}
            </p>
          </div>
        )}

        {/* Prioridade */}
        <div>
          <label className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Prioridade
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setPriority('imediata')}
              className={`
                inline-flex items-center justify-center gap-1.5 rounded-xl border px-3 py-2.5
                text-[10px] font-bold uppercase tracking-wider transition-all
                ${priority === 'imediata'
                  ? 'border-rose-300 bg-rose-50 text-rose-700'
                  : 'border-border bg-background text-muted-foreground hover:border-rose-200'}
              `}
            >
              <Zap size={12} /> Imediata
            </button>
            <button
              type="button"
              onClick={() => setPriority('pactuada')}
              className={`
                inline-flex items-center justify-center gap-1.5 rounded-xl border px-3 py-2.5
                text-[10px] font-bold uppercase tracking-wider transition-all
                ${priority === 'pactuada'
                  ? 'border-sky-300 bg-sky-50 text-sky-700'
                  : 'border-border bg-background text-muted-foreground hover:border-sky-200'}
              `}
            >
              <Handshake size={12} /> Pactuada
            </button>
          </div>
          <p className="mt-1 text-[9px] text-muted-foreground/60">
            {priority === 'imediata'
              ? 'Encaminhada direto à unidade destino; RT é notificada, não bloqueia.'
              : 'Requer validação do Técnico de Referência antes do encaminhamento.'}
          </p>
        </div>

        {/* Motivo abstrato */}
        <div>
          <label htmlFor="signal-reason" className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Motivo (abstrato — sem dado clínico bruto)
          </label>
          <textarea
            id="signal-reason"
            name="abstractReason"
            required
            minLength={3}
            maxLength={1000}
            rows={3}
            placeholder="Descreva a necessidade de coordenação, sem relato clínico/assistencial bruto..."
            className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/40 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
      </div>

      {error && (
        <p className="flex items-center gap-1 text-[10px] font-bold text-rose-600">
          <AlertTriangle size={10} /> {error}
        </p>
      )}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={isPending || !needTypeId}
          className="
            inline-flex items-center gap-2 rounded-2xl bg-primary px-6 py-2.5
            text-[10px] font-black uppercase tracking-[0.2em] text-primary-foreground
            transition-all duration-200 hover:scale-105 active:scale-95 disabled:opacity-50
          "
        >
          {isPending ? <Loader2 size={12} className="animate-spin" /> : <ChevronRight size={12} />}
          Sinalizar
        </button>
        <button
          type="button"
          onClick={() => setIsOpen(false)}
          className="rounded-2xl px-6 py-2.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground transition-colors hover:text-foreground"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
