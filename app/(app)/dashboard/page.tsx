import Link from 'next/link';
import { redirect } from 'next/navigation';
import { and, count, desc, eq, gte, isNull, isNotNull } from 'drizzle-orm';
import { getActiveTenantContext } from '@/lib/auth/get-tenant-context';
import { ForbiddenError } from '@/lib/auth/authorization';
import { getDb } from '@/lib/db/client';
import { patients, clinicalRecords, tenantMembers } from '@/lib/db/schema';
import { RECORD_TYPE_LABELS } from '@/modules/records/record.dto';
import { PatientMap } from '@/components/maps/patient-map';
import { Users, FileText, Shield, ArrowRight, Activity, Plus } from 'lucide-react';

export const metadata = { title: 'Dashboard | CAPS' };

function StatCard({ label, value, icon: Icon, color }: { label: string; value: number; icon: any; color: string }) {
  return (
    <div className="relative overflow-hidden rounded-3xl border border-border bg-card p-8 shadow-diffusion transition-all hover:scale-[1.02]">
      <div className={`absolute -right-8 -top-8 h-24 w-24 rounded-full opacity-5 blur-2xl ${color}`} />
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/40">{label}</p>
          <p className="mt-3 text-4xl font-black italic tracking-tighter text-foreground tabular-nums">{value}</p>
        </div>
        <div className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-secondary/30 ${color.replace('bg-', 'text-')}`}>
          <Icon size={24} />
        </div>
      </div>
    </div>
  );
}

export default async function DashboardPage() {
  const ctx = await getActiveTenantContext();
  console.log('[dashboard] ctx=', ctx ? `tenantId=${ctx.tenantId} role=${ctx.role}` : 'NULL → redirect /login');
  if (!ctx) redirect('/login');

  const db = getDb();
  const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

  let stats, recentRecords, geoPatients;
  try {
    [stats, recentRecords, geoPatients] = await Promise.all([
      Promise.all([
        db.select({ n: count() }).from(patients).where(and(eq(patients.tenantId, ctx.tenantId), eq(patients.status, 'active'))),
        db.select({ n: count() }).from(clinicalRecords).where(and(eq(clinicalRecords.tenantId, ctx.tenantId), gte(clinicalRecords.createdAt, startOfMonth), isNull(clinicalRecords.deletedAt))),
        db.select({ n: count() }).from(tenantMembers).where(eq(tenantMembers.tenantId, ctx.tenantId)),
      ]),
      db
        .select({
          id: clinicalRecords.id,
          patientId: clinicalRecords.patientId,
          type: clinicalRecords.type,
          sessionDate: clinicalRecords.sessionDate,
          status: clinicalRecords.status,
          title: clinicalRecords.title,
          patientName: patients.fullName,
          patientPreferredName: patients.preferredName,
        })
        .from(clinicalRecords)
        .innerJoin(patients, eq(clinicalRecords.patientId, patients.id))
        .where(and(eq(clinicalRecords.tenantId, ctx.tenantId), isNull(clinicalRecords.deletedAt)))
        .orderBy(desc(clinicalRecords.sessionDate), desc(clinicalRecords.createdAt))
        .limit(5),
      db
        .select({
          id: patients.id,
          fullName: patients.fullName,
          lat: patients.lat,
          lon: patients.lon,
          status: patients.status,
        })
        .from(patients)
        .where(and(eq(patients.tenantId, ctx.tenantId), isNotNull(patients.lat), isNotNull(patients.lon))),
    ]);
  } catch (err) {
    if (err instanceof ForbiddenError) redirect('/unauthorized');
    throw err;
  }

  const [totalPatients, recordsThisMonth, teamCount] = stats;

  const mapPatients = geoPatients.map((p) => ({
    id: p.id,
    fullName: p.fullName,
    lat: p.lat!,
    lon: p.lon!,
    status: p.status,
  }));

  return (
    <div className="min-h-full bg-background/50 text-foreground selection:bg-primary/20">
      <div className="mx-auto max-w-6xl space-y-12 p-16 animate-reveal">
        {/* Header Section */}
        <div className="flex flex-col justify-between gap-8 md:flex-row md:items-end">
          <div className="space-y-2">
            <h1 className="text-4xl font-black uppercase italic tracking-tighter text-foreground">
              Dashboard
            </h1>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/40">
              Visão geral operacional e geolocalização
            </p>
          </div>
          
          <Link
            href="/patients/new"
            className="group flex items-center gap-3 rounded-2xl bg-primary px-8 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-primary-foreground shadow-[0_0_30px_rgba(var(--primary),0.2)] transition-all hover:scale-105 active:scale-95"
          >
            <Plus size={16} className="transition-transform group-hover:rotate-90" />
            Novo Paciente / PTS
          </Link>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-6 sm:grid-cols-3">
          <StatCard label="Pacientes ativos" value={Number(totalPatients[0]?.n ?? 0)} icon={Users} color="bg-primary" />
          <StatCard label="Registros este mês" value={Number(recordsThisMonth[0]?.n ?? 0)} icon={FileText} color="bg-emerald-500" />
          <StatCard label="Membros da equipe" value={Number(teamCount[0]?.n ?? 0)} icon={Shield} color="bg-amber-500" />
        </div>

        {/* Map Section */}
        <div className="space-y-6">
          <h2 className="flex items-center gap-3 text-sm font-black uppercase italic tracking-widest text-foreground/80">
            <Activity className="text-primary" size={18} /> Geolocalização de Saúde
          </h2>
          <div className="overflow-hidden rounded-[2rem] border border-border bg-card shadow-diffusion p-2">
            <PatientMap patients={mapPatients} />
          </div>
        </div>

        {/* Recent Activity */}
        <div className="space-y-6">
          <h2 className="flex items-center gap-3 text-sm font-black uppercase italic tracking-widest text-foreground/80">
            <ArrowRight className="text-primary" size={18} /> Atividade recente
          </h2>
          
          <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-diffusion backdrop-blur-xl">
            {recentRecords.length === 0 ? (
              <div className="p-12 text-center">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/30">Nenhum registro clínico ainda.</p>
              </div>
            ) : (
              <div className="divide-y divide-border/30">
                {recentRecords.map((r) => {
                  const name = r.patientPreferredName ?? r.patientName;
                  const date = new Date(r.sessionDate + 'T00:00:00').toLocaleDateString('pt-BR');
                  return (
                    <Link
                      key={r.id}
                      href={`/patients/${r.patientId}/records/${r.id}`}
                      className="group flex items-center justify-between px-10 py-8 transition-all duration-300 hover:bg-primary/[0.02]"
                    >
                      <div className="space-y-1">
                        <p className="text-sm font-bold tracking-tight text-foreground/90 group-hover:text-primary transition-colors">{name}</p>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40">
                          {RECORD_TYPE_LABELS[r.type]} · {date}
                        </p>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className={`rounded-full px-4 py-1.5 text-[9px] font-black uppercase tracking-widest ${r.status === 'finalized' ? 'bg-secondary/30 text-muted-foreground/60' : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'}`}>
                          {r.status === 'finalized' ? 'Finalizado' : 'Rascunho'}
                        </span>
                        <ArrowRight size={14} className="text-muted-foreground/20 transition-transform group-hover:translate-x-1 group-hover:text-primary" />
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
