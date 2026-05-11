import Link from 'next/link';
import { LoginForm } from './login-form';

export const metadata = { title: 'Login' };

export default async function LoginPage(props: {
  searchParams: Promise<{ redirect?: string }>;
}) {
  const searchParams = await props.searchParams;
  const redirectTo = searchParams.redirect ?? '/dashboard';

  return (
    <main className="mx-auto flex min-h-svh max-w-sm flex-col justify-center gap-6 p-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Entrar</h1>
        <p className="text-muted-foreground text-sm">Acesse sua conta para continuar.</p>
      </div>
      <LoginForm redirectTo={redirectTo} />
      <p className="text-muted-foreground text-center text-sm">
        Ainda não tem conta?{' '}
        <Link
          href="/signup"
          className="text-foreground font-medium underline-offset-4 hover:underline"
        >
          Criar conta
        </Link>
      </p>
    </main>
  );
}
