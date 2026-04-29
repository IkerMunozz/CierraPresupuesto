// lib/automations/actions.ts
import { db } from '@/lib/db';
import { eq } from 'drizzle-orm';
import { emitEvent, QUOTE_EVENT_TYPES } from '@/lib/db/events';
import { quotes, users } from '@/lib/db/schema';
import { sendTrackedEmail, SendEmailParams } from '@/lib/email';

export async function executeAction(
  action: { type: string; params: Record<string, any> },
  context: { quoteId: string; userId: string; event: any; db: any }
): Promise<boolean> {
  try {
    switch (action.type) {
      case 'emit_event':
        await emitEvent(action.params.eventType, context.quoteId, action.params.metadata);
        return true;

      case 'send_email':
        return await sendEmailAction(context, action.params);

      case 'create_notification':
        return await createNotification(context, action.params);

      case 'update_quote':
        return await updateQuoteAction(context, action.params);

      default:
        console.warn(`Unknown action type: ${action.type}`);
        return false;
    }
  } catch (error) {
    console.error(`Error executing action ${action.type}:`, error);
    return false;
  }
}

async function sendEmailAction(
  context: { quoteId: string; userId: string },
  params: Record<string, any>
): Promise<boolean> {
  try {
    const quoteData = await db
      .select({
        title: quotes.title,
        clientName: quotes.clientName,
        userEmail: users.email,
        userId: quotes.userId,
      })
      .from(quotes)
      .leftJoin(users, eq(quotes.userId, users.id))
      .where(eq(quotes.id, context.quoteId))
      .limit(1);

    if (!quoteData[0]) return false;

    const emailParams: SendEmailParams = {
      to: params.to || quoteData[0].userEmail || '',
      subject: params.subject || `Presupuesto: ${quoteData[0].title}`,
      html: params.body || params.html || `<p>Hola ${quoteData[0].clientName}, aquí tienes tu presupuesto.</p>`,
      text: params.text,
      quoteId: context.quoteId,
      eventType: params.eventType || 'QUOTE_SENT',
      from: params.from,
      replyTo: params.replyTo,
    };

    const result = await sendTrackedEmail(emailParams);
    return result.success;
  } catch (error) {
    console.error('Error sending tracked email:', error);
    return false;
  }
}

async function createNotification(
  context: { quoteId: string; userId: string },
  params: Record<string, any>
): Promise<boolean> {
  console.log('Notification:', {
    userId: context.userId,
    quoteId: context.quoteId,
    message: params.message,
    type: params.type || 'info',
  });
  return true;
}

async function updateQuoteAction(
  context: { quoteId: string },
  params: Record<string, any>
): Promise<boolean> {
  if (params.status) {
    await db
      .update(quotes)
      .set({ status: params.status, updatedAt: new Date() })
      .where(eq(quotes.id, context.quoteId));
  }
  return true;
}
