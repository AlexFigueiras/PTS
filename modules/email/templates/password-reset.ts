import { emailButton, emailLayout, emailNote } from './base';

export type PasswordResetEmailVars = {
  name: string;
  resetUrl: string;
  expiresInMinutes?: number;
};

export function passwordResetEmailTemplate({
  name,
  resetUrl,
  expiresInMinutes = 60,
}: PasswordResetEmailVars): {
  subject: string;
  html: string;
  text: string;
} {
  const subject = 'Redefinição de senha — BOSYN';

  const html = emailLayout({
    previewText: 'Recebemos uma solicitação para redefinir a senha da sua conta.',
    content: `
      <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#18181b;line-height:1.3;">
        Redefinição de senha
      </h1>
      <p style="margin:0 0 20px;font-size:15px;color:#52525b;line-height:1.7;">
        Olá, <strong>${name}</strong>. Recebemos uma solicitação para redefinir a senha da sua conta.
        Clique no botão abaixo para criar uma nova senha.
      </p>
      ${emailButton('Redefinir minha senha', resetUrl)}
      ${emailNote(
        `Este link expira em <strong>${expiresInMinutes} minutos</strong>. ` +
          'Se você não solicitou a redefinição de senha, ignore este e-mail — sua senha permanece inalterada.',
      )}
      <p style="margin:16px 0 0;font-size:13px;color:#a1a1aa;line-height:1.6;">
        Por segurança, nunca compartilhe este link com ninguém.
      </p>
    `,
  });

  const text = `
Redefinição de senha — BOSYN

Olá, ${name}.

Recebemos uma solicitação para redefinir a senha da sua conta.
Acesse o link abaixo para criar uma nova senha (válido por ${expiresInMinutes} minutos):

${resetUrl}

Se você não solicitou a redefinição, ignore este e-mail. Sua senha permanece inalterada.

Por segurança, nunca compartilhe este link com ninguém.

BOSYN — suporte@mail.bosyn.com.br
  `.trim();

  return { subject, html, text };
}
