import { getAuthUser } from '@/lib/auth/get-user';
import { getDb, withTransactionContext } from '@/lib/db/client';
import { getActiveTenantContext } from '@/lib/auth/get-tenant-context';
import {
  profiles,
  ptsSignals,
  ptsCases,
  ptsActions,
  ptsPlans,
  patients,
  serviceUnits,
  professionalsToUnits,
  ptsEvolutions,
} from '@/lib/db/schema';
import { and, eq, inArray, desc, count, avg, sql } from 'drizzle-orm';
import type { AdminDashboardData } from './components/admin-dashboard';
import type { ManagerDashboardData } from './components/manager-dashboard';
import type { ProfessionalDashboardData } from './components/professional-dashboard';
import { AdminDashboard } from './components/admin-dashboard';
import { ManagerDashboard } from './components/manager-dashboard';
import { ProfessionalDashboard } from './components/professional-dashboard';

export const metadata = { title: 'Dashboard | PTS' };

// ─── ADMIN data ───────────────────────────────────────────────────────────────

async function fetchAdminData(
  userId: string,
  tenantId: string,
): Promise<AdminDashboardData> {
  return withTransactionContext(userId, tenantId, async (tx) => {
    // Total de pacientes
    const [{ total: totalPatients }] = await tx
      .select({ total: count() })
      .from(patients)
      .where(eq(patients.tenantId, tenantId));

    // Total de casos ativos
    const activeCaseStatuses = ['observacao', 'acompanhamento', 'pts_ativo', 'pia_ativo'] as const;
    const [{ active: activeCases }] = await tx
      .select({ active: count() })
      .from(ptsCases)
      .where(and(eq(ptsCases.tenantId, tenantId), inArray(ptsCases.status, activeCaseStatuses)));

    // Sinalizações resolvidas
    const [{ resolved: resolvedSignals }] = await tx
      .select({ resolved: count() })
      .from(ptsSignals)
      .where(and(eq(ptsSignals.tenantId, tenantId), eq(ptsSignals.status, 'resolvida')));

    // Índice de resolutividade
    const [{ total: totalSignals }] = await tx
      .select({ total: count() })
      .from(ptsSignals)
      .where(eq(ptsSignals.tenantId, tenantId));
    const resolutivityRate =
      Number(totalSignals) > 0 ? Math.round((Number(resolvedSignals) / Number(totalSignals)) * 100) : 0;

    // Casos por esfera (via unidade de origem da sinalização)
    const sphereRows = await tx
      .select({ type: serviceUnits.type, total: count() })
      .from(ptsSignals)
      .innerJoin(serviceUnits, eq(serviceUnits.id, ptsSignals.sourceUnitId))
      .where(eq(ptsSignals.tenantId, tenantId))
      .groupBy(serviceUnits.type);

    const SPHERE_META: Record<string, { label: string; color: string }> = {
      HEALTH: { label: 'Saúde', color: '#3b82f6' },
      SOCIAL: { label: 'Assistência Social', color: '#22c55e' },
      LEGAL: { label: 'Jurídico/Direitos', color: '#f59e0b' },
      EDUCATION: { label: 'Educação', color: '#8b5cf6' },
    };
    const casesBySphere = ['HEALTH', 'SOCIAL', 'LEGAL', 'EDUCATION'].map((sphere) => {
      const row = sphereRows.find((r: { type: string; total: unknown }) => r.type === sphere);
      return {
        sphere,
        label: SPHERE_META[sphere].label,
        count: Number(row?.total ?? 0),
        color: SPHERE_META[sphere].color,
      };
    });

    // Scores médios das 5 dimensões (da última evolução de cada paciente do tenant)
    // scores é um JSON: { saude: number, social: number, psiquico: number, juridico: number, educacao: number }
    const evolutionRows = await tx
      .select({ scores: ptsEvolutions.scores })
      .from(ptsEvolutions)
      .where(and(eq(ptsEvolutions.tenantId, tenantId), eq(ptsEvolutions.status, 'published')))
      .orderBy(desc(ptsEvolutions.createdAt))
      .limit(100);

    const DIMENSIONS = [
      { key: 'saude', label: 'Saúde' },
      { key: 'social', label: 'Social' },
      { key: 'psiquico', label: 'Psíquico' },
      { key: 'juridico', label: 'Jurídico' },
      { key: 'educacao', label: 'Educação' },
    ];

    const dimensionScores = DIMENSIONS.map(({ key, label }) => {
      const values = evolutionRows
        .map((r: { scores: unknown }) => {
          const s = r.scores as Record<string, number> | null;
          return s?.[key] ?? null;
        })
        .filter((v: number | null): v is number => v !== null);
      const score =
        values.length > 0 ? Math.round(values.reduce((a: number, b: number) => a + b, 0) / values.length) : 0;
      return { dimension: label, score };
    });

    return {
      totalPatients: Number(totalPatients),
      activeCases: Number(activeCases),
      resolvedSignals: Number(resolvedSignals),
      estimatedSavings: Number(resolvedSignals) * 500,
      resolutivityRate,
      casesBySphere,
      dimensionScores,
    };
  });
}

