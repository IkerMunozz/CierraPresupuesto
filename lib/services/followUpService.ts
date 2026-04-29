// lib/services/followUpService.ts
import { google } from '@ai-sdk/google';
import { generateText } from 'ai';
import { db } from '@/lib/db';
import { quotes, quoteEvents } from '@/lib/db/schema';
import { eq, and, desc, gt, lt } from 'drizzle-orm';
import { QUOTE_EVENT_TYPES } from '@/lib/db/eventTypes';

const apiKey = process.env.GOOGLE_AI_API_KEY;
const model = apiKey ? google('gemini-1.5-flash', { apiKey }) : null;

export interface FollowUpDraft {
  subject: string;
  html: string;
  text: string;
  quoteId: string;
  daysSinceSent: number;
}

export interface FollowUpResult {
  success: boolean;
  draft?: FollowUpDraft;
  error?: string;
}

/**
 * Detecta presupuestos que necesitan seguimiento
 * (enviados hace 3+ días sin aceptación)
 */
export async function detectQuotesNeedingFollowUp(userId?: string): Promise<{
  quoteId: string;
  title: string;
  clientName: string;
  clientEmail?: string;
  sentAt: Date;
  daysSinceSent: number;
}[]> {
  const now = new Date();
  const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);

  // Obtener eventos SENT de hace 3+ días
  const sentEvents = await db
    .select({
      quoteId: quoteEvents.quoteId,
      sentAt: quoteEvents.createdAt,
    })
    .from(quoteEvents)
    .where(
      and(
        eq(quoteEvents.type, QUOTE_EVENT_TYPES.SENT),
        lt(quoteEvents.createdAt, threeDaysAgo)
      )
    )
    .orderBy(desc(quoteEvents.createdAt));

  const result: any[] = [];
  const seen = new Set<string>();

  for (const event of sentEvents) {
    if (seen.has(event.quoteId)) continue;
    seen.add(event.quoteId);

    // Verificar si tiene ACCEPTED o REJECTED después del SENT
    const laterEvents = await db
      .select({ type: quoteEvents.type })
      .from(quoteEvents)
      .where(
        and(
          eq(quoteEvents.quoteId, event.quoteId),
          gt(quoteEvents.createdAt, event.sentAt)
        )
      );

    const hasFinalEvent = laterEvents.some(
      e => e.type === QUOTE_EVENT_TYPES.ACCEPTED || e.type === QUOTE_EVENT_TYPES.REJECTED
    );

    if (hasFinalEvent) continue;

    // Obtener datos del presupuesto
    const quote = await db
      .select({
        title: quotes.title,
        clientName: quotes.clientName,
        clientEmail: quotes.clientEmail,
        userId: quotes.userId,
      })
      .from(quotes)
      .where(eq(quotes.id, event.quoteId))
      .limit(1);

    if (!quote[0]) continue;
    if (userId && quote[0].userId !== userId) continue;

    const sentDate = new Date(event.sentAt);
    const daysSinceSent = Math.floor(
      (now.getTime() - sentDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    result.push({
      quoteId: event.quoteId,
      title: quote[0].title || 'Sin título',
      clientName: quote[0].clientName,
      clientEmail: quote[0].clientEmail || undefined,
      sentAt: sentDate,
      daysSinceSent,
    });
  }

  return result;
}

/**
 * Genera un email de seguimiento usando IA
 */
export async function generateFollowUpEmail(
  quoteId: string,
  options?: { tone?: 'professional' | 'soft' | 'urgent' }
): Promise<FollowUpResult> {
  try {
    if (!model) {
      return { success: false, error: 'Google AI API key not configured' };
    }

    const quote = await db
      .select({
        title: quotes.title,
        clientName: quotes.clientName,
      })
      .from(quotes)
      .where(eq(quotes.id, quoteId))
      .limit(1);

    if (!quote[0]) {
      return { success: false, error: 'Quote not found' };
    }

    const { title, clientName } = quote[0];
    const tone = options?.tone || 'professional';
    const daysSince = await getDaysSinceSent(quoteId);

    const prompt = `Eres un asistente profesional de ventas. Genera un email de seguimiento para un presupuesto.

Datos:
- Cliente: ${clientName}
- Presupuesto: ${title}
- Días desde envío: ${daysSince}
- Tono: ${tone}

Instrucciones:
1. Saludo profesional
2. Recordatorio suave del presupuesto enviado
3. Preguntar si tiene dudas o necesita aclaraciones
4. Cierre cortés
5. NO ser pesado ni insistente
6. Mantener entre 50-100 palabras

Devuelve SOLO el cuerpo del email (texto plano) sin asunto.`;

    const { text } = await generateText({
      model,
      prompt,
      maxTokens: 300,
    });

    const subject = `Seguimiento: ${title}`;
    const html = `<div style="font-family: sans-serif; line-height: 1.6;">
      <p>Estimado/a ${clientName},</p>
      <p>${text.replace(/\n/g, '<br/>')}</p>
      <p>Atentamente,<br/>El equipo</p>
    </div>`;

    return {
      success: true,
      draft: {
        subject,
        html,
        text,
        quoteId,
        daysSinceSent: daysSince,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

async function getDaysSinceSent(quoteId: string): Promise<number> {
  const sentEvent = await db
    .select({ createdAt: quoteEvents.createdAt })
    .from(quoteEvents)
    .where(
      and(
        eq(quoteEvents.quoteId, quoteId),
        eq(quoteEvents.type, QUOTE_EVENT_TYPES.SENT)
      )
    )
    .orderBy(desc(quoteEvents.createdAt))
    .limit(1);

  if (!sentEvent[0]) return 0;

  const now = new Date();
  const sentDate = new Date(sentEvent[0].createdAt);
  return Math.floor((now.getTime() - sentDate.getTime()) / (1000 * 60 * 60 * 24));
}

/**
 * Envía el follow-up
 */
export async function sendFollowUp(
  quoteId: string,
  draft: FollowUpDraft,
  recipientEmail: string,
  options?: { manualReview?: boolean }
): Promise<{ success: boolean; emailId?: string; error?: string }> {
  try {
    const { sendTrackedEmail } = await import('@/lib/email');

    const result = await sendTrackedEmail({
      to: recipientEmail,
      subject: draft.subject,
      html: draft.html,
      text: draft.text,
      quoteId,
      eventType: QUOTE_EVENT_TYPES.FOLLOWUP_SENT,
    });

    if (result.success && result.emailId) {
      const { emitEvent } = await import('@/lib/db/events');
      await emitEvent(QUOTE_EVENT_TYPES.FOLLOWUP_SENT, quoteId, {
        emailId: result.emailId,
        daysSinceSent: draft.daysSinceSent,
        manualReview: options?.manualReview || false,
      });
    }

    return { success: result.success, emailId: result.emailId, error: result.error };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
