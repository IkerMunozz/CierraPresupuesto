// lib/services/salesAutomation.ts
import { db } from '@/lib/db';
import { quotes, quoteEvents } from '@/lib/db/schema';
import { eq, and, gt, desc, inArray } from 'drizzle-orm';
import { QUOTE_EVENT_TYPES } from '@/lib/db/eventTypes';
import { buildSalesContext, SalesContext } from './salesContext';
import { decideFollowUp, FollowUpDecision } from './followUpDecision';
import { generateFollowUpEmail as generateEmail, GeneratedEmail } from './followUpEmailGenerator';
import { emitEvent } from '@/lib/db/events';

const COOLDOWN_HOURS = 12;

export type ActionType =
  | 'send_followup_email'
  | 'send_initial_quote'
  | 'notify_user'
  | 'mark_lost'
  | 'suggest_improve'
  | 'none';

export interface AutomationResult {
  quoteId: string;
  title: string;
  clientName: string;
  action: ActionType;
  priority: FollowUpDecision['priority'] | 'none';
  success: boolean;
  reason: string;
  error?: string;
}

export interface AutomationReport {
  totalProcessed: number;
  actions: {
    sent: number;
    notified: number;
    markedLost: number;
    suggestedImprovement: number;
    skipped: number;
  };
  results: AutomationResult[];
  errors: { quoteId: string; error: string }[];
  executedAt: Date;
}

export async function processSalesAutomation(userId?: string): Promise<AutomationReport> {
  const activeQuoteIds = await getActiveQuoteIds(userId);
  const results: AutomationResult[] = [];
  const errors: { quoteId: string; error: string }[] = [];

  for (const quoteId of activeQuoteIds) {
    try {
      const result = await processQuote(quoteId);
      results.push(result);
    } catch (error) {
      errors.push({ quoteId, error: error instanceof Error ? error.message : 'Error desconocido' });
    }
  }

  return buildReport(results, errors);
}

async function getActiveQuoteIds(userId?: string): Promise<string[]> {
  const baseQuery = db
    .select({ id: quotes.id })
    .from(quotes);

  const conditions = [
    inArray(quotes.status, ['sent', 'viewed', 'draft'] as const),
  ];

  if (userId) conditions.push(eq(quotes.userId, userId));

  const rows = await baseQuery.where(and(...conditions));
  return rows.map(r => r.id);
}

async function processQuote(quoteId: string): Promise<AutomationResult> {
  const context = await buildSalesContext(quoteId);
  if (!context) return noop(quoteId, 'Contexto no disponible');

  if (context.status === 'accepted') return noop(quoteId, 'Presupuesto aceptado');
  if (context.status === 'rejected') return markLost(quoteId, context.title, 'Presupuesto rechazado');

  if (await hasRecentAutomation(context)) {
    return noop(quoteId, `Automación ejecutada hace menos de ${COOLDOWN_HOURS}h`);
  }

  const decision = decideFollowUp(context);

  switch (decision.action.type) {
    case 'send_email':
      return await executeSendEmail(context, decision);

    case 'notify_user':
      return await executeNotifyUser(context, decision);

    case 'mark_lost':
      return markLost(quoteId, context.title, decision.reason);

    case 'suggest_improve':
      return suggestImprove(quoteId, context.title, decision.reason);

    case 'no_action':
      return noop(quoteId, decision.reason);

    default:
      return noop(quoteId, `Acción no implementada: ${(decision.action as { type: string }).type}`);
  }
}

async function hasRecentAutomation(ctx: SalesContext): Promise<boolean> {
  const cutoff = new Date(Date.now() - COOLDOWN_HOURS * 60 * 60 * 1000);

  const recent = await db
    .select({ type: quoteEvents.type })
    .from(quoteEvents)
    .where(
      and(
        eq(quoteEvents.quoteId, ctx.quoteId),
        gt(quoteEvents.createdAt, cutoff),
        inArray(quoteEvents.type, [
          QUOTE_EVENT_TYPES.FOLLOWUP_SENT,
          'AUTOMATION_NOTIFICATION',
        ])
      )
    )
    .limit(1);

  return recent.length > 0;
}

