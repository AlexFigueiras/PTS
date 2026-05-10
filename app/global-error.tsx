'use client';

import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';

/**
 * Boundary final do App Router. Substitui o RootLayout em erros não-tratados
 * que escapam de qualquer `error.tsx` aninhado. Captura no Sentry e expõe
 * um botão de retry.
 *
 * Como é um Client Component que substitui <html>/<body>, NÃO depende de
 * estilos do layout — UI deliberadamente mínima.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="pt-BR">
      <body
        style={{
          fontFamily: 'system-ui, sans-serif',
          margin: 0,
          minHeight: '100svh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#0a0a0a',
          color: '#ededed',
          padding: '1.5rem',
        }}
      >
        <main style={{ maxWidth: '32rem', textAlign: 'center' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '0.75rem' }}>
            Algo deu errado
          </h1>
          <p style={{ opacity: 0.7, marginBottom: '1.5rem' }}>
            Registramos o erro automaticamente. Você pode tentar de novo.
          </p>
          {error.digest ? (
            <p style={{ opacity: 0.4, fontSize: '0.75rem', marginBottom: '1.5rem' }}>
              digest: <code>{error.digest}</code>
            </p>
          ) : null}
          <button
            type="button"
            onClick={() => reset()}
            style={{
              padding: '0.625rem 1.25rem',
              borderRadius: '0.375rem',
              border: '1px solid #404040',
              background: '#171717',
              color: 'inherit',
              cursor: 'pointer',
              fontSize: '0.875rem',
            }}
          >
            Tentar novamente
          </button>
        </main>
      </body>
    </html>
  );
}
