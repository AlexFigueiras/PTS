'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import { Inbox, Users, AlertCircle, Clock } from 'lucide-react';
import { SignalInbox } from '@/components/pts/signal-inbox';
import type { SignalStatus, SignalPriority } from '@pts/domain';

// ─── Types ──────────────────────────────────────────────────────────────────

export type ManagerInboxSignal = {
  id: string;
  caseId: string;
  patientId: string | null;
  status: SignalStatus;
  priority: SignalPriority;
  needTypeId: string | null;
  abstractReason: string;
  createdAt: Date | string;
};

export type StaffLoad = {
  name: string;
  activeCases: number;
  assignedActions: number;
};

export type ManagerDashboardData = {
  pendingSignals: number;
  patientsInObservation: number;
  staffCount: number;
  staffLoad: StaffLoad[];
  inboxSignals: ManagerInboxSignal[];
};

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

function StaffLoadChart({ data }: { data: StaffLoad[] }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-diffusion">
      <div className="mb-4 flex items-center gap-2">
        <span className="rounded-lg bg-primary/10 p-2">
          <Users size={16} className="text-primary" />
        </span>
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">
          Carga de Trabalho da Equipe
        </p>
      </div>
      {data.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">Nenhum profissional vinculado à unidade.</p>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={data} barSize={16} barGap={4}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis hide />
            <Tooltip
              cursor={{ fill: 'hsl(var(--muted)/0.3)' }}
              contentStyle={{
                background: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: 8,
                fontSize: 12,
              }}
            />
            <Bar dataKey="activeCases" name="Casos Ativos" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            <Bar dataKey="assignedActions" name="Ações Atribuídas" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
      {data.length > 0 && (
        <div className="mt-3 flex gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-primary" /> Casos Ativos
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-violet-500" /> Ações Atribuídas
          </span>
        </div>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function ManagerDashboard({ data, firstName }: { data: ManagerDashboardData; firstName: string }) {
  return (
    <div className="space-y-8 animate-reveal">
      {/* Header */}
      <div>
        <h2 className="text-4xl font-semibold tracking-tight text-foreground">
          Olá, {firstName}!
        </h2>
        <p className="mt-1 text-muted-foreground">
          Gestão da triagem e capacidade da sua unidade.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiCard
          icon={Inbox}
          label="Sinalizações Pendentes"
          value={data.pendingSignals}
          sub="Aguardando ação da unidade"
          accent="#ef4444"
          alert={data.pendingSignals > 0}
        />
        <KpiCard
          icon={AlertCircle}
          label="Em Observação"
          value={data.patientsInObservation}
          sub="Cidadãos sem RT vinculado"
          accent="#f59e0b"
        />
        <KpiCard
          icon={Users}
          label="Profissionais na Unidade"
          value={data.staffCount}
          sub="Equipe ativa"
          accent="#22c55e"
        />
      </div>

      {/* Main Row: SignalInbox + StaffLoad */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Inbox em destaque */}
        <div>
          <SignalInbox signals={data.inboxSignals as any} />
        </div>
        {/* Carga de equipe */}
        <div>
          <StaffLoadChart data={data.staffLoad} />
        </div>
      </div>

      {/* Empty state tip */}
      {data.pendingSignals === 0 && data.patientsInObservation === 0 && (
        <div className="flex items-center gap-2 rounded-xl border border-green-500/20 bg-green-500/5 px-4 py-3">
          <Clock size={14} className="text-green-500" />
          <p className="text-xs text-muted-foreground">
            Nenhuma sinalização pendente. Sua unidade está em dia. ✓
          </p>
        </div>
      )}
    </div>
  );
}
