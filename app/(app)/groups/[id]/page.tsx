import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getActiveTenantContext } from '@/lib/auth/get-tenant-context';
import { GroupRepository } from '@/modules/groups/group.repository';
import { SessionRepository } from '@/modules/groups/session.repository';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, Users, Plus, ClipboardCheck } from 'lucide-react';
import { dayOfWeekOptions } from '@/modules/groups/group.dto';

export default async function GroupDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await getActiveTenantContext();
  if (!ctx) return null;

  const repo = new GroupRepository(ctx.tenantId);
  const sessionRepo = new SessionRepository(ctx.tenantId);
  
  const group = await repo.getById(id);
  if (!group) notFound();

  const sessions = await sessionRepo.listByGroup(id);

  const daysLabels = group.daysOfWeek?.map(
    d => dayOfWeekOptions.find(opt => opt.value === d)?.label
  ).join(', ');

  return (
    <div className="min-h-full bg-slate-50/50 p-12 animate-reveal">
      <div className="mx-auto max-w-[1400px] space-y-12">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-4">
            <Link href="/groups" className="text-sm font-bold text-primary hover:underline">← Voltar para Grupos</Link>
            <h1 className="text-5xl font-bold tracking-tighter text-slate-900">{group.name}</h1>
            <div className="flex flex-wrap gap-3">
              {group.facilitators.map(f => (
                <Badge key={f.id} variant="secondary" className="px-3 py-1 rounded-full bg-white shadow-sm border-zinc-200">
                  {f.fullName}
                </Badge>
              ))}
            </div>
          </div>
          <Link href={`/groups/${id}/sessions/new`}>
            <Button className="h-14 px-8 text-lg font-bold rounded-2xl shadow-lg shadow-primary/20 transition-all hover:scale-105 active:scale-95">
              <ClipboardCheck className="mr-2 h-6 w-6" />
              Fazer Chamada
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-12 gap-8">
          {/* Info Card */}
          <div className="col-span-12 lg:col-span-4 space-y-8">
            <Card className="rounded-[2.5rem] border-zinc-200/50 shadow-diffusion overflow-hidden bg-white">
              <CardContent className="p-10 space-y-8">
                <div className="space-y-2">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400">Objetivo</h3>
                  <p className="text-slate-700 leading-relaxed">{group.objective || 'Não definido'}</p>
                </div>
                
                <div className="space-y-6 pt-6 border-t">
                  <div className="flex items-center gap-4">
                    <div className="flex size-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                      <Calendar size={20} />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-400">Dias</p>
                      <p className="font-semibold text-slate-800">{daysLabels}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="flex size-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                      <Clock size={20} />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-400">Horário</p>
                      <p className="font-semibold text-slate-800">{group.startTime} ({group.durationMinutes}min)</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="flex size-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                      <Users size={20} />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-400">Membros Ativos</p>
                      <p className="font-semibold text-slate-800">{group.members.length} pacientes</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-[2.5rem] border-zinc-200/50 shadow-diffusion bg-white">
              <CardContent className="p-10 space-y-6">
                <h3 className="text-xl font-bold text-slate-800">Lista de Membros</h3>
                <div className="space-y-4">
                  {group.members.map(m => (
                    <div key={m.id} className="flex items-center gap-3 p-3 rounded-2xl hover:bg-slate-50 transition-colors">
                      <div className="size-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-500">
                        {m.fullName.charAt(0)}
                      </div>
                      <span className="font-medium text-slate-700">{m.fullName}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sessions List */}
          <div className="col-span-12 lg:col-span-8">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-2xl font-bold text-slate-800">Histórico de Sessões</h3>
            </div>

            {sessions.length === 0 ? (
              <div className="rounded-[2.5rem] border-2 border-dashed border-slate-200 p-20 text-center bg-white/50">
                <p className="text-slate-500">Nenhuma sessão registrada ainda.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {sessions.map(session => (
                  <Link key={session.id} href={`/groups/sessions/${session.id}`}>
                    <Card className="rounded-[2rem] border-zinc-200/50 shadow-sm hover:shadow-md transition-all p-8 flex items-center justify-between group bg-white">
                      <div className="flex items-center gap-6">
                        <div className="flex flex-col items-center justify-center size-16 rounded-[1.25rem] bg-slate-50 text-slate-800 group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                          <span className="text-xs font-bold uppercase">{new Intl.DateTimeFormat('pt-BR', { month: 'short' }).format(new Date(session.sessionDate))}</span>
                          <span className="text-2xl font-black leading-none">{new Date(session.sessionDate).getDate()}</span>
                        </div>
                        <div>
                          <p className="text-lg font-bold text-slate-800">Sessão de Grupo</p>
                          <p className="text-sm text-slate-500">{new Date(session.sessionDate).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-xs font-bold text-slate-400 group-hover:text-primary transition-colors">Ver Presenças →</span>
                      </div>
                    </Card>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
