'use client';

import { useState, useTransition } from 'react';
import {
  SIGNAL_STATUS_LABELS,
  NETWORK_COMPONENTS,
  NEED_TYPES,
  type SignalStatus,
  type SignalPriority,
} from '@pts/domain';
import {
  confirmSignalAction,
  discardSignalAction,
  submitSignalForRtAction,
  validateSignalByRtAction,
  receiveSignalAction,
  treatSignalAction,
  resolveSignalAction,
} from '@/modules/pts/actions';
import { SignalForm } from './signal-form';
import {
  CheckCircle2,
  XCircle,
  Send,
  ShieldCheck,
  Inbox,
  Play,
  Flag,
  Loader2,
  AlertTriangle,
  Zap,
  Handshake,
} from 'lucide-react';

const COMPONENT_NAME_BY_ID = new Map<string, string>(NETWORK_COMPONENTS.map((c) => [c.id, c.name]));
const NEED_LABEL_BY_ID = new Map<string, string>(NEED_TYPES.map((n) => [n.id, n.label]));

type SignalRow = {
  id: string;
  caseId: string;
  status: SignalStatus;
  priority: SignalPriority;
  needTypeId: string | null;
  destinationComponent: string;
  destinationUnitId: string | null;
  assignedProfessionalId: string | null;
  abstractReason: string;
  resolvedAt: Date | string | null;
  createdAt: Date | string;
};

type UnitInfo = { id: string; name: string };

type SignalListProps = {
  signals: SignalRow[];
  caseId: string;
  units: UnitInfo[];
};

const STATUS_BADGE_STYLES: Record<SignalStatus, string> = {
  sugerida: 'bg-slate-100 text-slate-700 border-slate-200',
  confirmada_pelo_autor: 'bg-indigo-100 text-indigo-700 border-indigo-200',
  descartada: 'bg-neutral-200 text-neutral-600 border-neutral-300',
  aguardando_validacao_rt: 'bg-amber-100 text-amber-700 border-amber-200',
  encaminhada: 'bg-sky-100 text-sky-700 border-sky-200',
  recebida: 'bg-cyan-100 text-cyan-700 border-cyan-200',
  em_tratamento: 'bg-violet-100 text-violet-700 border-violet-200',
  resolvida: 'bg-emerald-100 text-emerald-700 border-emerald-200',
};

type ActionFn = (input: { signalId: string }) => Promise<{ error: string | null; success: unknown }>;

type ButtonDef = { label: string; icon: React.ElementType; className: string; fn: ActionFn };

/**
 * Botões oferecidos por status. O servidor reaplica os gates de papel (autor,
 * RT, unidade destino) — aqui apenas expomos as transições possíveis da FSM.
 */
function buttonsForStatus(status: SignalStatus): ButtonDef[] {
  switch (status) {
    case 'sugerida':
      return [
        { label: 'Confirmar', icon: CheckCircle2, className: 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100', fn: confirmSignalAction },
        { label: 'Descartar', icon: XCircle, className: 'bg-rose-50 text-rose-700 hover:bg-rose-100', fn: discardSignalAction },
      ];
    case 'confirmada_pelo_autor':
      return [
        { label: 'Enviar p/ RT', icon: Send, className: 'bg-amber-50 text-amber-700 hover:bg-amber-100', fn: submitSignalForRtAction },
      ];
    case 'aguardando_validacao_rt':
      return [
        { label: 'Validar (RT)', icon: ShieldCheck, className: 'bg-sky-50 text-sky-700 hover:bg-sky-100', fn: validateSignalByRtAction },
        { label: 'Descartar', icon: XCircle, className: 'bg-rose-50 text-rose-700 hover:bg-rose-100', fn: discardSignalAction },
      ];
    case 'encaminhada':
      return [
        { label: 'Receber', icon: Inbox, className: 'bg-cyan-50 text-cyan-700 hover:bg-cyan-100', fn: receiveSignalAction },
      ];
    case 'recebida':
      return [
        { label: 'Iniciar Tratamento', icon: Play, className: 'bg-violet-50 text-violet-700 hover:bg-violet-100', fn: treatSignalAction },
      ];
    case 'em_tratamento':
      return [
        { label: 'Resolver', icon: Flag, className: 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100', fn: resolveSignalAction as ActionFn },
      ];
    default:
      return [];
  }
}

function StatusBadge({ status }: { status: SignalStatus }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-[10px] font-black uppercase tracking-widest ${STATUS_BADGE_STYLES[status]}`}>
      {SIGNAL_STATUS_LABELS[status]}
    </span>
  );
}

function PriorityBadge({ priority }: { priority: SignalPriority }) {
  const isImediata = priority === 'imediata';
  const Icon = isImediata ? Zap : Handshake;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-[9px] font-black uppercase tracking-widest ${
        isImediata ? 'bg-rose-100 text-rose-600' : 'bg-sky-100 text-sky-600'
      }`}
    >
      <Icon size={10} /> {isImediata ? 'Imediata' : 'Pactuada'}
    </span>
  );
}

