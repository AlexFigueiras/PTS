import { emailButton, emailLayout, emailNote } from './base';

export type NotificationEmailVars = {
  name: string;
  title: string;
  body: string;
  ctaLabel?: string;
  ctaUrl?: string;
  note?: string;
};

export function notificationEmailTemplate({
  name,
  title,
  body,
  ctaLabel,
  ctaUrl,
  note,
}: NotificationEmailVars): {
  subject: string;
  html: string;
  text: string;
} {
  const subject = `${title} — BOSYN`;

  const html = emailLayout({
    previewText: body.slice(0, 100),
    content: `
      <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#18181b;line-height:1.3;">
        ${title}
      </h1>
      <p style="margin:0 0 20px;font-size:15px;color:#52525b;line-height:1.7;">
        Olá, <strong>${name}</strong>. ${body}
      </p>
      ${ctaLabel && ctaUrl ? emailButton(ctaLabel, ctaUrl) : ''}
      ${note ? emailNote(note) : ''}
    `,
  });

  const text = `
${title} — BOSYN

Olá, ${name}.

${body}
${ctaLabel && ctaUrl ? `\n${ctaLabel}: ${ctaUrl}` : ''}
${note ? `\nNota: ${note}` : ''}

BOSYN — suporte@mail.bosyn.com.br
  `.trim();

  return { subject, html, text };
}
