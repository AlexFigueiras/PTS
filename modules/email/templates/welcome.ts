import { emailButton, emailLayout, emailNote } from './base';

export type WelcomeEmailVars = {
  name: string;
  loginUrl: string;
};

export function welcomeEmailTemplate({ name, loginUrl }: WelcomeEmailVars): {
  subject: string;
  html: string;
  text: string;
} {
  const subject = 'Bem-vindo ao BOSYN!';

  const html = emailLayout({
    previewText: `Olá ${name}, sua conta foi criada com sucesso.`,
    content: `
      <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#18181b;line-height:1.3;">
        Bem-vindo, ${name}!
      </h1>
      <p style="margin:0 0 20px;font-size:15px;color:#52525b;line-height:1.7;">
        Sua conta foi criada com sucesso. Acesse a plataforma e comece a usar todos os recursos disponíveis para a sua equipe.
      </p>
      ${emailButton('Acessar minha conta', loginUrl)}
      ${emailNote(
        'Se você não criou esta conta, ignore este e-mail ou entre em contato com o suporte.',
      )}
    `,
  });

  const text = `
Bem-vindo ao BOSYN, ${name}!

Sua conta foi criada com sucesso. Acesse a plataforma pelo link abaixo:

${loginUrl}

Se você não criou esta conta, ignore este e-mail.

BOSYN — suporte@mail.bosyn.com.br
  `.trim();

  return { subject, html, text };
}
