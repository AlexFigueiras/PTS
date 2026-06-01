'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  HeartPulse, Home, Brain, Scale, GraduationCap, Heart, Users,
  Activity, Radio, Zap, AlertTriangle, CheckCircle2, RefreshCw,
  ArrowRight, Shield,
} from 'lucide-react';
import { runIngestAction } from '@/modules/pts/actions/ingest.action';
import type { Dimension } from '@pts/domain';

function formatDate(dateStr: string | null) {
  if (!dateStr) return '';
  const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    const [_, year, month, day] = match;
    return `${day}/${month}/${year}`;
  }
  return dateStr;
}

type DimensionData = {
  dimension: Dimension;
  label: string;
  payload: {
    estado: string;
    fragilidades: string[];
    potencialidades: string[];
    risco: 'baixo' | 'medio' | 'alto' | 'critico';
    observacoes?: string;
  } | null;
  sensitivity: string;
  derivedAt: string | null;
};

type SignalData = {
  id: string;
  needTypeId: string;
  status: string;
  priority: string;
  destinationComponent: string;
  createdAt: string;
};

type Props = {
  patientId: string;
  patient: { id: string; fullName: string };
  caseId: string | null;
  caseStatus: string | null;
  healthRecords: { id: string; unitLabel: string; rawText: string; recordedAt: string }[];
  socialRecords: { id: string; unitLabel: string; rawText: string; recordedAt: string }[];
  dimensions: DimensionData[];
  signals: SignalData[];
};

const DIMENSION_ICONS: Record<Dimension, React.ElementType> = {
  saude: Heart,
  social: Users,
  psiquico: Brain,
  juridico: Scale,
  educacao: GraduationCap,
};

const DIMENSION_COLORS: Record<Dimension, { border: string; bg: string; text: string; iconBg: string }> = {
  saude: { border: 'border-rose-500/20', bg: 'from-rose-500/5', text: 'text-rose-600', iconBg: 'bg-rose-500/15' },
  social: { border: 'border-amber-500/20', bg: 'from-amber-500/5', text: 'text-amber-600', iconBg: 'bg-amber-500/15' },
  psiquico: { border: 'border-violet-500/20', bg: 'from-violet-500/5', text: 'text-violet-600', iconBg: 'bg-violet-500/15' },
  juridico: { border: 'border-sky-500/20', bg: 'from-sky-500/5', text: 'text-sky-600', iconBg: 'bg-sky-500/15' },
  educacao: { border: 'border-emerald-500/20', bg: 'from-emerald-500/5', text: 'text-emerald-600', iconBg: 'bg-emerald-500/15' },
};

const RISK_COLORS: Record<string, string> = {
  baixo: 'bg-emerald-500/10 text-emerald-700',
  medio: 'bg-amber-500/10 text-amber-700',
  alto: 'bg-orange-500/10 text-orange-700',
  critico: 'bg-rose-500/10 text-rose-700',
};

const RISK_LABELS: Record<string, string> = {
  baixo: 'Baixo',
  medio: 'Atenção',
  alto: 'Alto',
  critico: 'Crítico',
};

const STATUS_LABELS: Record<string, string> = {
  sugerida: 'Sugerida',
  confirmada_pelo_autor: 'Confirmada',
  aguardando_validacao_rt: 'Aguardando RT',
  encaminhada: 'Encaminhada',
  recebida: 'Recebida',
  em_tratamento: 'Em tratamento',
  resolvida: 'Resolvida',
  descartada: 'Descartada',
};

