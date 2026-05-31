'use client';

import {
  DIMENSIONS,
  DIMENSION_LABELS,
  isAbstractedDimension,
  type Dimension,
} from '@pts/domain';
import {
  Heart,
  Users,
  Brain,
  Scale,
  GraduationCap,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Configuração visual por dimensão                                   */
/* ------------------------------------------------------------------ */

const DIMENSION_ICONS: Record<Dimension, React.ElementType> = {
  saude: Heart,
  social: Users,
  psiquico: Brain,
  juridico: Scale,
  educacao: GraduationCap,
};

/** Paleta de cores derivada por dimensão (bg gradient from/to, text, border). */
const DIMENSION_COLORS: Record<Dimension, { from: string; to: string; text: string; border: string; iconBg: string }> = {
  saude: {
    from: 'from-rose-500/10',
    to: 'to-rose-500/5',
    text: 'text-rose-600',
    border: 'border-rose-500/20',
    iconBg: 'bg-rose-500/15',
  },
  social: {
    from: 'from-amber-500/10',
    to: 'to-amber-500/5',
    text: 'text-amber-600',
    border: 'border-amber-500/20',
    iconBg: 'bg-amber-500/15',
  },
  psiquico: {
    from: 'from-violet-500/10',
    to: 'to-violet-500/5',
    text: 'text-violet-600',
    border: 'border-violet-500/20',
    iconBg: 'bg-violet-500/15',
  },
  juridico: {
    from: 'from-sky-500/10',
    to: 'to-sky-500/5',
    text: 'text-sky-600',
    border: 'border-sky-500/20',
    iconBg: 'bg-sky-500/15',
  },
  educacao: {
    from: 'from-emerald-500/10',
    to: 'to-emerald-500/5',
    text: 'text-emerald-600',
    border: 'border-emerald-500/20',
    iconBg: 'bg-emerald-500/15',
  },
};

/**
 * Converte o score numérico (0-4) em um rótulo textual legível.
 */
function scoreLevelLabel(score: number): string {
  if (score <= 0.5) return 'Sem dados';
  if (score <= 1.5) return 'Crítico';
  if (score <= 2.5) return 'Atenção';
  if (score <= 3.5) return 'Adequado';
  return 'Bom';
}

/**
 * Retorna classes CSS de cor para o indicador de nível, de acordo com o score.
 */
function scoreLevelColor(score: number): string {
  if (score <= 0.5) return 'bg-slate-300';
  if (score <= 1.5) return 'bg-rose-500';
  if (score <= 2.5) return 'bg-amber-500';
  if (score <= 3.5) return 'bg-emerald-400';
  return 'bg-emerald-500';
}

/* ------------------------------------------------------------------ */
/*  Componente                                                         */
/* ------------------------------------------------------------------ */

type DimensionCardsProps = {
  /** Scores por dimensão (ex: { saude: 2.3, social: 3.1, ... }) */
  scores: Partial<Record<Dimension, number>>;
};

/**
 * Cartões de dimensão read-only para a visão intersetorial do caso.
 *
 * REGRA LGPD fixa do sistema:
 * Dimensão `psiquico` (sensitivity = 'abstracted') exibe "Requer atenção"
 * em vez do score numérico quando o nível é >= 3 (alto), resguardando
 * sigilo técnico do CAPS/esfera de Saúde.
 */
export function DimensionCards({ scores }: DimensionCardsProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
      {DIMENSIONS.map((dim) => {
        const score = scores[dim] ?? 0;
        const Icon = DIMENSION_ICONS[dim];
        const colors = DIMENSION_COLORS[dim];
        const isAbstracted = isAbstractedDimension(dim);

        // Regra fixa: dimensão abstracted com score alto → oculta numérico
        const showAbstractedWarning = isAbstracted && score >= 3;

        return (
          <div
            key={dim}
            id={`dimension-card-${dim}`}
            className={`
              group relative overflow-hidden rounded-2xl border
              ${colors.border}
              bg-gradient-to-br ${colors.from} ${colors.to}
              p-5 transition-all duration-300
              hover:shadow-md hover:scale-[1.02]
            `}
          >
            {/* Ícone */}
            <div className={`mb-3 inline-flex rounded-xl p-2.5 ${colors.iconBg}`}>
              <Icon size={18} className={colors.text} />
            </div>

            {/* Label */}
            <p className="mb-1 text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground/70">
              {DIMENSION_LABELS[dim]}
            </p>

            {/* Score / Abstracted */}
            {showAbstractedWarning ? (
              <p className={`text-sm font-bold ${colors.text}`}>
                Requer atenção
              </p>
            ) : (
              <div className="flex items-end gap-2">
                <span className={`text-2xl font-black tabular-nums ${colors.text}`}>
                  {score > 0 ? score.toFixed(1) : '—'}
                </span>
                <span className="mb-0.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">
                  / 4.0
                </span>
              </div>
            )}

            {/* Indicador de nível */}
            <div className="mt-3 flex items-center gap-2">
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-200/60">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${scoreLevelColor(score)}`}
                  style={{ width: `${Math.min((score / 4) * 100, 100)}%` }}
                />
              </div>
              <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground/50">
                {showAbstractedWarning ? 'Abstraído' : scoreLevelLabel(score)}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
