'use client';

import { useState, useTransition } from 'react';
import {
  ACTION_STATUS_LABELS,
  ACTION_TRANSITIONS,
  FREQUENCIA_LABELS,
  HORIZONTE_LABELS,
  ACEITE_LABELS,
  REAVALIACAO_RESULTADO_LABELS,
  REAVALIACAO_PROXIMA_ACAO_LABELS,
  STATUS_TEMPORAL_LABELS,
  computeStatusTemporal,
  type ActionStatus,
  type FrequenciaTipo,
  type HorizonteTipo,
  type AceiteUsuario,
  type ReavaliacaoResultado,
  type ReavaliacaoProximaAcao,
  type StatusTemporal,
} from '@pts/domain';
import {
  createActionAction,
  transitionActionStatusAction,
  createReavaliacaoAction,
  listReavaliacoesAction,
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
  CalendarDays,
  RefreshCcw,
  ChevronDown,
  ChevronUp,
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
  // Campos temporais
  dataInicio?: string | null;
  prazofim?: string | null;
  frequenciaTipo?: FrequenciaTipo | null;
  frequenciaDetalhe?: string | null;
  proximoRetorno?: string | null;
  dataProximaReavaliacao?: string | null;
  horizonteTipo?: HorizonteTipo | null;
  aceiteUsuario?: AceiteUsuario | null;
};

type ReavaliacaoRow = {
  id: string;
  data: string;
  resultado: ReavaliacaoResultado;
  nota: string | null;
  proximaAcao: ReavaliacaoProximaAcao;
  createdAt: Date | string;
};

type UnitInfo = {
  id: string;
  name: string;
};

