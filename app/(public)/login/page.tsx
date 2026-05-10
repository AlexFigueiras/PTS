import { Button } from '@/components/ui/button';

export const metadata = { title: 'Login' };

export default function LoginPage() {
  return (
    <main className="mx-auto flex min-h-svh max-w-sm flex-col justify-center gap-6 p-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Entrar</h1>
        <p className="text-muted-foreground text-sm">
          Placeholder — formulário e Server Action de login chegam na Fase 5.
        </p>
      </div>
      <form className="space-y-3">
        <input
          name="email"
          type="email"
          placeholder="email@clinica.com"
          className="border-input bg-background w-full rounded-md border px-3 py-2 text-sm"
          disabled
        />
        <input
          name="password"
          type="password"
          placeholder="••••••••"
          className="border-input bg-background w-full rounded-md border px-3 py-2 text-sm"
          disabled
        />
        <Button type="submit" disabled className="w-full">
          Entrar
        </Button>
      </form>
    </main>
  );
}
