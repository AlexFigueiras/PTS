'use client';

import Link from 'next/link';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { NEED_TYPES } from '@pts/domain';
import { confirmSignalAction, discardSignalAction } from '@/modules/pts/actions';
import { Sparkles, Check, X, Loader2, AlertTriangle, ArrowUpRight, Zap, Handshake } from 'lucide-react';

const NEED_LABEL_BY_ID = new Map<string, string>(NEED_TYPES.map((n) => [n.id, n.label]));

type SuggestionSignal = {
  id: string;
  caseId: string;
  patientId: string | null;
  priority: string;
  needTypeId: string | null;
  abstractReason: string;
  createdAt: Date | string;
};

type ActionFn = (input: { signalId: string }) => Promise<{ error: string | null; success: unknown }>;

function SuggestionCard({ signal, onDone }: { signal: SuggestionSignal; onDone: () => void }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const needLabel = signal.needTypeId
    ? NEED_LABEL_BY_ID.get(signal.needTypeId) ?? signal.needTypeId
    : 'Sugestão da IA';
  const isImediata = signal.priority === 'imediata';

  function run(fn: ActionFn) {
    setError(null);
    startTransition(async () => {
      const result = await fn({ signalId: signal.id });
      if (result.error) setError(result.error);
      else onDone();
    });
  }

  return (
    <div className="rounded-xl border border-border bg-background p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[9px] font-black uppercase tracking-widest ${
                isImediata ? 'bg-rose-100 text-rose-600' : 'bg-sky-100 text-sky-600'
              }`}
            >
              {isImediata ? <Zap size={9} /> : <Handshake size={9} />}
              {isImediata ? 'Imediata' : 'Pactuada'}
            </span>
            <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest text-primary/70">
              <Sparkles size={9} /> Sugerida pela IA
            </span>
          </div>
          <p className="truncate text-sm font-semibold text-foreground">{needLabel}</p>
          <p className="line-clamp-2 text-xs text-muted-foreground">{signal.abstractReason}</p>
        </div>
        {signal.patientId && (
          <Link
            href={`/patients/${signal.patientId}/caso`}
            className="shrink-0 rounded-lg p-1.5 text-muted-foreground/50 transition-colors hover:bg-muted hover:text-primary"
            title="Abrir caso"
          >
            <ArrowUpRight size={14} />
          </Link>
        )}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        <button
          onClick={() => run(confirmSignalAction)}
          disabled={isPending}
          className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-emerald-600 transition-all hover:bg-emerald-500/20 active:scale-95 disabled:opacity-50"
        >
          {isPending ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />}
          Aceitar
        </button>
        <button
          onClick={() => run(discardSignalAction)}
          disabled={isPending}
          className="inline-flex items-center gap-1.5 rounded-lg bg-muted px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground transition-all hover:bg-rose-500/10 hover:text-rose-600 active:scale-95 disabled:opacity-50"
        >
          {isPending ? <Loader2 size={11} className="animate-spin" /> : <X size={11} />}
          Rejeitar
        </button>
      </div>

      {error && (
        <p className="mt-2 flex items-center gap-1 text-[10px] font-bold text-rose-600">
          <AlertTriangle size={10} /> {error}
        </p>
      )}
    </div>
  );
}

export function SuggestionInbox({ signals }: { signals: SuggestionSignal[] }) {
  const router = useRouter();

  return (
    <div className="rounded-3xl border border-border bg-card p-6 shadow-diffusion">
      <div className="mb-4 flex items-center gap-3">
        <div className="inline-flex rounded-xl bg-primary/10 p-2">
          <Sparkles size={16} className="text-primary" />
        </div>
        <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground/60 italic">
          Caixa de Sugestões da IA
        </h2>
        {signals.length > 0 && (
          <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[10px] font-black text-primary">
            {signals.length} pendente{signals.length > 1 ? 's' : ''}
          </span>
        )}
      </div>

      {signals.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border bg-muted/20 p-6 text-center text-sm text-muted-foreground">
          Nenhuma sugestão pendente. Encaminhamentos derivados pela IA a partir dos seus relatos
          aparecem aqui para você aceitar ou rejeitar.
        </p>
      ) : (
        <div className="space-y-2">
          {signals.map((s) => (
            <SuggestionCard key={s.id} signal={s} onDone={() => router.refresh()} />
          ))}
        </div>
      )}
    </div>
  );
}
