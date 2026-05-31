'use client';

import {
  DIMENSIONS,
  DIMENSION_LABELS,
  type Dimension,
} from '@pts/domain';
import {
  Heart, Users, Brain, Scale, GraduationCap, Shield, TrendingUp, TrendingDown,
} from 'lucide-react';

type DimensionPayload = {
  estado: string;
  fragilidades: string[];
  potencialidades: string[];
  risco: 'baixo' | 'medio' | 'alto' | 'critico';
  observacoes?: string;
};

type DerivedDimension = {
  dimension: Dimension;
  payload: DimensionPayload | null;
  sensitivity: string;
  derivedAt: string | null;
};

type Props = {
  dimensions: DerivedDimension[];
};

const DIMENSION_ICONS: Record<Dimension, React.ElementType> = {
  saude: Heart,
  social: Users,
  psiquico: Brain,
  juridico: Scale,
  educacao: GraduationCap,
};

const DIMENSION_COLORS: Record<Dimension, { from: string; to: string; text: string; border: string; iconBg: string }> = {
  saude: { from: 'from-rose-500/10', to: 'to-rose-500/5', text: 'text-rose-600', border: 'border-rose-500/20', iconBg: 'bg-rose-500/15' },
  social: { from: 'from-amber-500/10', to: 'to-amber-500/5', text: 'text-amber-600', border: 'border-amber-500/20', iconBg: 'bg-amber-500/15' },
  psiquico: { from: 'from-violet-500/10', to: 'to-violet-500/5', text: 'text-violet-600', border: 'border-violet-500/20', iconBg: 'bg-violet-500/15' },
  juridico: { from: 'from-sky-500/10', to: 'to-sky-500/5', text: 'text-sky-600', border: 'border-sky-500/20', iconBg: 'bg-sky-500/15' },
  educacao: { from: 'from-emerald-500/10', to: 'to-emerald-500/5', text: 'text-emerald-600', border: 'border-emerald-500/20', iconBg: 'bg-emerald-500/15' },
};

const RISK_COLORS: Record<string, string> = {
  baixo: 'bg-emerald-500/10 text-emerald-700',
  medio: 'bg-amber-500/10 text-amber-700',
  alto: 'bg-orange-500/10 text-orange-700',
  critico: 'bg-rose-500/10 text-rose-700',
};

const RISK_LABELS: Record<string, string> = {
  baixo: 'Baixo', medio: 'Atenção', alto: 'Alto', critico: 'Crítico',
};

export function DerivedDimensionCards({ dimensions }: Props) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
      {DIMENSIONS.map((dim) => {
        const data = dimensions.find((d) => d.dimension === dim);
        const Icon = DIMENSION_ICONS[dim];
        const colors = DIMENSION_COLORS[dim];
        const isAbstracted = data?.sensitivity === 'abstracted';
        const payload = data?.payload;

        return (
          <div
            key={dim}
            className={`group relative overflow-hidden rounded-2xl border ${colors.border} bg-gradient-to-br ${colors.from} ${colors.to} p-5 transition-all duration-300 hover:shadow-md hover:scale-[1.02]`}
          >
            <div className={`mb-3 inline-flex rounded-xl p-2.5 ${colors.iconBg}`}>
              <Icon size={18} className={colors.text} />
            </div>

            <div className="mb-1 flex items-center justify-between gap-2">
              <p className="text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground/70">
                {DIMENSION_LABELS[dim]}
              </p>
              {isAbstracted && (
                <span title="Dimensão abstraída — sigilo LGPD">
                  <Shield size={10} className="text-muted-foreground/40" />
                </span>
              )}
            </div>

            {payload ? (
              <>
                <p className="text-xs text-foreground leading-snug line-clamp-3 mb-2">
                  {payload.estado}
                </p>

                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-bold uppercase ${RISK_COLORS[payload.risco]}`}>
                  {RISK_LABELS[payload.risco]}
                </span>

                {payload.fragilidades.length > 0 && (
                  <div className="mt-2 flex items-center gap-1">
                    <TrendingDown size={9} className="text-rose-500" />
                    <p className="text-[9px] text-muted-foreground/60 line-clamp-1">
                      {payload.fragilidades[0]}
                    </p>
                  </div>
                )}
                {payload.potencialidades.length > 0 && (
                  <div className="mt-1 flex items-center gap-1">
                    <TrendingUp size={9} className="text-emerald-500" />
                    <p className="text-[9px] text-muted-foreground/60 line-clamp-1">
                      {payload.potencialidades[0]}
                    </p>
                  </div>
                )}
              </>
            ) : (
              <p className="text-[10px] text-muted-foreground/40">Sem derivação</p>
            )}
          </div>
        );
      })}
    </div>
  );
}
