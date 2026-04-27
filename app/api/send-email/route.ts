import { NextResponse } from 'next/server';
import { Resend } from 'resend';

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
          <p>Adjunto encontrarás el presupuesto <strong>#PRE-${quoteId.substring(0, 8)}</strong> que hemos preparado para ti desde <strong>${companyName}</strong>.</p>
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

    return NextResponse.json({ message: 'Email enviado', data });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
