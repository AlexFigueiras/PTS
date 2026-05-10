import { redirect } from 'next/navigation';
import { eq } from 'drizzle-orm';
import { getAuthUser } from '@/lib/auth/get-user';
import { getDb } from '@/lib/db/client';
import { tenantInvites, tenants } from '@/lib/db/schema';
import { ROLE_LABELS } from '@/modules/members/member.dto';
import { acceptInviteAction } from '@/modules/invites/invite.actions';

type Props = { params: Promise<{ token: string }>; searchParams: Promise<{ error?: string }> };

export const metadata = { title: 'Aceitar convite' };

export default async function InvitePage({ params, searchParams }: Props) {
  const { token } = await params;
  const { error } = await searchParams;

  const user = await getAuthUser();
  if (!user) redirect(`/login?redirect=/invite/${token}`);

  const db = getDb();
  const [invite] = await db
    .select({
      id: tenantInvites.id,
      email: tenantInvites.email,
      role: tenantInvites.role,
      expiresAt: tenantInvites.expiresAt,
      acceptedAt: tenantInvites.acceptedAt,
      tenantName: tenants.name,
    })
    .from(tenantInvites)
    .innerJoin(tenants, eq(tenantInvites.tenantId, tenants.id))
    .where(eq(tenantInvites.token, token))
    .limit(1);

  if (!invite) {
    return <InviteMessage title="Convite inválido" body="Este link de convite não existe ou já foi removido." />;
  }

  if (invite.acceptedAt) {
    return <InviteMessage title="Convite já utilizado" body="Este convite já foi aceito anteriormente." link="/dashboard" />;
  }

  if (invite.expiresAt < new Date()) {
    return <InviteMessage title="Convite expirado" body={`Este convite expirou em ${invite.expiresAt.toLocaleDateString('pt-BR')}.`} />;
  }

  return (
    <main className="mx-auto flex min-h-svh max-w-sm flex-col justify-center gap-6 p-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Convite recebido</h1>
        <p className="text-muted-foreground text-sm">
          Você foi convidado para ingressar em{' '}
          <strong className="text-foreground">{invite.tenantName}</strong> como{' '}
          <strong className="text-foreground">{ROLE_LABELS[invite.role]}</strong>.
        </p>
      </div>

      {error && (
        <p role="alert" className="text-destructive text-sm">
          {decodeURIComponent(error)}
        </p>
      )}

      <form action={acceptInviteAction}>
        <input type="hidden" name="token" value={token} />
        <button
          type="submit"
          className="bg-primary text-primary-foreground hover:bg-primary/90 w-full rounded-md px-4 py-2 text-sm font-medium transition-colors"
        >
          Aceitar e entrar em {invite.tenantName}
        </button>
      </form>
    </main>
  );
}

function InviteMessage({
  title,
  body,
  link,
}: {
  title: string;
  body: string;
  link?: string;
}) {
  return (
    <main className="mx-auto flex min-h-svh max-w-sm flex-col justify-center gap-4 p-6">
      <h1 className="text-xl font-semibold">{title}</h1>
      <p className="text-muted-foreground text-sm">{body}</p>
      {link && (
        <a href={link} className="text-sm underline underline-offset-4">
          Ir para o dashboard
        </a>
      )}
    </main>
  );
}
