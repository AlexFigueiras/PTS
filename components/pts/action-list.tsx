'use client';

import { useState, useTransition } from 'react';
import {
  ACTION_STATUS_LABELS,
  ACTION_TRANSITIONS,
  type ActionStatus,
} from '@pts/domain';
import {
  createActionAction,
  transitionActionStatusAction,
} from '@/modules/pts/actions';
import {
  Play,
  CheckCircle2,
  Ban,
  Clock,
  Plus,
  Loader2,
  AlertTriangle,
  ChevronRight,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Tipos                                                              */
/* ------------------------------------------------------------------ */

type ActionRow = {
  id: string;
  planId: string;
  status: ActionStatus;
  description: string;
  responsibleUnitId: string;
  assignedProfessionalId: string | null;
  deadline: Date | string;
  evolutionNotes: string | null;
  createdAt: Date | string;
};

type UnitInfo = {
  id: string;
  name: string;
};

type ActionListProps = {
  actions: ActionRow[];
  planId: string;
  /** Unidades disponíveis para atribuição na nova ação */
  units: UnitInfo[];
  /** ID da unidade ativa do profissional logado */
  activeUnitId: string | null;
};

/* ------------------------------------------------------------------ */
/*  Helpers visuais                                                    */
/* ------------------------------------------------------------------ */

const STATUS_BADGE_STYLES: Record<ActionStatus, string> = {
  pactuada: 'bg-sky-100 text-sky-700 border-sky-200',
  em_andamento: 'bg-amber-100 text-amber-700 border-amber-200',
  concluida: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  bloqueada: 'bg-rose-100 text-rose-700 border-rose-200',
};

const TRANSITION_BUTTON_CONFIG: Record<ActionStatus, { icon: React.ElementType; label: string; className: string }> = {
  pactuada: { icon: Clock, label: 'Pactuada', className: 'bg-sky-50 text-sky-700 hover:bg-sky-100' },
  em_andamento: { icon: Play, label: 'Iniciar', className: 'bg-amber-50 text-amber-700 hover:bg-amber-100' },
  concluida: { icon: CheckCircle2, label: 'Concluir', className: 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100' },
  bloqueada: { icon: Ban, label: 'Bloquear', className: 'bg-rose-50 text-rose-700 hover:bg-rose-100' },
};

/* ------------------------------------------------------------------ */
/*  Componente: Badge de Status                                       */
/* ------------------------------------------------------------------ */

function StatusBadge({ status }: { status: ActionStatus }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-[10px] font-black uppercase tracking-widest ${STATUS_BADGE_STYLES[status]}`}
    >
      {ACTION_STATUS_LABELS[status]}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  Componente: Botões de transição de estado                         */
/* ------------------------------------------------------------------ */

function TransitionButtons({
  actionId,
  currentStatus,
  onTransitioned,
}: {
  actionId: string;
  currentStatus: ActionStatus;
  onTransitioned: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const validNextStatuses = ACTION_TRANSITIONS[currentStatus] ?? [];

  if (validNextStatuses.length === 0) return null;

  function handleTransition(nextStatus: ActionStatus) {
    setError(null);
    startTransition(async () => {
      const result = await transitionActionStatusAction({
        actionId,
        currentStatus,
        nextStatus,
      });
      if (result.error) {
        setError(result.error);
      } else {
        onTransitioned();
      }
    });
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {validNextStatuses.map((next) => {
        const config = TRANSITION_BUTTON_CONFIG[next];
        const Icon = config.icon;
        return (
          <button
            key={next}
            onClick={() => handleTransition(next)}
            disabled={isPending}
            className={`
              inline-flex items-center gap-1.5 rounded-xl border border-transparent
              px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider
              transition-all duration-200 active:scale-95
              disabled:pointer-events-none disabled:opacity-50
              ${config.className}
            `}
          >
            {isPending ? <Loader2 size={12} className="animate-spin" /> : <Icon size={12} />}
            {config.label}
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

/* ------------------------------------------------------------------ */
/*  Componente: Formulário de nova ação                               */
/* ------------------------------------------------------------------ */

function NewActionForm({
  planId,
  units,
  activeUnitId,
  onCreated,
}: {
  planId: string;
  units: UnitInfo[];
  activeUnitId: string | null;
  onCreated: () => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const form = e.currentTarget;
    const formData = new FormData(form);

    startTransition(async () => {
      const result = await createActionAction({
        planId,
        responsibleUnitId: formData.get('responsibleUnitId') as string,
        description: formData.get('description') as string,
        deadline: formData.get('deadline') as string,
      });

      if (result.error) {
        setError(result.error);
      } else {
        form.reset();
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
        <Plus size={14} /> Pactuar Nova Ação
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
      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">
        Nova Ação Pactuada
      </p>

      <div className="space-y-3">
        {/* Descrição */}
        <div>
          <label htmlFor="new-action-description" className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Descrição da Ação
          </label>
          <textarea
            id="new-action-description"
            name="description"
            required
            minLength={3}
            maxLength={1000}
            rows={3}
            placeholder="Descreva a ação a ser realizada..."
            className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/40 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {/* Unidade responsável */}
          <div>
            <label htmlFor="new-action-unit" className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Unidade Responsável
            </label>
            <select
              id="new-action-unit"
              name="responsibleUnitId"
              required
              defaultValue={activeUnitId ?? ''}
              className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="" disabled>Selecione...</option>
              {units.map((u) => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
          </div>

          {/* Prazo */}
          <div>
            <label htmlFor="new-action-deadline" className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Prazo Limite
            </label>
            <input
              id="new-action-deadline"
              name="deadline"
              type="date"
              required
              className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
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
          disabled={isPending}
          className="
            inline-flex items-center gap-2 rounded-2xl bg-primary px-6 py-2.5
            text-[10px] font-black uppercase tracking-[0.2em] text-primary-foreground
            shadow-[0_0_20px_rgba(var(--primary),0.15)] transition-all duration-200
            hover:scale-105 active:scale-95 disabled:opacity-50
          "
        >
          {isPending ? <Loader2 size={12} className="animate-spin" /> : <ChevronRight size={12} />}
          Pactuar
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

/* ------------------------------------------------------------------ */
/*  Componente principal: Lista de Ações                              */
/* ------------------------------------------------------------------ */

export function ActionList({ actions: initialActions, planId, units, activeUnitId }: ActionListProps) {
  // O revalidatePath no server action atualiza a page inteira;
  // forceamos refresh via key para re-renderizar client-side imediatamente.
  const [refreshKey, setRefreshKey] = useState(0);
  const forceRefresh = () => setRefreshKey((k) => k + 1);

  // Nota: como a page é Server Component, os dados vêm atualizados
  // via revalidatePath no server action. O refreshKey garante re-mount
  // dos botões de transição que dependem do currentStatus.

  if (initialActions.length === 0 && !planId) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-muted/30 p-8 text-center">
        <p className="text-sm text-muted-foreground">
          Nenhum plano ativo encontrado. Inicie o acompanhamento do caso primeiro.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4" key={refreshKey}>
      {initialActions.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-muted/20 p-6 text-center">
          <p className="mb-1 text-sm text-muted-foreground">
            Nenhuma ação pactuada neste plano.
          </p>
          <p className="text-[10px] text-muted-foreground/60">
            Pactue a primeira ação para iniciar a coordenação intersetorial.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {initialActions.map((action) => {
            const deadline = new Date(action.deadline);
            const isOverdue = action.status !== 'concluida' && deadline < new Date();
            const unitName = units.find((u) => u.id === action.responsibleUnitId)?.name ?? 'Unidade';

            return (
              <div
                key={action.id}
                id={`action-${action.id}`}
                className={`
                  group rounded-2xl border bg-card p-5 transition-all duration-200
                  hover:shadow-sm
                  ${isOverdue ? 'border-rose-300/50 bg-rose-50/30' : 'border-border'}
                `}
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  {/* Conteúdo principal */}
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge status={action.status} />
                      {isOverdue && (
                        <span className="inline-flex items-center gap-1 rounded-lg bg-rose-100 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-rose-600">
                          <AlertTriangle size={10} /> Vencida
                        </span>
                      )}
                    </div>

                    <p className="text-sm font-semibold text-foreground">
                      {action.description}
                    </p>

                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">
                      <span>📍 {unitName}</span>
                      <span>📅 {deadline.toLocaleDateString('pt-BR')}</span>
                    </div>

                    {action.evolutionNotes && (
                      <p className="mt-1 rounded-lg bg-muted/30 px-3 py-2 text-xs italic text-muted-foreground">
                        {action.evolutionNotes}
                      </p>
                    )}
                  </div>

                  {/* Botões de transição */}
                  <div className="shrink-0">
                    <TransitionButtons
                      actionId={action.id}
                      currentStatus={action.status}
                      onTransitioned={forceRefresh}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Formulário para nova ação */}
      {planId && (
        <NewActionForm
          planId={planId}
          units={units}
          activeUnitId={activeUnitId}
          onCreated={forceRefresh}
        />
      )}
    </div>
  );
}