// ─── MANAGER data ─────────────────────────────────────────────────────────────

async function fetchManagerData(
  userId: string,
  tenantId: string,
  activeUnitId: string,
): Promise<ManagerDashboardData> {
  return withTransactionContext(userId, tenantId, async (tx) => {
    // Sinalizações pendentes na unidade ativa
    const inboxSignals = await tx
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
          eq(ptsSignals.tenantId, tenantId),
          eq(ptsSignals.destinationUnitId, activeUnitId),
          inArray(ptsSignals.status, ['encaminhada', 'recebida', 'em_tratamento']),
        ),
      )
      .orderBy(desc(ptsSignals.createdAt));

    const pendingSignals = inboxSignals.filter(
      (s: { status: string }) => s.status === 'encaminhada' || s.status === 'recebida',
    ).length;

    // Cidadãos em observação sem RT (assignedProfessionalId nulo na sinalização)
    const [{ obsCount: patientsInObservation }] = await tx
      .select({ obsCount: count() })
      .from(ptsCases)
      .where(and(eq(ptsCases.tenantId, tenantId), eq(ptsCases.status, 'observacao')));

    // Profissionais vinculados à unidade ativa
    const staffRows = await tx
      .select({
        professionalId: professionalsToUnits.professionalId,
        fullName: profiles.fullName,
      })
      .from(professionalsToUnits)
      .innerJoin(profiles, eq(profiles.id, professionalsToUnits.professionalId))
      .where(eq(professionalsToUnits.unitId, activeUnitId));

    const staffCount = staffRows.length;

    // Carga de trabalho por profissional
    const staffLoad = await Promise.all(
      staffRows.map(async (staff: { professionalId: string; fullName: string | null }) => {
        const [{ actions: assignedActions }] = await tx
          .select({ actions: count() })
          .from(ptsActions)
          .where(
            and(
              eq(ptsActions.tenantId, tenantId),
              eq(ptsActions.assignedProfessionalId, staff.professionalId),
              inArray(ptsActions.status, ['pactuada', 'em_andamento']),
            ),
          );

        const [{ cases: activeCases }] = await tx
          .select({ cases: count() })
          .from(ptsSignals)
          .where(
            and(
              eq(ptsSignals.tenantId, tenantId),
              eq(ptsSignals.assignedProfessionalId, staff.professionalId),
              inArray(ptsSignals.status, ['recebida', 'em_tratamento']),
            ),
          );

        const name = staff.fullName?.split(' ')[0] ?? 'Profissional';
        return {
          name,
          activeCases: Number(activeCases),
          assignedActions: Number(assignedActions),
        };
      }),
    );

    return {
      pendingSignals,
      patientsInObservation: Number(patientsInObservation),
      staffCount,
      staffLoad,
      inboxSignals: inboxSignals as any,
    };
  });
}

