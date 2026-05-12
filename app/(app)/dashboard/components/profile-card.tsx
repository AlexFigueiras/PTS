'use client';

import { Star, Users } from 'lucide-react';

export function ProfileCard() {
  return (
    <div className="rounded-[2.5rem] bg-card p-10 shadow-diffusion premium-bevel text-center">
      <h3 className="mb-8 text-left text-xl font-semibold text-foreground">Profile</h3>
      
      <div className="mx-auto mb-6 h-32 w-32 rounded-full bg-secondary/60 ring-8 ring-primary/5" />
      <h4 className="text-2xl font-semibold tracking-tight text-foreground">Dr James Smith</h4>
      <p className="mb-10 text-sm font-bold uppercase tracking-widest text-muted-foreground/60">Cardiologists doctors</p>

      <div className="flex justify-between border-b border-border/80 pb-10">
        <div className="flex flex-col items-center gap-2">
          <div className="flex items-center gap-1.5 text-primary">
            <Star size={18} fill="currentColor" />
            <span className="text-lg font-bold">4.5</span>
          </div>
          <span className="text-xs font-black uppercase tracking-widest text-muted-foreground/40">Rating</span>
        </div>
        <div className="flex flex-col items-center gap-2">
          <div className="flex items-center gap-1.5 text-primary">
            <Users size={18} />
            <span className="text-lg font-bold">115</span>
          </div>
          <span className="text-xs font-black uppercase tracking-widest text-muted-foreground/40">Patients</span>
        </div>
      </div>

      <div className="mt-10 space-y-8 text-left">
        {[
          { name: 'Linda Brown', msg: 'Dr. James is a great doctor!' },
          { name: 'John Doe', msg: 'Dr. James is my favourite' },
          { name: 'James Vane', msg: 'Thanks Doc!' },
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
