import { SalaryChart } from './components/salary-chart';
import { DutyHourChart } from './components/duty-hour-chart';
import { GenderChart } from './components/gender-chart';
import { UpcomingAppointments } from './components/upcoming-appointments';
import { ProfileCard } from './components/profile-card';
import { PatientFiles } from './components/patient-files';
import { LayoutGrid, List } from 'lucide-react';
import { getAuthUser } from '@/lib/auth/get-user';
import { getDb, withTransactionContext } from '@/lib/db/client';
import { getActiveTenantContext } from '@/lib/auth/get-tenant-context';
import { profiles, ptsSignals, ptsCases } from '@/lib/db/schema';
import { and, eq, inArray, desc } from 'drizzle-orm';
import { SignalInbox } from '@/components/pts/signal-inbox';

export const metadata = { title: 'Dashboard | MentalGest' };

export default async function DashboardPage() {
  const user = await getAuthUser();
  const ctx = await getActiveTenantContext();
  
  const profile = user && ctx
    ? await withTransactionContext(ctx.userId, ctx.tenantId, async (tx) => {
        return await tx
          .select()
          .from(profiles)
          .where(eq(profiles.id, user.id))
          .limit(1)
          .then((r: any[]) => r[0]);
      })
    : null;

  const firstName = profile?.fullName?.split(' ')[0] ?? 'Profissional';

  // Caixa de entrada de sinalizações direcionadas à unidade ativa (Fase 2)
  const inboxSignals = ctx?.activeUnitId
    ? await withTransactionContext(ctx.userId, ctx.tenantId, async (tx) => {
        return await tx
          .select({
            id: ptsSignals.id,
            caseId: ptsSignals.caseId,
            patientId: ptsCases.patientId,
            status: ptsSignals.status,
            priority: ptsSignals.priority,
            needTypeId: ptsSignals.needTypeId,
            abstractReason: ptsSignals.abstractReason,
            createdAt: ptsSignals.createdAt,
          })
          .from(ptsSignals)
          .innerJoin(ptsCases, eq(ptsCases.id, ptsSignals.caseId))
          .where(
            and(
              eq(ptsSignals.tenantId, ctx.tenantId),
              eq(ptsSignals.destinationUnitId, ctx.activeUnitId!),
              inArray(ptsSignals.status, ['encaminhada', 'recebida', 'em_tratamento']),
            ),
          )
          .orderBy(desc(ptsSignals.createdAt));
      })
    : [];

  return (
    <div className="min-h-full bg-background p-12 animate-reveal">
      <div className="mx-auto max-w-[1400px] space-y-12">
        {/* Top Header */}
        <div className="flex flex-col items-center justify-center py-6">
           <h1 className="text-6xl font-medium tracking-tight text-primary">Painel de Controle</h1>
        </div>

        {/* Content Header */}
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <h2 className="text-4xl font-semibold tracking-tight text-foreground">Olá, {firstName}!</h2>
            <p className="max-w-md text-lg leading-relaxed text-muted-foreground/80">
              Bem-vindo(a) {firstName} à nossa plataforma.<br />
              Vamos ajudar os pacientes a viver uma vida mais saudável e feliz.
            </p>
          </div>
          
          <div className="flex gap-2 rounded-2xl bg-card p-2.5 shadow-diffusion premium-bevel">
            <button className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:scale-105 active:scale-95">
              <LayoutGrid size={22} />
            </button>
            <button className="flex h-11 w-11 items-center justify-center rounded-xl text-muted-foreground/30 transition-all hover:bg-secondary hover:text-foreground active:scale-95">
              <List size={22} />
            </button>
          </div>
        </div>

        {/* Dashboard Grid */}
        <div className="grid grid-cols-12 gap-10">
          {/* Coluna Esquerda */}
          <div className="col-span-12 xl:col-span-5 space-y-10">
            <SalaryChart />
            <DutyHourChart />
          </div>

          {/* Coluna Central */}
          <div className="col-span-12 xl:col-span-4 space-y-10">
            <GenderChart />
            <UpcomingAppointments />
          </div>

          {/* Coluna Direita */}
          <div className="col-span-12 xl:col-span-3 space-y-10">
            <SignalInbox signals={inboxSignals as any} />
            <ProfileCard fullName={profile?.fullName} />
            <PatientFiles />
          </div>
        </div>
      </div>
    </div>
  );
}
