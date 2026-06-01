'use client';

import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
} from 'recharts';
import { Users, FolderOpen, TrendingUp, Banknote, Activity } from 'lucide-react';

// ─── Types ──────────────────────────────────────────────────────────────────

export type AdminDashboardData = {
  totalPatients: number;
  activeCases: number;
  resolvedSignals: number;
  estimatedSavings: number; // resolvedSignals * R$ 500
  resolutivityRate: number; // 0–100
  casesBySphere: { sphere: string; label: string; count: number; color: string }[];
  dimensionScores: { dimension: string; score: number }[];
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatBRL(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(value);
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function KpiCard({
  icon: Icon,
  label,
  value,
  sub,
  accent,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  sub?: string;
  accent: string;
}) {
  return (
    <div
      className="relative overflow-hidden rounded-2xl border border-border bg-card p-6 shadow-diffusion"
      style={{ borderLeft: `3px solid ${accent}` }}
    >
      <div className="mb-3 flex items-center gap-2">
        <span className="rounded-lg p-2" style={{ background: `${accent}20` }}>
          <Icon size={16} style={{ color: accent }} />
        </span>
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">{label}</p>
      </div>
      <p className="text-3xl font-bold tracking-tight text-foreground">{value}</p>
      {sub && <p className="mt-1 text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}

function ResolutivityRing({ rate }: { rate: number }) {
  const r = 52;
  const circumference = 2 * Math.PI * r;
  const progress = (rate / 100) * circumference;
  const color = rate >= 70 ? '#22c55e' : rate >= 40 ? '#f59e0b' : '#ef4444';

  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-diffusion">
      <p className="mb-4 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">
        Índice de Resolutividade
      </p>
      <div className="flex items-center gap-6">
        <svg width="128" height="128" viewBox="0 0 128 128">
          <circle cx="64" cy="64" r={r} fill="none" stroke="hsl(var(--border))" strokeWidth="10" />
          <circle
            cx="64"
            cy="64"
            r={r}
            fill="none"
            stroke={color}
            strokeWidth="10"
            strokeDasharray={`${progress} ${circumference}`}
            strokeLinecap="round"
            transform="rotate(-90 64 64)"
            style={{ transition: 'stroke-dasharray 1s ease' }}
          />
          <text x="64" y="68" textAnchor="middle" fontSize="22" fontWeight="700" fill={color}>
            {rate}%
          </text>
        </svg>
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-green-500" />
            <span className="text-muted-foreground">≥ 70% Excelente</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-amber-400" />
            <span className="text-muted-foreground">40–69% Regular</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-red-500" />
            <span className="text-muted-foreground">&lt; 40% Crítico</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function DimensionRadar({ data }: { data: { dimension: string; score: number }[] }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-diffusion">
      <p className="mb-4 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">
        Radar Municipal — 5 Dimensões (Média)
      </p>
      {data.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">Sem dados de baseline disponíveis.</p>
      ) : (
        <ResponsiveContainer width="100%" height={260}>
          <RadarChart data={data}>
            <PolarGrid stroke="hsl(var(--border))" />
            <PolarAngleAxis
              dataKey="dimension"
              tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
            />
            <Radar
              name="Município"
              dataKey="score"
              stroke="hsl(var(--primary))"
              fill="hsl(var(--primary))"
              fillOpacity={0.2}
              strokeWidth={2}
            />
          </RadarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

function SphereBar({ data }: { data: { sphere: string; label: string; count: number; color: string }[] }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-diffusion">
      <p className="mb-4 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">
        Casos por Esfera Intersetorial
      </p>
      {data.every((d) => d.count === 0) ? (
        <p className="py-8 text-center text-sm text-muted-foreground">Nenhum caso registrado ainda.</p>
      ) : (
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={data} layout="vertical" barSize={18}>
            <XAxis type="number" hide />
            <YAxis
              type="category"
              dataKey="label"
              width={100}
              tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
            />
            <Tooltip
              cursor={{ fill: 'hsl(var(--muted)/0.3)' }}
              contentStyle={{
                background: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: 8,
                fontSize: 12,
              }}
              formatter={(value) => [`${Number(value)} casos`, '']}
            />
            <Bar dataKey="count" radius={[0, 6, 6, 0]}>
              {data.map((entry) => (
                <Cell key={entry.sphere} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function AdminDashboard({ data, firstName }: { data: AdminDashboardData; firstName: string }) {
  return (
    <div className="space-y-8 animate-reveal">
      {/* Header */}
      <div>
        <h2 className="text-4xl font-semibold tracking-tight text-foreground">
          Olá, {firstName}!
        </h2>
        <p className="mt-1 text-muted-foreground">
          Visão executiva da governança intersetorial do município.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard
          icon={Users}
          label="Cidadãos Cadastrados"
          value={data.totalPatients.toLocaleString('pt-BR')}
          accent="#3b82f6"
        />
        <KpiCard
          icon={FolderOpen}
          label="Casos Ativos"
          value={data.activeCases.toLocaleString('pt-BR')}
          sub="PTS / Acompanhamento / Observação"
          accent="#8b5cf6"
        />
        <KpiCard
          icon={TrendingUp}
          label="Sinalizações Resolvidas"
          value={data.resolvedSignals.toLocaleString('pt-BR')}
          sub="Riscos prevenidos pela rede"
          accent="#22c55e"
        />
        <KpiCard
          icon={Banknote}
          label="Economia Estimada"
          value={formatBRL(data.estimatedSavings)}
          sub="vs. atendimento de emergência"
          accent="#f59e0b"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <ResolutivityRing rate={data.resolutivityRate} />
        </div>
        <div className="lg:col-span-1">
          <DimensionRadar data={data.dimensionScores} />
        </div>
        <div className="lg:col-span-1">
          <SphereBar data={data.casesBySphere} />
        </div>
      </div>

      {/* Footer note */}
      <div className="flex items-center gap-2 rounded-xl border border-border bg-muted/30 px-4 py-3">
        <Activity size={14} className="text-muted-foreground" />
        <p className="text-xs text-muted-foreground">
          Economia estimada calculada com base em{' '}
          <strong className="text-foreground">R$ 500 por sinalização resolvida</strong> antes de virar emergência
          (internação, UPA). Dados atualizados em tempo real.
        </p>
      </div>
    </div>
  );
}
