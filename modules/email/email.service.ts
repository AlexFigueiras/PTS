/**
 * EmailService — disparos transacionais da aplicação.
 *
 * Não estende BaseService propositalmente: e-mails de sistema (welcome,
 * password reset) acontecem antes ou fora de um contexto de tenant.
 * Para e-mails com contexto de tenant, passe o ctx como parâmetro nos métodos.
 *
 * Segurança:
 *   - Nunca envia e-mail fora do servidor (server-only imports).
 *   - Em local: noop (log no console, zero disparos reais).
 *   - Erros de envio são propagados ao caller — não silenciados.
 */
import { getLogger } from '@/lib/logger';
import { getEmailProvider } from '@/lib/providers/email';

import { passwordResetEmailTemplate } from './templates/password-reset';
import { notificationEmailTemplate } from './templates/notification';
import { welcomeEmailTemplate } from './templates/welcome';
import { inviteEmailTemplate, type InviteEmailInput } from './templates/invite';

export type WelcomeEmailInput = {
  to: string;
  name: string;
  loginUrl: string;
};

export type PasswordResetEmailInput = {
  to: string;
  name: string;
  resetUrl: string;
  expiresInMinutes?: number;
};

export type NotificationEmailInput = {
  to: string | string[];
  name: string;
  title: string;
  body: string;
  ctaLabel?: string;
  ctaUrl?: string;
  note?: string;
  replyTo?: string;
};

export class EmailService {
  private readonly provider = getEmailProvider();
  private readonly log = getLogger({ service: 'EmailService' });

  async sendWelcomeEmail(input: WelcomeEmailInput): Promise<void> {
    const { subject, html, text } = welcomeEmailTemplate({
      name: input.name,
      loginUrl: input.loginUrl,
    });

    const { id } = await this.provider.sendEmail({ to: input.to, subject, html, text });
    this.log.info({ emailId: id, to: input.to, template: 'welcome' }, 'e-mail de boas-vindas enviado');
  }

  async sendPasswordResetEmail(input: PasswordResetEmailInput): Promise<void> {
    const { subject, html, text } = passwordResetEmailTemplate({
      name: input.name,
      resetUrl: input.resetUrl,
      expiresInMinutes: input.expiresInMinutes,
    });

    const { id } = await this.provider.sendEmail({ to: input.to, subject, html, text });
    this.log.info({ emailId: id, to: input.to, template: 'password-reset' }, 'e-mail de reset de senha enviado');
  }

  async sendInviteEmail(input: InviteEmailInput): Promise<void> {
    const { subject, html, text } = inviteEmailTemplate(input);
    const { id } = await this.provider.sendEmail({ to: input.to, subject, html, text });
    this.log.info({ emailId: id, to: input.to, template: 'invite' }, 'e-mail de convite enviado');
  }

  async sendNotificationEmail(input: NotificationEmailInput): Promise<void> {
    const { subject, html, text } = notificationEmailTemplate({
      name: input.name,
      title: input.title,
      body: input.body,
      ctaLabel: input.ctaLabel,
      ctaUrl: input.ctaUrl,
      note: input.note,
    });

    const { id } = await this.provider.sendEmail({
      to: input.to,
      subject,
      html,
      text,
      replyTo: input.replyTo,
    });

    this.log.info(
      { emailId: id, to: input.to, template: 'notification', title: input.title },
      'e-mail de notificação enviado',
    );
  }
}
