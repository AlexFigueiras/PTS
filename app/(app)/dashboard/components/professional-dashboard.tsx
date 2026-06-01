'use client';

import Link from 'next/link';
import { CheckCircle2, AlertTriangle, FolderOpen, Calendar, ArrowUpRight, Clock, Zap } from 'lucide-react';

// ─── Types ──────────────────────────────────────────────────────────────────

export type AssignedAction = {
  id: string;
  description: string;
  status: string;
  deadline: Date | string;
  patientName: string;
  patientId: string;
  caseId: string;
  isBlocked: boolean;
};

export type MyCaseCard = {
  patientId: string;
  patientName: string;
  caseId: string;
  caseStatus: string;
  lastUpdateAt: Date | string;
};

export type FeedEvent = {
  id: string;
  type: 'signal' | 'action' | 'evolution';
  description: string;
  patientName: string;
  patientId: string;
  caseId: string;
  occurredAt: Date | string;
};

export type ProfessionalDashboardData = {
  myCasesCount: number;
  actionsToday: number;
  blockedActions: number;
  assignedActions: AssignedAction[];
  myCases: MyCaseCard[];
  feed: FeedEvent[];
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

const CASE_STATUS_LABELS: Record<string, string> = {
  radar: 'Radar',
  observacao: 'Observação',
  acompanhamento: 'Acompanhamento',
  pts_ativo: 'PTS Ativo',
  pia_ativo: 'PIA Ativo',
  alta: 'Alta',
  evasao: 'Evasão',
};

const CASE_STATUS_COLORS: Record<string, string> = {
  radar: '#6b7280',
  observacao: '#f59e0b',
  acompanhamento: '#3b82f6',
  pts_ativo: '#8b5cf6',
  pia_ativo: '#ec4899',
  alta: '#22c55e',
  evasao: '#ef4444',
};

function safeFormat(date: Date | string) {
  try {
    const d = typeof date === 'string' ? new Date(date) : date;
    return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' }).format(d);
  } catch {
    return '—';
  }
}

function safeRelative(date: Date | string) {
  try {
    const d = typeof date === 'string' ? new Date(date) : date;
    const diffMs = Date.now() - d.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return 'agora mesmo';
    if (diffMin < 60) return `há ${diffMin} min`;
    const diffHrs = Math.floor(diffMin / 60);
    if (diffHrs < 24) return `há ${diffHrs}h`;
    const diffDays = Math.floor(diffHrs / 24);
    if (diffDays < 30) return `há ${diffDays} dia${diffDays > 1 ? 's' : ''}`;
    return safeFormat(d);
  } catch {
    return '';
  }
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function KpiCard({
  icon: Icon,
  label,
  value,
  sub,
  accent,
  alert,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  sub?: string;
  accent: string;
  alert?: boolean;
}) {
  return (
    <div
      className={`relative overflow-hidden rounded-2xl border bg-card p-6 shadow-diffusion ${alert ? 'border-rose-500/40' : 'border-border'}`}
      style={{ borderLeft: `3px solid ${accent}` }}
    >
      <div className="mb-3 flex items-center gap-2">
        <span className="rounded-lg p-2" style={{ background: `${accent}20` }}>
          <Icon size={16} style={{ color: accent }} />
        </span>
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">{label}</p>
      </div>
      <p className={`text-3xl font-bold tracking-tight ${alert ? 'text-rose-500' : 'text-foreground'}`}>{value}</p>
      {sub && <p className="mt-1 text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}

function ActionList({ actions }: { actions: AssignedAction[] }) {
  if (actions.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-muted/10 p-8 text-center">
        <CheckCircle2 size={24} className="mx-auto mb-2 text-green-500" />
        <p className="text-sm font-semibold text-foreground">Sem ações pendentes!</p>
        <p className="text-xs text-muted-foreground">Você está em dia com todos os seus pacientes.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {actions.map((action) => {
        const isBlocked = action.isBlocked;
        const isOverdue = new Date(action.deadline) < new Date();
        return (
          <div
            key={action.id}
            className={`flex items-start gap-3 rounded-xl border p-4 transition-colors ${
              isBlocked
                ? 'border-rose-500/30 bg-rose-500/5'
                : isOverdue
                  ? 'border-amber-500/30 bg-amber-500/5'
                  : 'border-border bg-card hover:bg-muted/30'
            }`}
          >
            <div className="mt-0.5 shrink-0">
              {isBlocked ? (
                <AlertTriangle size={14} className="text-rose-500" />
              ) : isOverdue ? (
                <Clock size={14} className="text-amber-500" />
              ) : (
                <CheckCircle2 size={14} className="text-primary/40" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-foreground">{action.description}</p>
              <p className="text-xs text-muted-foreground">
                {action.patientName} ·{' '}
                <span className={isOverdue ? 'text-amber-500 font-semibold' : ''}>
                  Prazo: {safeFormat(action.deadline)}
                </span>
              </p>
            </div>
            <Link
              href={`/patients/${action.patientId}/caso`}
              className="shrink-0 rounded-lg p-1.5 text-muted-foreground/40 hover:bg-muted hover:text-primary transition-colors"
            >
              <ArrowUpRight size={14} />
            </Link>
          </div>
        );
      })}
    </div>
  );
}

function CaseGrid({ cases }: { cases: MyCaseCard[] }) {
  if (cases.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-border bg-muted/10 p-6 text-center text-sm text-muted-foreground">
        Nenhum caso sob sua referência técnica.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {cases.map((c) => {
        const color = CASE_STATUS_COLORS[c.caseStatus] ?? '#6b7280';
        const label = CASE_STATUS_LABELS[c.caseStatus] ?? c.caseStatus;
        return (
          <Link
            key={c.patientId}
            href={`/patients/${c.patientId}/caso`}
            className="group flex items-center gap-3 rounded-xl border border-border bg-card p-4 transition-all hover:border-primary/30 hover:shadow-md"
          >
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[10px] font-black text-white"
              style={{ background: color }}
            >
              {c.patientName.split(' ').slice(0, 2).map((n) => n[0]).join('')}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                {c.patientName}
              </p>
              <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color }}>
                {label}
              </p>
            </div>
            <ArrowUpRight size={14} className="shrink-0 text-muted-foreground/30 group-hover:text-primary transition-colors" />
          </Link>
        );
      })}
    </div>
  );
}

function EventFeed({ feed }: { feed: FeedEvent[] }) {
  if (feed.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-border bg-muted/10 p-6 text-center text-sm text-muted-foreground">
        Nenhuma atualização recente.
      </p>
    );
  }

  const ICON_MAP = {
    signal: Zap,
    action: CheckCircle2,
    evolution: FolderOpen,
  };

  const COLOR_MAP = {
    signal: '#ef4444',
    action: '#22c55e',
    evolution: '#8b5cf6',
  };

  return (
    <div className="space-y-3">
      {feed.map((event) => {
        const Icon = ICON_MAP[event.type];
        const color = COLOR_MAP[event.type];
        return (
          <div key={event.id} className="flex gap-3">
            <div className="relative flex flex-col items-center">
              <div
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full"
                style={{ background: `${color}20` }}
              >
                <Icon size={12} style={{ color }} />
              </div>
              <div className="mt-1 flex-1 border-l border-dashed border-border" />
            </div>
            <div className="pb-4">
              <p className="text-xs font-semibold text-foreground">{event.description}</p>
              <p className="text-[10px] text-muted-foreground">
                {event.patientName} · {safeRelative(event.occurredAt)}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function ProfessionalDashboard({ data, firstName }: { data: ProfessionalDashboardData; firstName: string }) {
  return (
    <div className="space-y-8 animate-reveal">
      {/* Header */}
      <div>
        <h2 className="text-4xl font-semibold tracking-tight text-foreground">
          Olá, {firstName}!
        </h2>
        <p className="mt-1 text-muted-foreground">
          Sua agenda de cuidado para hoje.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiCard
          icon={FolderOpen}
          label="Meus Casos (RT)"
          value={data.myCasesCount}
          sub="Sob minha referência técnica"
          accent="#8b5cf6"
        />
        <KpiCard
          icon={Calendar}
          label="Ações Pendentes"
          value={data.actionsToday}
          sub="Atribuídas a mim"
          accent="#3b82f6"
        />
        <KpiCard
          icon={AlertTriangle}
          label="Ações Bloqueadas"
          value={data.blockedActions}
          sub="Precisam de atenção imediata"
          accent="#ef4444"
          alert={data.blockedActions > 0}
        />
      </div>

      {/* Main content: 3 columns */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Ações atribuídas — 2 cols */}
        <div className="lg:col-span-2 space-y-4">
          <div className="rounded-2xl border border-border bg-card p-6 shadow-diffusion">
            <div className="mb-4 flex items-center gap-2">
              <span className="rounded-lg bg-primary/10 p-2">
                <Calendar size={16} className="text-primary" />
              </span>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">
                Minhas Ações Atribuídas
              </p>
              {data.blockedActions > 0 && (
                <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-black text-rose-600">
                  {data.blockedActions} bloqueada{data.blockedActions > 1 ? 's' : ''}
                </span>
              )}
            </div>
            <ActionList actions={data.assignedActions} />
          </div>

          {/* Casos do profissional */}
          <div className="rounded-2xl border border-border bg-card p-6 shadow-diffusion">
            <div className="mb-4 flex items-center gap-2">
              <span className="rounded-lg bg-violet-500/10 p-2">
                <FolderOpen size={16} className="text-violet-500" />
              </span>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">
                Meus Casos (Referência Técnica)
              </p>
            </div>
            <CaseGrid cases={data.myCases} />
          </div>
        </div>

        {/* Feed de eventos — 1 col */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-diffusion">
          <div className="mb-4 flex items-center gap-2">
            <span className="rounded-lg bg-green-500/10 p-2">
              <Zap size={16} className="text-green-500" />
            </span>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">
              Atualizações Recentes
            </p>
          </div>
          <EventFeed feed={data.feed} />
        </div>
      </div>
    </div>
  );
}
