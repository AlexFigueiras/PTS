/**
 * Interface de domínio para envio de e-mails — independente do vendor.
 * Services consomem EmailProvider, NUNCA o SDK do Resend/SendGrid/etc. direto.
 *
 * Preparado para:
 *   - troca de provedor (Postmark, Mailgun, SES) sem alterar domínio
 *   - múltiplos provedores com fallback (futuro)
 *   - preview/sandbox em local sem disparar e-mails reais
 */

export type SendEmailOptions = {
  to: string | string[];
  subject: string;
  html: string;
  /** Versão texto plano — acessibilidade e clientes que bloqueiam HTML. */
  text: string;
  /** Remetente. Se omitido, usa o padrão configurado no provider. */
  from?: string;
  /** Endereço de reply-to. Útil para e-mails de suporte/notificação. */
  replyTo?: string;
};

export type SendEmailResult = {
  id: string;
};

export interface EmailProvider {
  sendEmail(options: SendEmailOptions): Promise<SendEmailResult>;
}
