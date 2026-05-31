'use client';

import Link from 'next/link';
import { useState, useTransition } from 'react';
import {
  SIGNAL_STATUS_LABELS,
  NEED_TYPES,
  type SignalStatus,
  type SignalPriority,
} from '@pts/domain';
import { receiveSignalAction, treatSignalAction, resolveSignalAction } from '@/modules/pts/actions';
import { Inbox, Play, Flag, Loader2, AlertTriangle, ArrowUpRight, Zap, Handshake } from 'lucide-react';

const NEED_LABEL_BY_ID = new Map<string, string>(NEED_TYPES.map((n) => [n.id, n.label]));

type InboxSignal = {
  id: string;
  caseId: string;
  patientId: string | null;
  status: SignalStatus;
  priority: SignalPriority;
  needTypeId: string | null;
  abstractReason: string;
  createdAt: Date | string;
};

const GROUPS: { key: string; title: string; statuses: SignalStatus[] }[] = [
  { key: 'pendentes', title: 'Pendentes', statuses: ['encaminhada', 'recebida'] },
  { key: 'tratamento', title: 'Em Tratamento', statuses: ['em_tratamento'] },
];

type ActionFn = (input: { signalId: string }) => Promise<{ error: string | null; success: unknown }>;

function quickActionsFor(status: SignalStatus): { label: string; icon: React.ElementType; fn: ActionFn }[] {
  switch (status) {
    case 'encaminhada':
      return [{ label: 'Receber', icon: Inbox, fn: receiveSignalAction }];
    case 'recebida':
      return [{ label: 'Tratar', icon: Play, fn: treatSignalAction }];
    case 'em_tratamento':
      return [{ label: 'Resolver', icon: Flag, fn: resolveSignalAction as ActionFn }];
    default:
      return [];
  }
}

function SignalCard({ signal, onDone }: { signal: InboxSignal; onDone: () => void }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const needLabel = signal.needTypeId ? NEED_LABEL_BY_ID.get(signal.needTypeId) ?? signal.needTypeId : 'Sinalização';
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
            <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/60">
              {SIGNAL_STATUS_LABELS[signal.status]}
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
        {quickActionsFor(signal.status).map((a) => {
          const Icon = a.icon;
          return (
            <button
              key={a.label}
              onClick={() => run(a.fn)}
              disabled={isPending}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-primary transition-all hover:bg-primary/20 active:scale-95 disabled:opacity-50"
            >
              {isPending ? <Loader2 size={11} className="animate-spin" /> : <Icon size={11} />}
              {a.label}
            </button>
          );
        })}
      </div>

      {error && (
        <p className="mt-2 flex items-center gap-1 text-[10px] font-bold text-rose-600">
          <AlertTriangle size={10} /> {error}
        </p>
      )}
    </div>
  );
}

export function SignalInbox({ signals }: { signals: InboxSignal[] }) {
  const [refreshKey, setRefreshKey] = useState(0);
  const forceRefresh = () => setRefreshKey((k) => k + 1);

  const pendingCount = signals.filter((s) => s.status === 'encaminhada' || s.status === 'recebida').length;

  return (
    <div className="rounded-3xl border border-border bg-card p-6 shadow-diffusion" key={refreshKey}>
      <div className="mb-4 flex items-center gap-3">
        <div className="inline-flex rounded-xl bg-primary/10 p-2">
          <Inbox size={16} className="text-primary" />
        </div>
        <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground/60 italic">
          Caixa de Sinalizações
        </h2>
        {pendingCount > 0 && (
          <span className="rounded-full bg-rose-100 px-2.5 py-0.5 text-[10px] font-black text-rose-600">
            {pendingCount} pendente{pendingCount > 1 ? 's' : ''}
          </span>
        )}
      </div>

      {signals.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border bg-muted/20 p-6 text-center text-sm text-muted-foreground">
          Nenhuma sinalização direcionada à sua unidade ativa.
        </p>
      ) : (
        <div className="space-y-5">
          {GROUPS.map((group) => {
            const groupSignals = signals.filter((s) => group.statuses.includes(s.status));
            if (groupSignals.length === 0) return null;
            return (
              <div key={group.key} className="space-y-2">
                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground/50">
                  {group.title} ({groupSignals.length})
                </p>
                <div className="space-y-2">
                  {groupSignals.map((s) => (
                    <SignalCard key={s.id} signal={s} onDone={forceRefresh} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
