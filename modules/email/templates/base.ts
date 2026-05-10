/**
 * Layout base compartilhado por todos os templates.
 * HTML inline-styled — compatível com Gmail, Outlook, Apple Mail, Yahoo.
 *
 * Por que inline styles?
 *   - A maioria dos clientes de e-mail ignora <style> externas e <head>.
 *   - Inline é o único padrão que funciona universalmente.
 *   - Sem bundler, sem compilação, sem dependências de runtime.
 */

export type BaseLayoutOptions = {
  previewText?: string;
  content: string;
  year?: number;
};

export function emailLayout({ previewText = '', content, year = new Date().getFullYear() }: BaseLayoutOptions): string {
  return `<!DOCTYPE html>
<html lang="pt-BR" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <title>BOSYN</title>
  <!--[if mso]>
  <noscript>
    <xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml>
  </noscript>
  <![endif]-->
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">

  <!-- Preview text (hidden, aparece em alguns clientes como prévia) -->
  <div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">
    ${previewText}&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;
  </div>

  <!-- Wrapper -->
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;">
    <tr>
      <td align="center" style="padding:40px 16px;">

        <!-- Card -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background-color:#ffffff;border-radius:8px;box-shadow:0 1px 3px rgba(0,0,0,0.08);">

          <!-- Header -->
          <tr>
            <td align="center" style="padding:32px 40px 24px;border-bottom:1px solid #e4e4e7;">
              <span style="font-size:22px;font-weight:700;color:#18181b;letter-spacing:-0.5px;">BOSYN</span>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding:32px 40px;">
              ${content}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="padding:24px 40px 32px;border-top:1px solid #e4e4e7;">
              <p style="margin:0;font-size:12px;color:#a1a1aa;line-height:1.6;">
                © ${year} BOSYN. Todos os direitos reservados.<br />
                Este e-mail foi enviado automaticamente. Não responda diretamente.
              </p>
            </td>
          </tr>

        </table>
        <!-- /Card -->

      </td>
    </tr>
  </table>
  <!-- /Wrapper -->

</body>
</html>`;
}

/** Botão primário reutilizável. */
export function emailButton(label: string, url: string): string {
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0;">
      <tr>
        <td align="center" style="border-radius:6px;background-color:#18181b;">
          <a href="${url}" target="_blank"
             style="display:inline-block;padding:12px 28px;font-size:14px;font-weight:600;
                    color:#ffffff;text-decoration:none;border-radius:6px;letter-spacing:0.2px;">
            ${label}
          </a>
        </td>
      </tr>
    </table>`;
}

/** Caixa de aviso/nota informativa. */
export function emailNote(text: string): string {
  return `
    <div style="background-color:#f4f4f5;border-radius:6px;padding:14px 16px;margin:20px 0;">
      <p style="margin:0;font-size:13px;color:#71717a;line-height:1.6;">${text}</p>
    </div>`;
}
