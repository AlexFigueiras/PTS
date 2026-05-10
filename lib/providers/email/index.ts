/**
 * Fachada unificada do provider de e-mail.
 *
 * - local        → noopProvider (log no console, zero disparos reais)
 * - staging/prod → Resend
 *
 * NÃO importar `resendProvider` diretamente em código de domínio.
 * Sempre usar `getEmailProvider()` para manter o desacoplamento.
 */
import { isLocal } from '@/lib/app-env';

import { resendProvider } from './resend';
import type { EmailProvider, SendEmailOptions, SendEmailResult } from './types';

const noopProvider: EmailProvider = {
  async sendEmail(options: SendEmailOptions): Promise<SendEmailResult> {
    console.log('[EmailProvider/noop] E-mail interceptado em ambiente local:', {
      to: options.to,
      subject: options.subject,
      from: options.from,
    });
    return { id: `noop-${Date.now()}` };
  },
};

const provider: EmailProvider = isLocal ? noopProvider : resendProvider;

export function getEmailProvider(): EmailProvider {
  return provider;
}

export type { EmailProvider, SendEmailOptions, SendEmailResult } from './types';
