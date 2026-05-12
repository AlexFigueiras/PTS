import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getActiveTenantContext } from '@/lib/auth/get-tenant-context';
import { SessionRepository } from '@/modules/groups/session.repository';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle, FileText, Target } from 'lucide-react';

export default async function SessionDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await getActiveTenantContext();
  if (!ctx) return null;

  const repo = new SessionRepository(ctx.tenantId);
  const session = await repo.getById(id);
  
  if (!session) notFound();

  const presentCount = session.attendance.filter(a => a.isPresent).length;
  const absentCount = session.attendance.length - presentCount;

  return (
    <div className="min-h-full bg-slate-50/50 p-12 animate-reveal">
      <div className="mx-auto max-w-4xl space-y-12">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-4">
            <Link href={`/groups/${session.groupId}`} className="text-sm font-bold text-primary hover:underline">← Voltar para o Grupo</Link>
            <h1 className="text-5xl font-bold tracking-tighter text-slate-900">Registro de Presença</h1>
            <p className="text-lg text-slate-500">{new Date(session.sessionDate).toLocaleDateString('pt-BR', { dateStyle: 'full' })}</p>
          </div>
          <div className="flex gap-4">
             <div className="text-center px-6 py-3 bg-emerald-50 rounded-2xl border border-emerald-100">
                <p className="text-xs font-bold text-emerald-600 uppercase">Presentes</p>
                <p className="text-2xl font-black text-emerald-700">{presentCount}</p>
             </div>
             <div className="text-center px-6 py-3 bg-rose-50 rounded-2xl border border-rose-100">
                <p className="text-xs font-bold text-rose-600 uppercase">Faltas</p>
                <p className="text-2xl font-black text-rose-700">{absentCount}</p>
             </div>
          </div>
        </div>

        {session.summary && (
          <Card className="rounded-[2.5rem] border-zinc-200/50 shadow-sm bg-white overflow-hidden">
             <CardContent className="p-10 space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400">Resumo da Sessão</h3>
                <p className="text-slate-700 text-lg leading-relaxed">{session.summary}</p>
             </CardContent>
          </Card>
        )}

        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-slate-800">Detalhamento por Membro</h2>
          <div className="space-y-4">
            {session.attendance.map((record) => (
              <Card key={record.id} className="rounded-[2rem] border-zinc-200/50 shadow-sm bg-white">
                <CardContent className="p-8">
                  <div className="flex items-start justify-between gap-6">
                    <div className="flex items-center gap-4">
                      <div className={cn(
                        "size-12 rounded-full flex items-center justify-center transition-colors",
                        record.isPresent ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
                      )}>
                        {record.isPresent ? <CheckCircle2 size={24} /> : <XCircle size={24} />}
                      </div>
                      <div>
                        <h4 className="text-xl font-bold text-slate-800">{record.patientName}</h4>
                        <Badge variant={record.isPresent ? "outline" : "destructive"} className="rounded-full">
                          {record.isPresent ? "Presente" : "Faltou"}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  {(record.participationNotes || record.outcomes) && (
                    <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-8 border-t pt-8">
                      {record.participationNotes && (
                        <div className="space-y-2">
                           <div className="flex items-center gap-2 text-slate-400">
                              <FileText size={16} />
                              <span className="text-xs font-bold uppercase tracking-widest">Participação</span>
                           </div>
                           <p className="text-slate-600 leading-relaxed italic">"{record.participationNotes}"</p>
                        </div>
                      )}
                      {record.outcomes && (
                        <div className="space-y-2">
                           <div className="flex items-center gap-2 text-slate-400">
                              <Target size={16} />
                              <span className="text-xs font-bold uppercase tracking-widest">Desfechos</span>
                           </div>
                           <p className="text-slate-600 leading-relaxed font-medium">{record.outcomes}</p>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// Helper para evitar erro de cn se não importado
function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}
