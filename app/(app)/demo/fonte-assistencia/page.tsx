import { redirect } from 'next/navigation';
import { and, eq, desc } from 'drizzle-orm';
import { Users, AlertCircle, Home } from 'lucide-react';
import { getActiveTenantContext } from '@/lib/auth/get-tenant-context';
import { withTransactionContext } from '@/lib/db/client';
import { sourceSocialRecords, patients, type SourceSocialRecord } from '@/lib/db/schema';

type SocialRow = Pick<SourceSocialRecord, 'id' | 'patientId' | 'unitLabel' | 'rawText' | 'recordedAt'> & { patientName: string };
import { SocialRecordEditor } from '@/components/pts/demo/social-record-editor';

export default async function FonteAssistenciaPage() {
  const ctx = await getActiveTenantContext();
  if (!ctx) redirect('/login');

  const records = await withTransactionContext(ctx.userId, ctx.tenantId, async (tx) => {
    const rows = await tx
      .select({
        id: sourceSocialRecords.id,
        patientId: sourceSocialRecords.patientId,
        unitLabel: sourceSocialRecords.unitLabel,
        rawText: sourceSocialRecords.rawText,
        recordedAt: sourceSocialRecords.recordedAt,
        patientName: patients.fullName,
      })
      .from(sourceSocialRecords)
      .innerJoin(patients, eq(patients.id, sourceSocialRecords.patientId))
      .where(eq(sourceSocialRecords.tenantId, ctx.tenantId))
      .orderBy(desc(sourceSocialRecords.recordedAt));
    return rows;
  });

  return (
    <div className="min-h-full bg-background/50 text-foreground">
      <div className="mx-auto max-w-4xl space-y-8 p-8 md:p-16 animate-reveal">
        {/* Header */}
        <div className="relative overflow-hidden rounded-3xl border border-amber-500/20 bg-gradient-to-br from-amber-500/5 to-amber-500/10 p-8 shadow-diffusion">
          <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-amber-500/10 blur-[100px]" />
          <div className="flex items-center gap-4">
            <div className="rounded-2xl bg-amber-500/15 p-3">
              <Home size={24} className="text-amber-600" />
            </div>
            <div>
              <h1 className="text-2xl font-black uppercase italic tracking-tight text-foreground">
                Fonte — Assistência Social
              </h1>
              <p className="text-sm text-muted-foreground">
                Registros fictícios CRAS/CREAS/PAIF — camada-fonte sensível
              </p>
            </div>
          </div>

          <div className="mt-4 flex items-start gap-2 rounded-xl border border-amber-500/20 bg-amber-500/5 p-3">
            <AlertCircle size={14} className="mt-0.5 shrink-0 text-amber-600" />
            <p className="text-xs text-amber-700">
              <strong>Roteiro Ato 2:</strong> Altere um fator — ex: &quot;família perdeu o benefício&quot; —
              e use o painel split para ver a Dimensão Social recalcular e a sinalização cruzada
              disparar à outra esfera.
            </p>
          </div>
        </div>

        {/* Lista de registros */}
        {records.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center">
            <Users size={32} className="mx-auto mb-4 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">
              Nenhum registro de assistência social encontrado. Execute o seed da dona Maria primeiro.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {(records as SocialRow[]).map((record) => (
              <SocialRecordEditor
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
