import { redirect } from 'next/navigation';
import { and, eq, desc } from 'drizzle-orm';
import { Activity, HeartPulse, AlertCircle } from 'lucide-react';
import { getActiveTenantContext } from '@/lib/auth/get-tenant-context';
import { withTransactionContext } from '@/lib/db/client';
import { sourceHealthRecords, patients, type SourceHealthRecord } from '@/lib/db/schema';

type HealthRow = Pick<SourceHealthRecord, 'id' | 'patientId' | 'unitLabel' | 'rawText' | 'recordedAt'> & { patientName: string };
import { HealthRecordEditor } from '@/components/pts/demo/health-record-editor';

export default async function FonteSaudePage() {
  const ctx = await getActiveTenantContext();
  if (!ctx) redirect('/login');

  const records = await withTransactionContext(ctx.userId, ctx.tenantId, async (tx) => {
    // Busca todos os registros de saúde com dados do paciente
    const rows = await tx
      .select({
        id: sourceHealthRecords.id,
        patientId: sourceHealthRecords.patientId,
        unitLabel: sourceHealthRecords.unitLabel,
        rawText: sourceHealthRecords.rawText,
        recordedAt: sourceHealthRecords.recordedAt,
        patientName: patients.fullName,
      })
      .from(sourceHealthRecords)
      .innerJoin(patients, eq(patients.id, sourceHealthRecords.patientId))
      .where(eq(sourceHealthRecords.tenantId, ctx.tenantId))
      .orderBy(desc(sourceHealthRecords.recordedAt));
    return rows;
  });

  return (
    <div className="min-h-full bg-background/50 text-foreground">
      <div className="mx-auto max-w-4xl space-y-8 p-8 md:p-16 animate-reveal">
        {/* Header */}
        <div className="relative overflow-hidden rounded-3xl border border-rose-500/20 bg-gradient-to-br from-rose-500/5 to-rose-500/10 p-8 shadow-diffusion">
          <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-rose-500/10 blur-[100px]" />
          <div className="flex items-center gap-4">
            <div className="rounded-2xl bg-rose-500/15 p-3">
              <HeartPulse size={24} className="text-rose-600" />
            </div>
            <div>
              <h1 className="text-2xl font-black uppercase italic tracking-tight text-foreground">
                Fonte — Saúde
              </h1>
              <p className="text-sm text-muted-foreground">
                Registros clínicos fictícios (UBS/CAPS/UPA) — camada-fonte sensível
              </p>
            </div>
          </div>

          <div className="mt-4 flex items-start gap-2 rounded-xl border border-amber-500/20 bg-amber-500/5 p-3">
            <AlertCircle size={14} className="mt-0.5 shrink-0 text-amber-500" />
            <p className="text-xs text-amber-700">
              <strong>Demo Fase 3:</strong> Estes são dados fictícios para demonstração do roteiro.
              Edite um fator e depois abra o painel split para ver a Dimensão recalcular ao vivo.
            </p>
          </div>
        </div>

        {/* Lista de registros */}
        {records.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center">
            <Activity size={32} className="mx-auto mb-4 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">
              Nenhum registro de saúde encontrado. Execute o seed da dona Maria primeiro.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {(records as HealthRow[]).map((record) => (
              <HealthRecordEditor
                key={record.id}
                record={{
                  id: record.id,
                  patientId: record.patientId,
                  patientName: record.patientName,
                  unitLabel: record.unitLabel,
                  rawText: record.rawText,
                  recordedAt: record.recordedAt.toISOString(),
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
