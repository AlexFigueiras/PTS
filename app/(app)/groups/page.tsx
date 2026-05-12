import Link from 'next/link';
import { Plus, Users, Clock, Calendar } from 'lucide-react';
import { getActiveTenantContext } from '@/lib/auth/get-tenant-context';
import { GroupRepository } from '@/modules/groups/group.repository';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { dayOfWeekOptions } from '@/modules/groups/group.dto';

export const metadata = { title: 'Grupos Terapêuticos | MentalGest' };

export default async function GroupsPage() {
  const ctx = await getActiveTenantContext();
  if (!ctx) return null;

  const repo = new GroupRepository(ctx.tenantId);
  const groups = await repo.list();

  return (
    <div className="min-h-full bg-background p-12 animate-reveal">
      <div className="mx-auto max-w-[1400px] space-y-12">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <h1 className="text-5xl font-bold tracking-tighter text-slate-900">Grupos Terapêuticos</h1>
            <p className="text-lg text-slate-500">Gerencie seus grupos, membros e registros de chamadas.</p>
          </div>
          <Link href="/groups/new">
            <Button className="h-14 px-8 text-lg font-bold rounded-2xl shadow-lg shadow-primary/20 transition-all hover:scale-105 active:scale-95">
              <Plus className="mr-2 h-6 w-6" />
              Novo Grupo
            </Button>
          </Link>
        </div>

        {groups.length === 0 ? (
          <Card className="rounded-[3rem] border-dashed border-2 border-slate-200 bg-slate-50/50 p-20 text-center">
            <CardContent className="space-y-6">
              <div className="mx-auto flex size-20 items-center justify-center rounded-full bg-white shadow-sm">
                <Users className="size-10 text-slate-400" />
              </div>
              <div className="space-y-2">
                <h3 className="text-2xl font-bold text-slate-800">Nenhum grupo encontrado</h3>
                <p className="text-slate-500">Comece criando seu primeiro grupo terapêutico.</p>
              </div>
              <Link href="/groups/new">
                <Button variant="outline" className="rounded-xl">Criar meu primeiro grupo</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {groups.map((group) => (
              <Link key={group.id} href={`/groups/${group.id}`}>
                <Card className="group relative overflow-hidden rounded-[2.5rem] border-zinc-200/50 bg-white transition-all duration-500 hover:-translate-y-2 hover:shadow-[0_30px_60px_-15px_rgba(0,0,0,0.1)]">
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
                  <CardHeader className="p-8 pb-4">
                    <CardTitle className="text-2xl font-bold tracking-tight text-slate-800">
                      {group.name}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-8 pt-0 space-y-6">
                    <p className="text-slate-500 line-clamp-2 min-h-[3rem]">{group.objective}</p>
                    
                    <div className="flex flex-wrap gap-4 text-sm font-medium text-slate-600">
                      <div className="flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1">
                        <Calendar className="size-4 text-primary" />
                        <span>{group.daysOfWeek?.length} dias/semana</span>
                      </div>
                      <div className="flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1">
                        <Clock className="size-4 text-primary" />
                        <span>{group.startTime} ({group.durationMinutes}min)</span>
                      </div>
                    </div>

                    <div className="pt-4 flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-widest text-slate-400 group-hover:text-primary transition-colors">Ver Detalhes →</span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
