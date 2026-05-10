import Link from 'next/link';

export const metadata = { title: 'Sem permissão' };

export default function UnauthorizedPage() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 p-6 text-center">
      <div className="space-y-2">
        <p className="text-4xl font-bold">403</p>
        <h1 className="text-xl font-semibold tracking-tight">Sem permissão</h1>
        <p className="text-muted-foreground max-w-sm text-sm">
          Você não tem permissão para acessar este recurso. Entre em contato com o administrador da
          clínica se acredita que isso é um erro.
        </p>
      </div>
      <Link
        href="/dashboard"
        className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-md px-4 py-2 text-sm font-medium transition-colors"
      >
        Voltar ao início
      </Link>
    </div>
  );
}
