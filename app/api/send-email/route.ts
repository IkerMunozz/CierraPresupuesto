import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ message: 'No autorizado' }, { status: 401 });

  try {
    const { quoteId, clientEmail, companyName, pdfBase64 } = await req.json();

    if (!clientEmail) {
      return NextResponse.json({ message: 'Email del cliente es obligatorio' }, { status: 400 });
    }

    const { data, error } = await resend.emails.send({
      from: 'CierraPresupuesto <onboarding@resend.dev>', // Nota: En prod usar dominio verificado
      to: clientEmail,
      subject: `Presupuesto de ${companyName} - #PRE-${quoteId}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
          <h2 style="color: #333;">Hola,</h2>
          <p style="color: #555; line-height: 1.6;">
            Te adjuntamos el presupuesto solicitado por <strong>${companyName}</strong>. 
            Puedes revisarlo en el archivo PDF adjunto a este correo.
          </p>
          <p style="color: #555; line-height: 1.6;">
            Si tienes cualquier duda, puedes responder directamente a este email.
          </p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
          <p style="font-size: 12px; color: #999;">
            Enviado a través de CierraPresupuesto.
          </p>
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
      console.error('Error Resend:', error);
      return NextResponse.json({ message: 'Error al enviar el email' }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Error API Send:', error);
    return NextResponse.json({ message: 'Error interno' }, { status: 500 });
  }
}
