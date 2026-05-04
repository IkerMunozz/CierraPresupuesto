// lib/services/followUpService.ts
import { db } from '@/lib/db';
import { quotes, quoteEvents } from '@/lib/db/schema';
import { eq, and, desc, gt } from 'drizzle-orm';
import { QUOTE_EVENT_TYPES } from '@/lib/db/eventTypes';
import { buildSalesContext, SalesContext } from './salesContext';
import { decideFollowUp, FollowUpDecision } from './followUpDecision';
import { generateFollowUpEmail as generateEmail, GeneratedEmail } from './followUpEmailGenerator';

export interface FollowUpDraft {
  subject: string;
  html: string;
  text: string;
  quoteId: string;
  tone: string;
  daysSinceSent: number;
}

export interface FollowUpResult {
  success: boolean;
  draft?: FollowUpDraft;
  error?: string;
}

export interface FollowUpTarget {
  quoteId: string;
  title: string;
  clientName: string;
  clientEmail: string | null;
  decision: FollowUpDecision;
  context: SalesContext;
}

export async function detectQuotesNeedingFollowUp(userId?: string): Promise<FollowUpTarget[]> {
  const results: FollowUpTarget[] = [];
  const seen = new Set<string>();

  const sentEvents = await db
    .select({ quoteId: quoteEvents.quoteId, sentAt: quoteEvents.createdAt })
    .from(quoteEvents)
    .where(eq(quoteEvents.type, QUOTE_EVENT_TYPES.SENT))
    .orderBy(desc(quoteEvents.createdAt));

  for (const event of sentEvents) {
    if (seen.has(event.quoteId)) continue;

    const laterEvents = await db
      .select({ type: quoteEvents.type })
      .from(quoteEvents)
      .where(and(eq(quoteEvents.quoteId, event.quoteId), gt(quoteEvents.createdAt, event.sentAt)));

    if (laterEvents.some(e => e.type === QUOTE_EVENT_TYPES.ACCEPTED || e.type === QUOTE_EVENT_TYPES.REJECTED)) continue;

    const quote = await db
      .select({ title: quotes.title, clientName: quotes.clientName, clientEmail: quotes.clientEmail, userId: quotes.userId })
      .from(quotes)
      .where(eq(quotes.id, event.quoteId))
      .limit(1);

    if (!quote[0] || (userId && quote[0].userId !== userId)) continue;

    seen.add(event.quoteId);

    const context = await buildSalesContext(event.quoteId);
    if (!context) continue;

    const decision = decideFollowUp(context);
    if (decision.action.type !== 'send_email') continue;

    results.push({
      quoteId: event.quoteId,
      title: quote[0].title || 'Sin título',
      clientName: quote[0].clientName || 'Cliente',
      clientEmail: quote[0].clientEmail || null,
      decision,
      context,
    });
  }

  return results.sort((a, b) => {
    const order = { critical: 4, high: 3, medium: 2, low: 1 };
    return order[b.decision.priority] - order[a.decision.priority];
  });
}

export async function generateFollowUpEmail(
  quoteId: string,
  decision: FollowUpDecision,
  context: SalesContext
): Promise<FollowUpResult> {
  if (decision.action.type !== 'send_email') {
    return { success: false, error: `Acción no es email: ${decision.action.type}` };
  }

  try {
    const generated = await generateEmail(context, decision);
    const html = wrapInHtml(generated.body);

    return {
      success: true,
      draft: {
        subject: generated.subject,
        html,
        text: generated.body,
        quoteId,
        tone: decision.action.tone,
        daysSinceSent: context.daysSinceSent,
      },
    };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Error desconocido' };
  }
}

function wrapInHtml(body: string): string {
  return `<div style="font-family: system-ui, -apple-system, sans-serif; line-height: 1.6; color: #1e293b;">
    <p>${body.replace(/\n/g, '<br/>')}</p>
    <p style="margin-top: 24px; color: #64748b;">Saludos cordiales</p>
  </div>`;
}

export async function sendFollowUp(
  quoteId: string,
  draft: FollowUpDraft,
  recipientEmail: string,
  options?: { fromEmail?: string; manualReview?: boolean }
): Promise<{ success: boolean; emailId?: string; error?: string }> {
  try {
    const { sendTrackedEmail } = await import('@/lib/email');

    const result = await sendTrackedEmail({
      to: recipientEmail,
      subject: draft.subject,
      html: draft.html,
      text: draft.text,
      quoteId,
      from: options?.fromEmail,
      eventType: QUOTE_EVENT_TYPES.FOLLOWUP_SENT,
    });

    if (result.success && result.emailId) {
      const { emitEvent } = await import('@/lib/db/events');
      await emitEvent(QUOTE_EVENT_TYPES.FOLLOWUP_SENT, quoteId, {
        emailId: result.emailId,
        daysSinceSent: draft.daysSinceSent,
        tone: draft.tone,
        subject: draft.subject,
        body: draft.text,
        manualReview: options?.manualReview || false,
      });
    }

    return { success: result.success, emailId: result.emailId, error: result.error };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Error desconocido' };
  }
}

export async function processFollowUpQueue(userId?: string): Promise<{
  sent: number;
  skipped: number;
  errors: { quoteId: string; error: string }[];
}> {
  const targets = await detectQuotesNeedingFollowUp(userId);
  let sent = 0;
  let skipped = 0;
  const errors: { quoteId: string; error: string }[] = [];

  for (const target of targets) {
    if (!target.clientEmail) {
      skipped++;
      continue;
    }

    const result = await generateFollowUpEmail(target.quoteId, target.decision, target.context);
    if (!result.success || !result.draft) {
      errors.push({ quoteId: target.quoteId, error: result.error || 'Sin borrador' });
      continue;
    }

    const sendResult = await sendFollowUp(target.quoteId, result.draft, target.clientEmail);
    if (sendResult.success) {
      sent++;
    } else {
      errors.push({ quoteId: target.quoteId, error: sendResult.error || 'Fallo al enviar' });
    }
  }

  return { sent, skipped, errors };
}