type ActionListProps = {
  actions: ActionRow[];
  planId: string;
  units: UnitInfo[];
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

const RESULTADO_BADGE: Record<ReavaliacaoResultado, string> = {
  cumpriu: 'bg-emerald-100 text-emerald-700',
  cumpriu_parcial: 'bg-amber-100 text-amber-700',
  nao_cumpriu: 'bg-rose-100 text-rose-700',
};

function fmtDate(val: string | null | undefined) {
  if (!val) return '—';
  // date strings from Postgres are YYYY-MM-DD
  const [y, m, d] = val.split('-');
  return `${d}/${m}/${y}`;
}

function labelOrDash<T extends string>(map: Record<T, string>, val: T | null | undefined) {
  if (!val) return '—';
  return map[val] ?? val;
}

/* ------------------------------------------------------------------ */
/*  Badge de Status                                                    */
/* ------------------------------------------------------------------ */

function StatusBadge({ status }: { status: ActionStatus }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-[10px] font-black uppercase tracking-widest ${STATUS_BADGE_STYLES[status]}`}>
      {ACTION_STATUS_LABELS[status]}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  Semáforo de cumprimento (§5.7)                                     */
/* ------------------------------------------------------------------ */

const SEMAPHORE_STYLES: Record<StatusTemporal, { dot: string; badge: string }> = {
  verde:    { dot: 'bg-emerald-500', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  amarelo:  { dot: 'bg-amber-400',   badge: 'bg-amber-50 text-amber-700 border-amber-200' },
  vermelho: { dot: 'bg-rose-500',    badge: 'bg-rose-50 text-rose-700 border-rose-200' },
};

function SemaforoBadge({ status }: { status: StatusTemporal }) {
  const s = SEMAPHORE_STYLES[status];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[10px] font-black uppercase tracking-widest ${s.badge}`}>
      <span className={`size-2 rounded-full ${s.dot}`} aria-hidden="true" />
      {STATUS_TEMPORAL_LABELS[status]}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  Botões de transição de estado                                      */
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
      const result = await transitionActionStatusAction({ actionId, currentStatus, nextStatus });
      if (result.error) setError(result.error);
      else onTransitioned();
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
            className={`inline-flex items-center gap-1.5 rounded-xl border border-transparent px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider transition-all duration-200 active:scale-95 disabled:pointer-events-none disabled:opacity-50 ${config.className}`}
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
/*  Painel de Reavaliações                                             */
/* ------------------------------------------------------------------ */

function ReavaliacaoPanel({ actionId }: { actionId: string }) {
  const [open, setOpen] = useState(false);
  const [history, setHistory] = useState<ReavaliacaoRow[] | null>(null);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function togglePanel() {
    if (!open && history === null) {
      setLoadingHistory(true);
      listReavaliacoesAction(actionId).then((res) => {
        setHistory((res.success as ReavaliacaoRow[]) ?? []);
        setLoadingHistory(false);
      });
    }
    setOpen((v) => !v);
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    const form = e.currentTarget;

    startTransition(async () => {
      const result = await createReavaliacaoAction({
        acaoId: actionId,
        data: fd.get('data') as string,
        resultado: fd.get('resultado') as string,
        nota: fd.get('nota') as string || null,
        proximaAcao: fd.get('proximaAcao') as string,
        novaDataReavaliacao: fd.get('novaDataReavaliacao') as string || null,
      });

      if (result.error) {
        setError(result.error);
      } else {
        // Reload history
        const fresh = await listReavaliacoesAction(actionId);
        setHistory((fresh.success as ReavaliacaoRow[]) ?? []);
        setFormOpen(false);
        form.reset();
      }
    });
  }

  return (
    <div className="mt-3 border-t border-border pt-3">
      <button
        onClick={togglePanel}
        className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
      >
        <RefreshCcw size={11} />
        Reavaliações
        {open ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
      </button>

      {open && (
        <div className="mt-3 space-y-3 animate-in fade-in slide-in-from-top-1 duration-200">
          {loadingHistory && (
            <p className="text-[10px] text-muted-foreground flex items-center gap-1">
              <Loader2 size={10} className="animate-spin" /> Carregando...
            </p>
          )}

          {history && history.length === 0 && !formOpen && (
            <p className="text-[10px] text-muted-foreground/60 italic">Nenhuma reavaliação registrada.</p>
          )}

          {history && history.length > 0 && (
            <div className="space-y-2">
              {history.map((rev) => (
                <div key={rev.id} className="rounded-xl bg-muted/30 px-3 py-2.5 text-xs space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`rounded-md px-2 py-0.5 text-[9px] font-black uppercase tracking-wider ${RESULTADO_BADGE[rev.resultado]}`}>
                      {REAVALIACAO_RESULTADO_LABELS[rev.resultado]}
                    </span>
                    <span className="text-[10px] font-semibold text-muted-foreground">{fmtDate(rev.data)}</span>
                    <span className="text-[10px] text-muted-foreground/60">
                      → {REAVALIACAO_PROXIMA_ACAO_LABELS[rev.proximaAcao]}
                    </span>
                  </div>
                  {rev.nota && <p className="text-xs text-muted-foreground italic">{rev.nota}</p>}
                </div>
              ))}
            </div>
          )}

          {!formOpen ? (
            <button
              onClick={() => setFormOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-dashed border-primary/30 bg-primary/5 px-4 py-2 text-[10px] font-black uppercase tracking-wider text-primary hover:border-primary/60 hover:bg-primary/10 transition-all"
            >
              <Plus size={11} /> Registrar Reavaliação
            </button>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3 rounded-xl border border-primary/20 bg-primary/5 p-4 animate-in fade-in slide-in-from-top-2 duration-200">
              <p className="text-[10px] font-black uppercase tracking-widest text-primary">Nova Reavaliação</p>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    Data da Reavaliação *
                  </label>
                  <input
                    name="data"
                    type="date"
                    required
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    Resultado *
                  </label>
                  <select
                    name="resultado"
                    required
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    <option value="" disabled>Selecione...</option>
                    <option value="cumpriu">{REAVALIACAO_RESULTADO_LABELS.cumpriu}</option>
                    <option value="cumpriu_parcial">{REAVALIACAO_RESULTADO_LABELS.cumpriu_parcial}</option>
                    <option value="nao_cumpriu">{REAVALIACAO_RESULTADO_LABELS.nao_cumpriu}</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Próxima Ação *
                </label>
                <select
                  name="proximaAcao"
                  required
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value="" disabled>Selecione...</option>
                  <option value="continuar">{REAVALIACAO_PROXIMA_ACAO_LABELS.continuar}</option>
                  <option value="repactuar">{REAVALIACAO_PROXIMA_ACAO_LABELS.repactuar}</option>
                  <option value="encerrar">{REAVALIACAO_PROXIMA_ACAO_LABELS.encerrar}</option>
                  <option value="escalar">{REAVALIACAO_PROXIMA_ACAO_LABELS.escalar}</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Nova data de reavaliação (se continuar)
                </label>
                <input
                  name="novaDataReavaliacao"
                  type="date"
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div>
                <label className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Nota
                </label>
                <textarea
                  name="nota"
                  rows={2}
                  maxLength={2000}
                  placeholder="Observações sobre o cumprimento da ação..."
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground/40 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              {error && (
                <p className="flex items-center gap-1 text-[10px] font-bold text-rose-600">
                  <AlertTriangle size={10} /> {error}
                </p>
              )}

              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={isPending}
                  className="inline-flex items-center gap-2 rounded-2xl bg-primary px-5 py-2 text-[10px] font-black uppercase tracking-wider text-primary-foreground shadow transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
                >
                  {isPending ? <Loader2 size={11} className="animate-spin" /> : <CheckCircle2 size={11} />}
                  Salvar
                </button>
                <button
                  type="button"
                  onClick={() => setFormOpen(false)}
                  className="rounded-2xl px-5 py-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Formulário de nova ação                                            */
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
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setFieldErrors({});

    const form = e.currentTarget;
    const formData = new FormData(form);

    startTransition(async () => {
      const result = await createActionAction({
        planId,
        responsibleUnitId: formData.get('responsibleUnitId') as string,
        description: formData.get('description') as string,
        deadline: formData.get('deadline') as string,
        dataInicio: formData.get('dataInicio') as string || null,
        prazofim: formData.get('prazofim') as string || null,
        frequenciaTipo: formData.get('frequenciaTipo') as string || null,
        frequenciaDetalhe: formData.get('frequenciaDetalhe') as string || null,
        proximoRetorno: formData.get('proximoRetorno') as string || null,
        dataProximaReavaliacao: formData.get('dataProximaReavaliacao') as string || null,
        horizonteTipo: formData.get('horizonteTipo') as string || null,
        aceiteUsuario: formData.get('aceiteUsuario') as string || null,
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
        className="inline-flex items-center gap-2 rounded-2xl border border-dashed border-primary/30 bg-primary/5 px-6 py-3 text-[10px] font-black uppercase tracking-[0.2em] text-primary transition-all duration-200 hover:border-primary/60 hover:bg-primary/10 active:scale-95"
      >
        <Plus size={14} /> Pactuar Nova Ação
      </button>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 rounded-2xl border border-primary/20 bg-primary/5 p-6 animate-in fade-in slide-in-from-top-2 duration-300"
    >
      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">
        Nova Ação Pactuada
      </p>

      {/* Gate educativo §5.6 */}
      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-[10px] text-amber-700 font-semibold leading-relaxed">
        Toda ação pactuada exige prazo de término, frequência e data de reavaliação — sem isso vira rol de atividades, não PTS.
      </div>

      <div className="space-y-4">
        {/* Descrição */}
        <div>
          <label className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Descrição da Ação *
          </label>
          <textarea
            name="description"
            required
            minLength={3}
            maxLength={1000}
            rows={3}
            placeholder="Descreva a ação a ser realizada..."
            className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm placeholder:text-muted-foreground/40 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {/* Unidade responsável */}
          <div>
            <label className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Unidade Responsável *
            </label>
            <select
              name="responsibleUnitId"
              required
              defaultValue={activeUnitId ?? ''}
              className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="" disabled>Selecione...</option>
              {units.map((u) => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
          </div>

          {/* Aceite do usuário */}
          <div>
            <label className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Aceite do Usuário
            </label>
            <select
              name="aceiteUsuario"
              className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="">Não registrado</option>
              <option value="aceita">{ACEITE_LABELS.aceita}</option>
              <option value="recusa">{ACEITE_LABELS.recusa}</option>
              <option value="repactuar">{ACEITE_LABELS.repactuar}</option>
            </select>
          </div>
        </div>

        {/* Horizonte */}
        <div>
          <label className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Horizonte Temporal
          </label>
          <select
            name="horizonteTipo"
            className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            <option value="">Não definido</option>
            <option value="curto_prazo">{HORIZONTE_LABELS.curto_prazo}</option>
            <option value="medio_prazo">{HORIZONTE_LABELS.medio_prazo}</option>
            <option value="longo_prazo">{HORIZONTE_LABELS.longo_prazo}</option>
          </select>
        </div>

        {/* Datas — linha 1 */}
        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <label className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Data de Início
            </label>
            <input
              name="dataInicio"
              type="date"
              className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <div>
            <label className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Prazo de Término *
            </label>
            <input
              name="prazofim"
              type="date"
              required
              className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <div>
            <label className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Prazo Limite (sistema)
            </label>
            <input
              name="deadline"
              type="date"
              required
              className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
        </div>

        {/* Frequência */}
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Frequência *
            </label>
            <select
              name="frequenciaTipo"
              required
              className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="" disabled>Selecione...</option>
              {(Object.keys(FREQUENCIA_LABELS) as FrequenciaTipo[]).map((k) => (
                <option key={k} value={k}>{FREQUENCIA_LABELS[k]}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Detalhe de Cadência
            </label>
            <input
              name="frequenciaDetalhe"
              type="text"
              maxLength={200}
              placeholder='Ex.: "1ª e 3ª quinta do mês"'
              className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm placeholder:text-muted-foreground/40 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
        </div>

        {/* Retorno e reavaliação */}
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Próximo Retorno
            </label>
            <input
              name="proximoRetorno"
              type="date"
              className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <div>
            <label className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Data da Próxima Reavaliação *
            </label>
            <input
              name="dataProximaReavaliacao"
              type="date"
              required
              className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
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
          className="inline-flex items-center gap-2 rounded-2xl bg-primary px-6 py-2.5 text-[10px] font-black uppercase tracking-[0.2em] text-primary-foreground shadow-[0_0_20px_rgba(var(--primary),0.15)] transition-all duration-200 hover:scale-105 active:scale-95 disabled:opacity-50"
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
  const [refreshKey, setRefreshKey] = useState(0);
  const forceRefresh = () => setRefreshKey((k) => k + 1);

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
          <p className="mb-1 text-sm text-muted-foreground">Nenhuma ação pactuada neste plano.</p>
          <p className="text-[10px] text-muted-foreground/60">
            Pactue a primeira ação para iniciar a coordenação intersetorial.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {[...initialActions]
            .map((action) => ({
              action,
              semaforo: computeStatusTemporal(
                new Date(),
                action.status,
                action.prazofim,
                action.proximoRetorno,
                action.dataProximaReavaliacao,
              ),
            }))
            // Red-first, then yellow, then green
            .sort((a, b) => {
              const order: Record<StatusTemporal, number> = { vermelho: 0, amarelo: 1, verde: 2 };
              return order[a.semaforo] - order[b.semaforo];
            })
            .map(({ action, semaforo }) => {
            const deadline = new Date(action.deadline);
            const isOverdue = action.status !== 'concluida' && deadline < new Date();
            const unitName = units.find((u) => u.id === action.responsibleUnitId)?.name ?? 'Unidade';

            return (
              <div
                key={action.id}
                id={`action-${action.id}`}
                className={`group rounded-2xl border bg-card p-5 transition-all duration-200 hover:shadow-sm ${
                  semaforo === 'vermelho'
                    ? 'border-rose-300/50 bg-rose-50/30'
                    : semaforo === 'amarelo'
                    ? 'border-amber-200/60 bg-amber-50/20'
                    : 'border-border'
                }`}
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  {/* Conteúdo principal */}
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <SemaforoBadge status={semaforo} />
                      <StatusBadge status={action.status} />
                      {isOverdue && (
                        <span className="inline-flex items-center gap-1 rounded-lg bg-rose-100 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-rose-600">
                          <AlertTriangle size={10} /> Vencida
                        </span>
                      )}
                      {action.aceiteUsuario && (
                        <span className="inline-flex items-center gap-1 rounded-lg bg-violet-100 px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-violet-600">
                          👤 {ACEITE_LABELS[action.aceiteUsuario]}
                        </span>
                      )}
                      {action.horizonteTipo && (
                        <span className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2 py-0.5 text-[9px] font-bold text-slate-500">
                          {HORIZONTE_LABELS[action.horizonteTipo]}
                        </span>
                      )}
                    </div>

                    <p className="text-sm font-semibold text-foreground">{action.description}</p>

                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">
                      <span>📍 {unitName}</span>
                      <span>📅 Prazo {deadline.toLocaleDateString('pt-BR')}</span>
                      {action.prazofim && <span>🏁 Término {fmtDate(action.prazofim)}</span>}
                      {action.frequenciaTipo && (
                        <span>🔁 {labelOrDash(FREQUENCIA_LABELS, action.frequenciaTipo)}{action.frequenciaDetalhe ? ` — ${action.frequenciaDetalhe}` : ''}</span>
                      )}
                      {action.dataProximaReavaliacao && (
                        <span className="flex items-center gap-1">
                          <CalendarDays size={10} /> Reaval. {fmtDate(action.dataProximaReavaliacao)}
                        </span>
                      )}
                    </div>

                    {action.evolutionNotes && (
                      <p className="mt-1 rounded-lg bg-muted/30 px-3 py-2 text-xs italic text-muted-foreground">
                        {action.evolutionNotes}
                      </p>
                    )}

                    {/* Painel de reavaliações */}
                    <ReavaliacaoPanel actionId={action.id} />
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