async function executeSendEmail(
  ctx: SalesContext,
  decision: FollowUpDecision
): Promise<AutomationResult> {
  const quote = await db
    .select({ title: quotes.title, clientName: quotes.clientName, clientEmail: quotes.clientEmail })
    .from(quotes)
    .where(eq(quotes.id, ctx.quoteId))
    .limit(1);

  const q = quote[0];
  if (!q) return fail(ctx.quoteId, 'Presupuesto no encontrado');
  if (!q.clientEmail) return fail(ctx.quoteId, 'Sin email del cliente');

  try {
    const generated = await generateEmail(ctx, decision);
    const sent = await sendTrackedEmail(ctx.quoteId, generated, q.clientEmail);

    if (!sent.success) return fail(ctx.quoteId, sent.error || 'Fallo al enviar');

    await emitEvent(QUOTE_EVENT_TYPES.FOLLOWUP_SENT, ctx.quoteId, {
      emailId: sent.emailId,
      tone: decision.action.tone,
      subject: generated.subject,
      body: generated.body,
      daysSinceSent: ctx.daysSinceSent,
      triggeredBy: 'automation',
    });

    return {
      quoteId: ctx.quoteId,
      title: q.title,
      clientName: q.clientName,
      action: 'send_followup_email',
      priority: decision.priority,
      success: true,
      reason: `Email "${decision.action.tone}" enviado a ${q.clientEmail}`,
    };
  } catch (error) {
    return fail(ctx.quoteId, error instanceof Error ? error.message : 'Error al generar email');
  }
}

async function executeNotifyUser(
  ctx: SalesContext,
  decision: FollowUpDecision
): Promise<AutomationResult> {
  await emitEvent('AUTOMATION_NOTIFICATION', ctx.quoteId, {
    action: 'notify_user',
    reason: decision.reason,
    priority: decision.priority,
    triggeredBy: 'automation',
  });

  return {
    quoteId: ctx.quoteId,
    title: ctx.clientName,
    clientName: ctx.clientName,
    action: 'notify_user',
    priority: decision.priority,
    success: true,
    reason: decision.reason,
  };
}

async function sendTrackedEmail(
  quoteId: string,
  generated: GeneratedEmail,
  recipientEmail: string
): Promise<{ success: boolean; emailId?: string; error?: string }> {
  try {
    const { sendTrackedEmail } = await import('@/lib/email');
    const html = `<div style="font-family: system-ui, -apple-system, sans-serif; line-height: 1.6; color: #1e293b;">
      <p>${generated.body.replace(/\n/g, '<br/>')}</p>
      <p style="margin-top: 24px; color: #64748b;">Saludos cordiales</p>
    </div>`;

    const result = await sendTrackedEmail({
      to: recipientEmail,
      subject: generated.subject,
      html,
      text: generated.body,
      quoteId,
      eventType: QUOTE_EVENT_TYPES.FOLLOWUP_SENT,
    });

    return { success: result.success, emailId: result.emailId, error: result.error };
  } catch {
    return { success: false, error: 'Servicio de email no disponible' };
  }
}

function noop(quoteId: string, reason: string): AutomationResult {
  return { quoteId, title: '', clientName: '', action: 'none', priority: 'none', success: true, reason };
}

function markLost(quoteId: string, title: string, reason: string): AutomationResult {
  return { quoteId, title, clientName: '', action: 'mark_lost', priority: 'low', success: true, reason };
}

function suggestImprove(quoteId: string, title: string, reason: string): AutomationResult {
  return { quoteId, title, clientName: '', action: 'suggest_improve', priority: 'medium', success: true, reason };
}

function fail(quoteId: string, error: string): AutomationResult {
  return { quoteId, title: '', clientName: '', action: 'none', priority: 'none', success: false, reason: '', error };
}

function buildReport(results: AutomationResult[], errors: { quoteId: string; error: string }[]): AutomationReport {
  return {
    totalProcessed: results.length,
    actions: {
      sent: results.filter(r => r.action === 'send_followup_email' && r.success).length,
      notified: results.filter(r => r.action === 'notify_user' && r.success).length,
      markedLost: results.filter(r => r.action === 'mark_lost' && r.success).length,
      suggestedImprovement: results.filter(r => r.action === 'suggest_improve' && r.success).length,
      skipped: results.filter(r => r.action === 'none').length,
    },
    results,
    errors,
    executedAt: new Date(),
  };
}
