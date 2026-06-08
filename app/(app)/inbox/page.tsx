import { redirect } from 'next/navigation';
import { Sparkles } from 'lucide-react';
import { getActiveTenantContext } from '@/lib/auth/get-tenant-context';
import { withTransactionContext } from '@/lib/db/client';
import { PtsSignalRepository } from '@/modules/pts/repositories/pts-signal.repository';
import { SuggestionInbox } from '@/components/pts/suggestion-inbox';

export const metadata = { title: 'Caixa de Sugestões da IA' };

export default async function InboxPage() {
  const ctx = await getActiveTenantContext();
  if (!ctx) redirect('/login');

  // Sugestões da IA cuja autoria é do profissional logado (vinculado por matrícula
  // ao relato de origem). Ele aceita ou rejeita — humano-no-loop preservado.
  const signals = await withTransactionContext(ctx.userId, ctx.tenantId, async (tx) => {
    const repo = new PtsSignalRepository(ctx, tx);
    return repo.findSuggestedForAuthor(ctx.userId);
  });

  return (
    <div className="min-h-full bg-background/50 text-foreground">
      <div className="mx-auto max-w-3xl space-y-8 p-8 md:p-16 animate-reveal">
        <header className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="inline-flex rounded-xl bg-primary/10 p-2">
              <Sparkles size={18} className="text-primary" />
            </div>
            <h1 className="text-3xl font-black uppercase italic tracking-tight text-foreground md:text-4xl">
              Sugestões da IA
            </h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Encaminhamentos e necessidades de coordenação que a IA derivou a partir dos seus
            relatos. Você decide: aceitar encaminha à rede; rejeitar descarta a sugestão.
          </p>
        </header>

        <SuggestionInbox signals={signals} />
      </div>
    </div>
  );
}
