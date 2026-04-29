// app/api/webhooks/email/route.ts
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { emailTracking } from '@/lib/db/schema';
import { emitQuoteViewed } from '@/lib/db/events';
import { eq } from 'drizzle-orm';

// Tipos de eventos de Resend
type ResendEventType = 'email.opened' | 'email.clicked' | 'email.delivered' | 'email.bounced' | 'email.complained';

interface ResendWebhookPayload {
  type: ResendEventType;
  data: {
    email_id: string;
    recipient: string;
    clicked?: {
      link: string;
    };
  };
  created_at: string;
}

export async function POST(request: Request) {
  try {
    const payload: ResendWebhookPayload = await request.json();
    const { type, data, created_at } = payload;

    if (!data?.email_id) {
      return NextResponse.json({ error: 'Missing email_id' }, { status: 400 });
    }

    // Buscar el tracking asociado a este email de Resend
    const tracking = await db
      .select({ quoteId: emailTracking.quoteId })
      .from(emailTracking)
      .where(eq(emailTracking.emailId, data.email_id))
      .limit(1);

    if (!tracking[0]) {
      console.warn(`No tracking found for email_id: ${data.email_id}`);
      return NextResponse.json({ status: 'ignored' }, { status: 200 });
    }

    const { quoteId } = tracking[0];
    const eventTime = new Date(created_at);

    // Procesar según el tipo de evento
    switch (type) {
      case 'email.opened':
        // Actualizar tracking
        await db
          .update(emailTracking)
          .set({ openedAt: eventTime })
          .where(eq(emailTracking.emailId, data.email_id));

        // Emitir evento QUOTE_VIEWED
        await emitQuoteViewed(quoteId, {
          source: 'email_open',
          emailId: data.email_id,
          openedAt: created_at,
        });
        break;

      case 'email.clicked':
        // Actualizar tracking
        await db
          .update(emailTracking)
          .set({ clickedAt: eventTime })
          .where(eq(emailTracking.emailId, data.email_id));

        // Emitir evento QUOTE_VIEWED (click implica que abrió el email)
        await emitQuoteViewed(quoteId, {
          source: 'email_click',
          emailId: data.email_id,
          clickedAt: created_at,
          linkClicked: data.clicked?.link,
        });
        break;

      case 'email.delivered':
        console.log(`Email delivered: ${data.email_id}`);
        break;

      case 'email.bounced':
        console.warn(`Email bounced: ${data.email_id}`);
        break;

      default:
        console.warn(`Unhandled event type: ${type}`);
    }

    return NextResponse.json({ status: 'success' }, { status: 200 });
  } catch (error) {
    console.error('Webhook error:', error);
    // Siempre devolver 200 a Resend para evitar reintentos
    return NextResponse.json({ status: 'error' }, { status: 200 });
  }
}
