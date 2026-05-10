/**
 * Implementação Resend do EmailProvider.
 *
 * NÃO usar fora deste módulo — consumir via `getEmailProvider()` em ./index.ts.
 * Inicialização lazy: RESEND_API_KEY só é lida na primeira chamada,
 * não no boot, para não quebrar builds sem a env presente.
 */
import { Resend } from 'resend';

import type { EmailProvider, SendEmailOptions, SendEmailResult } from './types';

const DEFAULT_FROM = process.env.NEXT_PUBLIC_FROM_EMAIL ?? 'BOSYN <suporte@mail.bosyn.com.br>';

let _client: Resend | null = null;

function getClient(): Resend {
  if (!_client) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      throw new Error(
        '[EmailProvider/Resend] RESEND_API_KEY ausente. ' +
          'Defina a variável no ambiente antes de enviar e-mails.',
      );
    }
    _client = new Resend(apiKey);
  }
  return _client;
}

export const resendProvider: EmailProvider = {
  async sendEmail(options: SendEmailOptions): Promise<SendEmailResult> {
    const { to, subject, html, text, from = DEFAULT_FROM, replyTo } = options;

    const { data, error } = await getClient().emails.send({
      from,
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
      text,
      ...(replyTo ? { reply_to: replyTo } : {}),
    });

    if (error || !data) {
      throw new Error(`[EmailProvider/Resend] Falha ao enviar e-mail: ${error?.message ?? 'erro desconhecido'}`);
    }

    return { id: data.id };
  },
};
