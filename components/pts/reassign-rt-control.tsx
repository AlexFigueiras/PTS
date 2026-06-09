'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { reassignReferenceTechnicianAction } from '@/modules/pts/actions';
import { toast } from 'sonner';
import { UserCog, Loader2 } from 'lucide-react';

type Professional = { id: string; fullName: string | null };

export function ReassignRtControl({
  planId,
  currentOwnerId,
  professionals,
}: {
  planId: string;
  currentOwnerId: string | null;
  professionals: Professional[];
}) {
  const router = useRouter();
  const [selected, setSelected] = useState('');
  const [isPending, startTransition] = useTransition();

  const currentName = professionals.find((p) => p.id === currentOwnerId)?.fullName ?? 'Não definido';

  function handleReassign() {
    if (!selected || selected === currentOwnerId) {
      toast.error('Selecione um novo Técnico de Referência.');
      return;
    }
    startTransition(async () => {
      const result = await reassignReferenceTechnicianAction({ planId, newOwnerId: selected });
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success('Técnico de Referência reatribuído.');
        setSelected('');
        router.refresh();
      }
    });
  }

  return (
    <div className="rounded-3xl border border-border bg-card p-6 shadow-diffusion">
      <div className="mb-4 flex items-center gap-3">
        <div className="inline-flex rounded-xl bg-primary/10 p-2 text-primary">
          <UserCog size={16} />
        </div>
        <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground/60 italic">
          Técnico de Referência
        </h2>
      </div>
      <p className="mb-3 text-xs text-muted-foreground">
        Atual: <span className="font-bold text-foreground">{currentName}</span>
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
          className="rounded-xl border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
        >
          <option value="">Reatribuir para...</option>
          {professionals
            .filter((p) => p.id !== currentOwnerId)
            .map((p) => (
              <option key={p.id} value={p.id}>
                {p.fullName ?? p.id}
              </option>
            ))}
        </select>
        <button
          onClick={handleReassign}
          disabled={isPending || !selected}
          className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-[10px] font-black uppercase tracking-widest text-primary-foreground transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50"
        >
          {isPending ? <Loader2 size={12} className="animate-spin" /> : <UserCog size={12} />}
          Reatribuir
        </button>
      </div>
    </div>
  );
}
