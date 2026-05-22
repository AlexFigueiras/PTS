import { loadInviteForActivation } from '@/modules/invites/invite.service';
import { ActivationForm } from './activation-form';

type Props = { params: Promise<{ token: string }> };

export const metadata = { title: 'Ativar conta' };

export default async function InviteActivationPage({ params }: Props) {
  const { token } = await params;
  const invite = await loadInviteForActivation(token);

  if (!invite) {
    return (
      <main className="flex min-h-svh items-center justify-center bg-slate-50 p-6">
        <div className="w-full max-w-md space-y-3 rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-sm">
          <h1 className="text-xl font-black uppercase tracking-tight text-slate-900">
            Convite indisponível
          </h1>
          <p className="text-sm text-slate-500">
            Este link de ativação não existe, já foi utilizado ou expirou. Solicite um novo
            convite à coordenação da sua unidade.
          </p>
          <a
            href="/login"
            className="inline-block pt-2 text-xs font-bold uppercase tracking-widest text-[#004AAD] underline underline-offset-4"
          >
            Ir para o login
          </a>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-svh items-center justify-center bg-slate-50 p-6">
      <div className="w-full max-w-md overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="bg-[#004AAD] px-10 py-8 text-white">
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/50">
            Ativação de Conta
          </p>
          <h1 className="mt-1 text-2xl font-black uppercase italic tracking-tight">
            Bem-vindo(a) à rede
          </h1>
          {invite.unitName && (
            <p className="mt-2 text-xs font-medium text-white/70">
              Você foi pré-cadastrado(a) para atuar em{' '}
              <strong className="text-[#00D094]">{invite.unitName}</strong>.
            </p>
          )}
        </div>

        <div className="p-10">
          <ActivationForm
            token={invite.token}
            fullName={invite.profile.fullName ?? ''}
            cpf={invite.profile.cpf ?? ''}
            email={invite.profile.email}
          />
        </div>
      </div>
    </main>
  );
}
