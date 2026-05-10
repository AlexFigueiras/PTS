import Link from 'next/link';
import { redirect } from 'next/navigation';
import { and, count, desc, eq, gte, isNull } from 'drizzle-orm';
import { getActiveTenantContext } from '@/lib/auth/get-tenant-context';
import { ForbiddenError } from '@/lib/auth/authorization';
import { getDb } from '@/lib/db/client';
import { patients, clinicalRecords, tenantMembers } from '@/lib/db/schema';
import { RECORD_TYPE_LABELS } from '@/modules/records/record.dto';

export const metadata = { title: 'Dashboard' };

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border p-5">
      <p className="text-muted-foreground text-sm">{label}</p>
      <p className="mt-1 text-3xl font-semibold tabular-nums">{value}</p>
    </div>
  );
}

export default async function DashboardPage() {
  const ctx = await getActiveTenantContext();
  if (!ctx) redirect('/login');

  const db = getDb();
  const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

  let stats, recentRecords;
  try {
    [stats, recentRecords] = await Promise.all([
      Promise.all([
        db
          .select({ n: count() })
          .from(patients)
          .where(and(eq(patients.tenantId, ctx.tenantId), eq(patients.status, 'active'))),
        db
          .select({ n: count() })
          .from(clinicalRecords)
          .where(
            and(
              eq(clinicalRecords.tenantId, ctx.tenantId),
              gte(clinicalRecords.createdAt, startOfMonth),
              isNull(clinicalRecords.deletedAt),
            ),
          ),
        db
          .select({ n: count() })
          .from(tenantMembers)
          .where(eq(tenantMembers.tenantId, ctx.tenantId)),
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
        .where(
          and(eq(clinicalRecords.tenantId, ctx.tenantId), isNull(clinicalRecords.deletedAt)),
        )
        .orderBy(desc(clinicalRecords.sessionDate), desc(clinicalRecords.createdAt))
        .limit(5),
    ]);
  } catch (err) {
    if (err instanceof ForbiddenError) redirect('/unauthorized');
    throw err;
  }

  const [totalPatients, recordsThisMonth, teamCount] = stats;

  return (
    <div className="mx-auto max-w-3xl space-y-8 p-6">
      <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Pacientes ativos" value={Number(totalPatients[0]?.n ?? 0)} />
        <StatCard label="Registros este mês" value={Number(recordsThisMonth[0]?.n ?? 0)} />
        <StatCard label="Membros da equipe" value={Number(teamCount[0]?.n ?? 0)} />
      </div>

      <div>
        <h2 className="mb-3 text-sm font-medium">Atividade recente</h2>
        {recentRecords.length === 0 ? (
          <p className="text-muted-foreground text-sm">Nenhum registro clínico ainda.</p>
        ) : (
          <div className="divide-y rounded-lg border">
            {recentRecords.map((r) => {
              const name = r.patientPreferredName ?? r.patientName;
              const date = new Date(r.sessionDate + 'T00:00:00').toLocaleDateString('pt-BR');
              return (
                <Link
                  key={r.id}
                  href={`/patients/${r.patientId}/records/${r.id}`}
                  className="hover:bg-muted/50 flex items-center justify-between px-4 py-3 transition-colors"
                >
                  <div>
                    <p className="text-sm font-medium">{name}</p>
                    <p className="text-muted-foreground text-xs">
                      {RECORD_TYPE_LABELS[r.type]} · {date}
                    </p>
                  </div>
                  <span
                    className={
                      r.status === 'finalized'
                        ? 'text-muted-foreground text-xs'
                        : 'text-yellow-600 text-xs'
                    }
                  >
                    {r.status === 'finalized' ? 'Finalizado' : 'Rascunho'}
                  </span>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
