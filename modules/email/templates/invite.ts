import { emailLayout, emailButton, emailNote } from './base';

export type InviteEmailInput = {
  to: string;
  tenantName: string;
  inviterName: string;
  role: string;
  inviteUrl: string;
  expiresInDays?: number;
};

export function inviteEmailTemplate({
  tenantName,
  inviterName,
  role,
  inviteUrl,
  expiresInDays = 7,
}: InviteEmailInput): { subject: string; html: string; text: string } {
  const subject = `Convite para ${tenantName}`;

  const content = `
    <p style="margin:0 0 8px;font-size:16px;font-weight:600;color:#18181b;">Você foi convidado</p>
    <p style="margin:0 0 24px;font-size:14px;color:#52525b;line-height:1.6;">
      <strong>${inviterName}</strong> convidou você para participar de <strong>${tenantName}</strong>
      como <strong>${role}</strong>.
    </p>
    ${emailButton('Aceitar convite', inviteUrl)}
    ${emailNote(`Este convite expira em ${expiresInDays} dia${expiresInDays !== 1 ? 's' : ''}. Se você não esperava este e-mail, pode ignorá-lo com segurança.`)}
  `;

  const html = emailLayout({ previewText: `Convite para ${tenantName}`, content });

  const text = [
    `Você foi convidado para ${tenantName}`,
    '',
    `${inviterName} convidou você para participar de ${tenantName} como ${role}.`,
    '',
    `Aceitar convite: ${inviteUrl}`,
    '',
    `Este convite expira em ${expiresInDays} dia(s).`,
  ].join('\n');

  return { subject, html, text };
}
