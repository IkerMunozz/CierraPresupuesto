import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { emitQuoteSent } from '@/lib/db/events';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: Request) {
  try {
    const { clientEmail, companyName, pdfBase64, quoteId } = await req.json();

    if (!process.env.RESEND_API_KEY) {
      return NextResponse.json({ message: 'Resend API Key no configurada' }, { status: 500 });
    }

    const { data, error } = await resend.emails.send({
      from: 'VendeMás AI <onboarding@resend.dev>', // En prod usar dominio verificado
      to: clientEmail,
      subject: `Presupuesto #PRE-${quoteId.substring(0, 8)} de ${companyName}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #334155;">
          <h2 style="color: #0f172a;">Hola,</h2>
          <p>Adjunto encontrarás el presupuesto que hemos preparado para ti desde <strong>${companyName}</strong>.</p>
          <div style="margin: 30px 0; padding: 20px; background-color: #f8fafc; border-radius: 8px; text-align: center;">
            <p style="margin: 0 0 15px 0; font-size: 16px; color: #0f172a;">Puedes ver el presupuesto online y aceptarlo con un clic:</p>
            <a href="${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/es/q/${quoteId}" 
               style="display: inline-block; background-color: #0f172a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
              Ver y aceptar presupuesto
            </a>
          </div>
          <p>Si tienes cualquier duda, no dudes en contactarnos.</p>
          <br />
          <p style="font-size: 14px; color: #64748b;">Atentamente,<br />El equipo de ${companyName}</p>
          <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 30px 0;" />
          <p style="font-size: 12px; color: #94a3b8; text-align: center;">Enviado a través de VendeMás AI</p>
        </div>
      `,
      attachments: [
        {
          filename: `Presupuesto_${quoteId}.pdf`,
          content: pdfBase64,
        },
      ],
    });

    if (error) {
      return NextResponse.json({ message: 'Error de Resend', error }, { status: 400 });
    }

    // Emitir evento de presupuesto enviado
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
