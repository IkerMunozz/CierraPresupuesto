import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { emitQuoteSent } from '@/lib/db/events';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: Request) {
  try {
    const { clientEmail, companyName, pdfBase64, quoteId, clientName, quoteTitle } = await req.json();

    if (!process.env.RESEND_API_KEY) {
      return NextResponse.json({ message: 'Resend API Key no configurada' }, { status: 500 });
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const viewUrl = `${baseUrl}/es/q/${quoteId}`;

    const clientFirstName = clientName ? clientName.split(' ')[0] : '';

    const { data, error } = await resend.emails.send({
      from: `${companyName} <onboarding@resend.dev>`,
      to: clientEmail,
      subject: quoteTitle || `Presupuesto de ${companyName}`,
      html: `
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f1f5f9; padding: 40px 0;">
          <tr>
            <td align="center">
              <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">

                <tr>
                  <td style="background-color: #0f172a; padding: 32px 40px; text-align: center;">
                    <img src="https://via.placeholder.com/140x40/0f172a/ffffff?text=${encodeURIComponent(companyName)}" alt="${companyName}" style="max-width: 140px; height: auto;" />
                  </td>
                </tr>

                <tr>
                  <td style="padding: 40px;">
                    <h1 style="margin: 0 0 8px 0; font-size: 22px; color: #0f172a; font-weight: 700;">Hola${clientFirstName ? ` ${clientFirstName}` : ''},</h1>
                    <p style="margin: 0 0 24px 0; font-size: 15px; color: #475569; line-height: 1.6;">
                      Adjunto encontrarás el presupuesto que hemos preparado para ti${clientFirstName ? '' : ''}. Está personalizado según lo que conversamos.
                    </p>

                    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; margin-bottom: 24px;">
                      <tr>
                        <td style="padding: 20px 24px;">
                          <p style="margin: 0 0 12px 0; font-size: 13px; color: #64748b; font-weight: 500; text-transform: uppercase; letter-spacing: 0.5px;">Tu presupuesto</p>
                          <p style="margin: 0; font-size: 16px; color: #0f172a; font-weight: 600;">${quoteTitle || 'Presupuesto personalizado'}</p>
                        </td>
                      </tr>
                    </table>

                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td align="center" style="padding-bottom: 24px;">
                          <a href="${viewUrl}" style="display: inline-block; background-color: #0f172a; color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-size: 15px; font-weight: 600;">
                            Ver y aceptar presupuesto →
                          </a>
                        </td>
                      </tr>
                    </table>

                    <p style="margin: 0; font-size: 14px; color: #64748b; line-height: 1.6;">
                      Si tienes cualquier duda o necesitas ajustar algo, no dudes en contactarnos. Estaremos encantados de ayudarte.
                    </p>
                  </td>
                </tr>

                <tr>
                  <td style="background-color: #f8fafc; padding: 24px 40px; border-top: 1px solid #e2e8f0; text-align: center;">
                    <p style="margin: 0 0 4px 0; font-size: 13px; color: #94a3b8;">
                      Enviado por <strong style="color: #475569;">${companyName}</strong>
                    </p>
                    <p style="margin: 0; font-size: 11px; color: #cbd5e1;">
                      Presupuesto generado con VendeMás
                    </p>
                  </td>
                </tr>

              </table>
            </td>
          </tr>
        </table>
      `,
      attachments: [
        {
          filename: `Presupuesto_${clientName || quoteId.substring(0, 8)}.pdf`,
          content: pdfBase64,
        },
      ],
    });

    if (error) {
      return NextResponse.json({ message: 'Error de Resend', error }, { status: 400 });
    }

    if (quoteId) {
      try {
        await emitQuoteSent(quoteId, {
          clientEmail,
          companyName,
        });
      } catch (e) {
        console.error('Error emitiendo evento QUOTE_SENT:', e);
      }
    }

    return NextResponse.json({ message: 'Email enviado', data });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