function TransitionButtons({ signalId, status, onDone }: { signalId: string; status: SignalStatus; onDone: () => void }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const buttons = buttonsForStatus(status);

  if (buttons.length === 0) return null;

  function run(fn: ActionFn) {
    setError(null);
    startTransition(async () => {
      const result = await fn({ signalId });
      if (result.error) setError(result.error);
      else onDone();
    });
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {buttons.map((b) => {
        const Icon = b.icon;
        return (
          <button
            key={b.label}
            onClick={() => run(b.fn)}
            disabled={isPending}
            className={`inline-flex items-center gap-1.5 rounded-xl border border-transparent px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider transition-all duration-200 active:scale-95 disabled:pointer-events-none disabled:opacity-50 ${b.className}`}
          >
            {isPending ? <Loader2 size={12} className="animate-spin" /> : <Icon size={12} />}
            {b.label}
          </button>
        );
      })}
      {error && (
        <p className="mt-1 flex w-full items-center gap-1 text-[10px] font-bold text-rose-600">
          <AlertTriangle size={10} /> {error}
        </p>
      )}
    </div>
  );
}

export function SignalList({ signals, caseId, units }: SignalListProps) {
  const [refreshKey, setRefreshKey] = useState(0);
  const forceRefresh = () => setRefreshKey((k) => k + 1);

  return (
    <div className="space-y-4" key={refreshKey}>
      {signals.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-muted/20 p-6 text-center">
          <p className="mb-1 text-sm text-muted-foreground">Nenhuma sinalização neste caso.</p>
          <p className="text-[10px] text-muted-foreground/60">
            Sinalize uma necessidade para acionar o componente correto da rede.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {signals.map((signal) => {
            const componentName = COMPONENT_NAME_BY_ID.get(signal.destinationComponent) ?? signal.destinationComponent;
            const needLabel = signal.needTypeId ? NEED_LABEL_BY_ID.get(signal.needTypeId) ?? signal.needTypeId : null;
            const unitName = signal.destinationUnitId
              ? units.find((u) => u.id === signal.destinationUnitId)?.name ?? 'Unidade destino'
              : 'Sem unidade vinculada';

            return (
              <div
                key={signal.id}
                id={`signal-${signal.id}`}
                className="group rounded-2xl border border-border bg-card p-5 transition-all duration-200 hover:shadow-sm"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge status={signal.status} />
                      <PriorityBadge priority={signal.priority} />
                    </div>

                    {needLabel && (
                      <p className="text-sm font-semibold text-foreground">{needLabel}</p>
                    )}
                    <p className="text-xs text-muted-foreground">{signal.abstractReason}</p>

                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">
                      <span>🎯 {componentName}</span>
                      <span>📍 {unitName}</span>
                      {signal.resolvedAt && (
                        <span>✅ {new Date(signal.resolvedAt).toLocaleDateString('pt-BR')}</span>
                      )}
                    </div>
                  </div>

                  <div className="shrink-0">
                    <TransitionButtons signalId={signal.id} status={signal.status} onDone={forceRefresh} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <SignalForm caseId={caseId} onCreated={forceRefresh} />
    </div>
  );
}