// ─── PROFESSIONAL data ────────────────────────────────────────────────────────

async function fetchProfessionalData(
  userId: string,
  tenantId: string,
): Promise<ProfessionalDashboardData> {
  return withTransactionContext(userId, tenantId, async (tx) => {
    // Ações atribuídas ao profissional
    const actionRows = await tx
      .select({
        id: ptsActions.id,
        description: ptsActions.description,
        status: ptsActions.status,
        deadline: ptsActions.deadline,
        patientId: ptsCases.patientId,
        caseId: ptsActions.planId, // usamos planId como proxy
        planId: ptsActions.planId,
      })
      .from(ptsActions)
      .innerJoin(ptsPlans, eq(ptsPlans.id, ptsActions.planId))
      .innerJoin(ptsCases, eq(ptsCases.id, ptsPlans.caseId))
      .where(
        and(
          eq(ptsActions.tenantId, tenantId),
          eq(ptsActions.assignedProfessionalId, userId),
          inArray(ptsActions.status, ['pactuada', 'em_andamento', 'bloqueada']),
        ),
      )
      .orderBy(ptsActions.deadline);

    // Enriquecer com nome do paciente
    const patientIds = [...new Set(actionRows.map((a: { patientId: string | null }) => a.patientId))].filter(Boolean);
    const patientRows =
      patientIds.length > 0
        ? await tx
            .select({ id: patients.id, fullName: patients.fullName })
            .from(patients)
            .where(inArray(patients.id, patientIds as string[]))
        : [];
    const patientMap = new Map(patientRows.map((p: { id: string; fullName: string | null }) => [p.id, p.fullName]));

    type ActionRow = { id: string; description: string; status: string; deadline: Date; patientId: string | null; planId: string };
    const assignedActions = (actionRows as ActionRow[]).map((a) => ({
      id: a.id,
      description: a.description,
      status: a.status,
      deadline: a.deadline,
      patientName: (patientMap.get(a.patientId ?? '') as string | null | undefined) ?? 'Cidadão',
      patientId: a.patientId ?? '',
      caseId: a.planId,
      isBlocked: a.status === 'bloqueada',
    }));

    const blockedActions = assignedActions.filter((a: { isBlocked: boolean }) => a.isBlocked).length;
    const actionsToday = assignedActions.length;

    // Casos onde o profissional é RT (assigned_professional_id nas sinalizações ativas)
    const rtCaseRows = await tx
      .select({
        patientId: ptsCases.patientId,
        caseId: ptsCases.id,
        caseStatus: ptsCases.status,
        updatedAt: ptsCases.updatedAt,
      })
      .from(ptsSignals)
      .innerJoin(ptsCases, eq(ptsCases.id, ptsSignals.caseId))
      .where(
        and(
          eq(ptsSignals.tenantId, tenantId),
          eq(ptsSignals.assignedProfessionalId, userId),
          inArray(ptsCases.status, ['observacao', 'acompanhamento', 'pts_ativo', 'pia_ativo']),
        ),
      )
      .groupBy(ptsCases.id, ptsCases.patientId, ptsCases.status, ptsCases.updatedAt)
      .limit(20);

    const rtPatientIds = [...new Set(rtCaseRows.map((r: { patientId: string | null }) => r.patientId))].filter(Boolean);
    const rtPatientRows =
      rtPatientIds.length > 0
        ? await tx
            .select({ id: patients.id, fullName: patients.fullName })
            .from(patients)
            .where(inArray(patients.id, rtPatientIds as string[]))
        : [];
    const rtPatientMap = new Map<string, string | null>(
      rtPatientRows.map((p: { id: string; fullName: string | null }) => [p.id, p.fullName]),
    );

    const getPatientName = (map: Map<string, string | null>, id: string | null): string => {
      const val = map.get(id ?? '');
      return val != null ? val : 'Cidadão';
    };

    type RtCaseRow = { patientId: string | null; caseId: string; caseStatus: string; updatedAt: Date };
    const myCases = (rtCaseRows as RtCaseRow[]).map((r) => ({
      patientId: r.patientId ?? '',
      patientName: getPatientName(rtPatientMap, r.patientId),
      caseId: r.caseId,
      caseStatus: r.caseStatus,
      lastUpdateAt: r.updatedAt,
    }));

    const myCasesCount = myCases.length;

    // Feed de eventos recentes: sinalizações recentes dos casos do profissional
    const feedSignals = rtCaseRows.length > 0
      ? await tx
          .select({
            id: ptsSignals.id,
            abstractReason: ptsSignals.abstractReason,
            caseId: ptsSignals.caseId,
            patientId: ptsCases.patientId,
            status: ptsSignals.status,
            createdAt: ptsSignals.createdAt,
          })
          .from(ptsSignals)
          .innerJoin(ptsCases, eq(ptsCases.id, ptsSignals.caseId))
          .where(
            and(
              eq(ptsSignals.tenantId, tenantId),
              inArray(
                ptsSignals.caseId,
                (rtCaseRows as RtCaseRow[]).map((r) => r.caseId),
              ),
            ),
          )
          .orderBy(desc(ptsSignals.createdAt))
          .limit(10)
      : [];

    type FeedSignalRow = { id: string; abstractReason: string; caseId: string; patientId: string | null; status: string; createdAt: Date };
    const feed = (feedSignals as FeedSignalRow[]).map((s) => ({
      id: s.id,
      type: 'signal' as const,
      description: s.abstractReason,
      patientName: getPatientName(rtPatientMap, s.patientId),
      patientId: s.patientId ?? '',
      caseId: s.caseId,
      occurredAt: s.createdAt,
    }));

    return {
      myCasesCount,
      actionsToday,
      blockedActions,
      assignedActions,
      myCases,
      feed,
    };
  });
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function DashboardPage() {
  const user = await getAuthUser();
  const ctx = await getActiveTenantContext();

  const profile =
    user && ctx
      ? await withTransactionContext(ctx.userId, ctx.tenantId, async (tx) => {
          return tx
            .select()
            .from(profiles)
            .where(eq(profiles.id, user.id))
            .limit(1)
            .then((r: any[]) => r[0]);
        })
      : null;

  const firstName = profile?.fullName?.split(' ')[0] ?? 'Profissional';
  const role = profile?.role ?? 'PROFESSIONAL';

  if (!ctx) {
    return (
      <div className="flex min-h-full items-center justify-center">
        <p className="text-muted-foreground">Sessão inválida. Faça login novamente.</p>
      </div>
    );
  }

  // ── ADMIN ──────────────────────────────────────────────────────────────────
  if (role === 'ADMIN') {
    const data = await fetchAdminData(ctx.userId, ctx.tenantId);
    return (
      <div className="min-h-full bg-background p-8 lg:p-12">
        <div className="mx-auto max-w-[1400px]">
          <AdminDashboard data={data} firstName={firstName} />
        </div>
      </div>
    );
  }

  // ── MANAGER ────────────────────────────────────────────────────────────────
  if (role === 'MANAGER') {
    const data = ctx.activeUnitId
      ? await fetchManagerData(ctx.userId, ctx.tenantId, ctx.activeUnitId)
      : ({
          pendingSignals: 0,
          patientsInObservation: 0,
          staffCount: 0,
          staffLoad: [],
          inboxSignals: [],
        } satisfies ManagerDashboardData);

    return (
      <div className="min-h-full bg-background p-8 lg:p-12">
        <div className="mx-auto max-w-[1400px]">
          <ManagerDashboard data={data} firstName={firstName} />
        </div>
      </div>
    );
  }

  // ── PROFESSIONAL ───────────────────────────────────────────────────────────
  const data = await fetchProfessionalData(ctx.userId, ctx.tenantId);
  return (
    <div className="min-h-full bg-background p-8 lg:p-12">
      <div className="mx-auto max-w-[1400px]">
        <ProfessionalDashboard data={data} firstName={firstName} />
      </div>
    </div>
  );
}