export function DemoPanelSplit({
  patientId, patient, caseId, caseStatus,
  healthRecords, socialRecords, dimensions, signals,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [ingestResult, setIngestResult] = useState<{ ok: boolean; signalsCreated?: number; triggered?: boolean; error?: string } | null>(null);

  function triggerIngest() {
    if (!caseId) return;
    startTransition(async () => {
      const result = await runIngestAction(patientId, caseId);
      setIngestResult(result);
      if (result.ok) router.refresh();
    });
  }

  return (
    <div className="min-h-full bg-background/50">
      {/* Demo Header */}
      <div className="border-b border-border bg-card/60 backdrop-blur-md">
        <div className="mx-auto max-w-7xl px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-primary/10 p-2">
                <Zap size={18} className="text-primary" />
              </div>
              <div>
                <h1 className="text-sm font-black uppercase italic tracking-tight text-foreground">Demo — Split Antes/Depois</h1>
                <p className="text-xs text-muted-foreground">{patient.fullName} · Caso: {caseStatus ?? 'sem caso'}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {ingestResult && (
                <div className={`flex items-center gap-2 rounded-xl px-3 py-1.5 text-xs font-bold ${ingestResult.ok ? 'bg-emerald-500/10 text-emerald-700' : 'bg-rose-500/10 text-rose-700'}`}>
                  {ingestResult.ok ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />}
                  {ingestResult.ok
                    ? `${ingestResult.signalsCreated} sinalização(ões) criada(s)${ingestResult.triggered ? ' · Gatilho disparado!' : ''}`
                    : ingestResult.error}
                </div>
              )}

              <button
                onClick={triggerIngest}
                disabled={isPending || !caseId}
                className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-[10px] font-black uppercase tracking-widest text-primary-foreground transition hover:bg-primary/90 active:scale-95 disabled:opacity-50"
              >
                <RefreshCw size={12} className={isPending ? 'animate-spin' : ''} />
                {isPending ? 'Processando...' : 'Recalcular com IA'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Split Layout */}
      <div className="mx-auto max-w-7xl p-6 md:p-8">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* LADO ESQUERDO — Fontes */}
          <div className="space-y-6">
            <div className="flex items-center gap-2">
              <div className="h-px flex-1 bg-border" />
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground/50">Fontes de Origem</span>
              <div className="h-px flex-1 bg-border" />
            </div>

            {/* Registros Saúde */}
            <div>
              <div className="mb-3 flex items-center gap-2">
                <HeartPulse size={14} className="text-rose-600" />
                <span className="text-[10px] font-black uppercase tracking-widest text-rose-600">Saúde</span>
              </div>
              <div className="space-y-3">
                {healthRecords.map((r) => (
                  <div key={r.id} className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-4">
                    <p className="mb-1 text-[10px] font-bold text-rose-600">{r.unitLabel}</p>
                    <p className="text-xs text-muted-foreground leading-relaxed line-clamp-4">{r.rawText}</p>
                    <p className="mt-2 text-[10px] text-muted-foreground/50" suppressHydrationWarning>{formatDate(r.recordedAt)}</p>
                  </div>
                ))}
                {healthRecords.length === 0 && (
                  <p className="text-xs text-muted-foreground">Sem registros de saúde.</p>
                )}
              </div>
            </div>

            {/* Registros Social */}
            <div>
              <div className="mb-3 flex items-center gap-2">
                <Home size={14} className="text-amber-600" />
                <span className="text-[10px] font-black uppercase tracking-widest text-amber-600">Assistência Social</span>
              </div>
              <div className="space-y-3">
                {socialRecords.map((r) => (
                  <div key={r.id} className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
                    <p className="mb-1 text-[10px] font-bold text-amber-600">{r.unitLabel}</p>
                    <p className="text-xs text-muted-foreground leading-relaxed line-clamp-4">{r.rawText}</p>
                    <p className="mt-2 text-[10px] text-muted-foreground/50" suppressHydrationWarning>{formatDate(r.recordedAt)}</p>
                  </div>
                ))}
                {socialRecords.length === 0 && (
                  <p className="text-xs text-muted-foreground">Sem registros sociais.</p>
                )}
              </div>
            </div>
          </div>

          {/* SETA CENTRAL */}
          <div className="hidden items-center justify-center lg:absolute lg:left-1/2 lg:flex lg:-translate-x-1/2 lg:top-32">
            <ArrowRight size={20} className="text-muted-foreground/30" />
          </div>

          {/* LADO DIREITO — PTS reagindo */}
          <div className="space-y-6">
            <div className="flex items-center gap-2">
              <div className="h-px flex-1 bg-border" />
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground/50">PTS Respondendo</span>
              <div className="h-px flex-1 bg-border" />
            </div>

            {/* Dimensões derivadas */}
            <div>
              <div className="mb-3 flex items-center gap-2">
                <Activity size={14} className="text-primary" />
                <span className="text-[10px] font-black uppercase tracking-widest text-primary">Dimensões Derivadas</span>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {dimensions.map(({ dimension, label, payload, sensitivity, derivedAt }) => {
                  const Icon = DIMENSION_ICONS[dimension];
                  const colors = DIMENSION_COLORS[dimension];
                  const isAbstracted = sensitivity === 'abstracted';

                  return (
                    <div
                      key={dimension}
                      className={`rounded-xl border ${colors.border} bg-gradient-to-br ${colors.bg} to-transparent p-4`}
                    >
                      <div className="mb-2 flex items-center gap-2">
                        <div className={`rounded-lg p-1.5 ${colors.iconBg}`}>
                          <Icon size={12} className={colors.text} />
                        </div>
                        <span className={`text-[10px] font-black uppercase tracking-widest ${colors.text}`}>
                          {label}
                        </span>
                        {isAbstracted && (
                          <span className="ml-auto flex items-center gap-1 text-[9px] text-muted-foreground/50">
                            <Shield size={9} /> Abstraído
                          </span>
                        )}
                      </div>

                      {payload ? (
                        <>
                          <p className="text-xs text-foreground leading-snug line-clamp-3">
                            {payload.estado}
                          </p>
                          <div className="mt-2 flex items-center gap-2">
                            <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase ${RISK_COLORS[payload.risco]}`}>
                              {RISK_LABELS[payload.risco]}
                            </span>
                            {derivedAt && (
                              <span className="text-[9px] text-muted-foreground/50" suppressHydrationWarning>{formatDate(derivedAt)}</span>
                            )}
                          </div>
                        </>
                      ) : (
                        <p className="text-xs text-muted-foreground/50">Não derivado ainda.</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Sinalizações cruzadas */}
            <div>
              <div className="mb-3 flex items-center gap-2">
                <Radio size={14} className="text-primary" />
                <span className="text-[10px] font-black uppercase tracking-widest text-primary">
                  Sinalizações Cruzadas
                </span>
                {signals.length > 0 && (
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[9px] font-black text-primary">
                    {signals.length}
                  </span>
                )}
              </div>

              {signals.length === 0 ? (
                <p className="text-xs text-muted-foreground/50">
                  Nenhuma sinalização criada. Clique em &quot;Recalcular com IA&quot; após editar um fator.
                </p>
              ) : (
                <div className="space-y-2">
                  {signals.slice(0, 5).map((signal) => (
                    <div
                      key={signal.id}
                      className="flex items-center justify-between rounded-xl border border-border bg-card/50 px-4 py-3"
                    >
                      <div>
                        <p className="text-xs font-bold text-foreground">{signal.destinationComponent}</p>
                        <p className="text-[10px] text-muted-foreground">{signal.needTypeId}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] font-bold uppercase text-muted-foreground/50">
                          {signal.priority}
                        </span>
                        <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold ${signal.status === 'sugerida' ? 'bg-amber-500/10 text-amber-700' : 'bg-emerald-500/10 text-emerald-700'}`}>
                          {STATUS_LABELS[signal.status] ?? signal.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
