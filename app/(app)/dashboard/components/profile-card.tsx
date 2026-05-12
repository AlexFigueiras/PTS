'use client';

import { Star, Users } from 'lucide-react';

export function ProfileCard({ fullName }: { fullName?: string | null }) {
  const name = fullName ?? 'Dr. Profissional';
  return (
    <div className="rounded-[2.5rem] bg-card p-10 shadow-diffusion premium-bevel text-center">
      <h3 className="mb-8 text-left text-xl font-semibold text-foreground">Perfil</h3>
      
      <div className="mx-auto mb-6 h-32 w-32 rounded-full bg-secondary/60 ring-8 ring-primary/5" />
      <h4 className="text-2xl font-semibold tracking-tight text-foreground">{name}</h4>
      <p className="mb-10 text-sm font-bold uppercase tracking-widest text-muted-foreground/60">Profissional de Saúde</p>

      <div className="flex justify-between border-b border-border/80 pb-10">
        <div className="flex flex-col items-center gap-2">
          <div className="flex items-center gap-1.5 text-primary">
            <Star size={18} fill="currentColor" />
            <span className="text-lg font-bold">4.5</span>
          </div>
          <span className="text-xs font-black uppercase tracking-widest text-muted-foreground/40">Avaliação</span>
        </div>
        <div className="flex flex-col items-center gap-2">
          <div className="flex items-center gap-1.5 text-primary">
            <Users size={18} />
            <span className="text-lg font-bold">115</span>
          </div>
          <span className="text-xs font-black uppercase tracking-widest text-muted-foreground/40">Pacientes</span>
        </div>
      </div>

      <div className="mt-10 space-y-8 text-left">
        {[
          { name: 'Linda Brown', msg: 'Ótimo atendimento!' },
          { name: 'John Doe', msg: 'Profissional muito atencioso.' },
          { name: 'James Vane', msg: 'Obrigado pelo suporte!' },
        ].map((rev, i) => (
          <div key={i} className="flex gap-5 group">
            <div className="h-10 w-10 shrink-0 rounded-full bg-secondary transition-all group-hover:ring-4 group-hover:ring-primary/10" />
            <div className="space-y-1">
              <p className="text-sm font-bold text-foreground/90">{rev.name}</p>
              <p className="text-xs font-medium text-muted-foreground/80 line-clamp-1">{rev.msg}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
