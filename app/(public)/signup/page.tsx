import Link from 'next/link';
import { SignupForm } from './signup-form';

export const metadata = { title: 'Criar conta' };

export default function SignupPage() {
  return (
    <main className="mx-auto flex min-h-svh max-w-sm flex-col justify-center gap-6 p-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Criar conta</h1>
        <p className="text-muted-foreground text-sm">
          Sua clínica será criada automaticamente.
        </p>
      </div>
      <SignupForm />
      <p className="text-muted-foreground text-center text-sm">
        Já tem conta?{' '}
        <Link href="/login" className="text-foreground font-medium underline-offset-4 hover:underline">
          Entrar
        </Link>
      </p>
    </main>
  );
}
