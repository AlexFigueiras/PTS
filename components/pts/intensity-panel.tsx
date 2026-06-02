'use client';

import { useState, useTransition } from 'react';
import {
  NIVEL_INTENSIDADE_LABELS,
  NIVEL_TRANSITIONS,
  NIVEL_CADENCIA_MESES,
  type NivelIntensidade,
} from '@pts/domain';
import { transitionNivelIntensidadeAction } from '@/modules/pts/actions';
import { TrendingDown, TrendingUp, AlertTriangle, Loader2, CheckCircle2, Archive } from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Estilos por nível                                                  */
/* ------------------------------------------------------------------ */

const NIVEL_STYLES: Record<NivelIntensidade, { badge: string; dot: string }> = {
  intensivo:            { badge: 'bg-rose-100 text-rose-700 border-rose-200',       dot: 'bg-rose-500' },
  manutencao_semestral: { badge: 'bg-amber-100 text-amber-700 border-amber-200',    dot: 'bg-amber-400' },
  manutencao_anual:     { badge: 'bg-sky-100 text-sky-700 border-sky-200',          dot: 'bg-sky-500' },
  alta_continuidade:    { badge: 'bg-emerald-100 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' },
};

/* ------------------------------------------------------------------ */
/*  Badge de nível (importável sozinho)                                */
/* ------------------------------------------------------------------ */

export function NivelIntensidadeBadge({ nivel }: { nivel: NivelIntensidade }) {
  const s = NIVEL_STYLES[nivel];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[10px] font-black uppercase tracking-widest ${s.badge}`}
    >
      <span className={`size-2 rounded-full ${s.dot}`} aria-hidden="true" />
      {NIVEL_INTENSIDADE_LABELS[nivel]}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  Painel completo (usado na página do caso)                          */
/* ------------------------------------------------------------------ */

type IntensityPanelProps = {
  planId: string;
  currentNivel: NivelIntensidade;
  isRt: boolean; // true if the current user is the plan owner (RT)
  arquivado: boolean;
};

function cadenciaLabel(nivel: NivelIntensidade): string {
  const months = NIVEL_CADENCIA_MESES[nivel];
  if (months === null) return 'Estado terminal — sem reavaliação periódica';
  if (months === 1) return 'Reavaliação mensal';
  return `Reavaliação a cada ${months} meses`;
}

export function IntensityPanel({ planId, currentNivel, isRt, arquivado }: IntensityPanelProps) {
  const allowed = NIVEL_TRANSITIONS[currentNivel];
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [localNivel, setLocalNivel] = useState<NivelIntensidade>(currentNivel);
  const [localArquivado, setLocalArquivado] = useState(arquivado);
  const [confirmTarget, setConfirmTarget] = useState<NivelIntensidade | null>(null);

  const allowedForLocal = NIVEL_TRANSITIONS[localNivel];

  function handleConfirm() {
    if (!confirmTarget) return;
    setError(null);
    startTransition(async () => {
      const result = await transitionNivelIntensidadeAction({ planId, toNivel: confirmTarget });
      if (result.error) {
        setError(result.error);
      } else {
        setLocalNivel(confirmTarget);
        if (confirmTarget === 'alta_continuidade') setLocalArquivado(true);
      }
      setConfirmTarget(null);
    });
  }

  if (localArquivado) {
    return (
      <div className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/60 px-5 py-4">
        <Archive size={18} className="shrink-0 text-emerald-600" />
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-emerald-700">
            Caso Arquivado — Alta por Continuidade
          </p>
          <p className="mt-0.5 text-[10px] text-emerald-600/80">
            Trilha de auditoria preservada. Caso nunca deletado.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-2xl border border-border bg-card p-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="space-y-1">
          <p className="text-[10px] font-black uppercase tracking-[0.25em] text-muted-foreground/60">
            Nível de Intensidade do Cuidado
          </p>
          <div className="flex items-center gap-2 flex-wrap">
            <NivelIntensidadeBadge nivel={localNivel} />
            <span className="text-[10px] text-muted-foreground/60">{cadenciaLabel(localNivel)}</span>
          </div>
        </div>
      </div>

      {/* RT-only transition controls */}
      {isRt && allowedForLocal.length > 0 && !confirmTarget && (
        <div className="flex flex-wrap gap-2 pt-1">
          {allowedForLocal.map((target) => {
            const isUpgrade = NIVEL_INTENSIDADE_VALORES.indexOf(target) > NIVEL_INTENSIDADE_VALORES.indexOf(localNivel);
            const Icon = isUpgrade ? TrendingUp : TrendingDown;
            const isTerminal = target === 'alta_continuidade';
            return (
              <button
                key={target}
                onClick={() => setConfirmTarget(target)}
                disabled={isPending}
                className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider transition-all duration-150 active:scale-95 disabled:opacity-50 ${
                  isTerminal
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                    : isUpgrade
                    ? 'border-sky-200 bg-sky-50 text-sky-700 hover:bg-sky-100'
                    : 'border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100'
                }`}
              >
                <Icon size={11} />
                {isTerminal ? 'Alta por Continuidade' : `→ ${NIVEL_INTENSIDADE_LABELS[target]}`}
              </button>
            );
          })}
        </div>
      )}

      {/* Confirmation prompt */}
      {isRt && confirmTarget && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 space-y-2 animate-in fade-in slide-in-from-top-1 duration-200">
          {confirmTarget === 'alta_continuidade' ? (
            <p className="text-[10px] font-semibold text-amber-800 leading-relaxed">
              <strong>Alta por Continuidade</strong> é estado terminal — o caso será arquivado.
              A trilha de auditoria é preservada permanentemente.
              Confirmar?
            </p>
          ) : (
            <p className="text-[10px] font-semibold text-amber-800 leading-relaxed">
              Confirmar transição: <strong>{NIVEL_INTENSIDADE_LABELS[localNivel]}</strong> →{' '}
              <strong>{NIVEL_INTENSIDADE_LABELS[confirmTarget]}</strong>?
              A cadência de reavaliação passará para <strong>{cadenciaLabel(confirmTarget)}</strong>.
            </p>
          )}
          <div className="flex gap-2">
            <button
              onClick={handleConfirm}
              disabled={isPending}
              className="inline-flex items-center gap-1.5 rounded-xl bg-amber-600 px-4 py-1.5 text-[10px] font-black uppercase tracking-wider text-white transition-all hover:bg-amber-700 active:scale-95 disabled:opacity-50"
            >
              {isPending ? <Loader2 size={11} className="animate-spin" /> : <CheckCircle2 size={11} />}
              Confirmar
            </button>
            <button
              type="button"
              onClick={() => setConfirmTarget(null)}
              disabled={isPending}
              className="rounded-xl px-4 py-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {!isRt && allowedForLocal.length > 0 && (
        <p className="text-[10px] text-muted-foreground/60 italic">
          Somente o Técnico de Referência (RT) do plano pode alterar o nível de intensidade.
        </p>
      )}

      {error && (
        <p className="flex items-center gap-1 text-[10px] font-bold text-rose-600">
          <AlertTriangle size={10} /> {error}
        </p>
      )}
    </div>
  );
}

// Need to export the array too for the index comparison inside the component
const NIVEL_INTENSIDADE_VALORES: NivelIntensidade[] = [
  'intensivo',
  'manutencao_semestral',
  'manutencao_anual',
  'alta_continuidade',
];
