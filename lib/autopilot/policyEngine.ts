import { db } from '@/lib/db';
import { eq, and, sql, desc } from 'drizzle-orm';
import { quotes, quoteEvents, quoteLines, clients } from '@/lib/db/schema';
import { deriveQuoteStatus, getQuotesStatusesFromEvents, QUOTE_EVENT_TYPES } from '@/lib/db/events';

export type PolicyAction = 'SEND_EMAIL' | 'FOLLOW_UP' | 'PRIORITIZE_QUOTE' | 'ALERT_USER' | 'INSIGHT_ACTION';

export interface PolicyCheck {
  allowed: boolean;
  reason: string;
  overrideRisk: 'low' | 'medium' | 'high';
}

interface PolicyContext {
  quoteId: string;
  userId: string;
  action: PolicyAction;
  quoteRejectedCount: number;
  quoteStatus: string;
  clientEmail: string | null;
  followUpCount: number;
  daysSinceLastAction: number;
  lastFollowupTone: string | null;
  clientCompany: string | null;
  amount: number;
}

async function buildPolicyContext(userId: string, quoteId: string): Promise<PolicyContext | null> {
  const quote = await db
    .select()
    .from(quotes)
    .where(and(eq(quotes.id, quoteId), eq(quotes.userId, userId)))
    .limit(1);

  if (quote.length === 0) return null;

  const q = quote[0];

  const events = await db
    .select()
    .from(quoteEvents)
    .where(eq(quoteEvents.quoteId, q.id))
    .orderBy(quoteEvents.createdAt);

  const derivedStatus = deriveQuoteStatus(events);

  const rejectedCount = events.filter(e => e.type === QUOTE_EVENT_TYPES.REJECTED).length;

  const followUpEvents = events.filter(e => e.type === QUOTE_EVENT_TYPES.FOLLOWUP_SENT);
  const followUpCount = followUpEvents.length;

  const lastFollowup = followUpEvents[followUpEvents.length - 1];
  const lastFollowupTone = lastFollowup?.metadata ? ((lastFollowup.metadata as Record<string, string>).tone || null) : null;

  const daysSinceLastAction = lastFollowup
    ? Math.floor((Date.now() - new Date(lastFollowup.createdAt).getTime()) / (1000 * 60 * 60 * 24))
    : -1;

  let clientEmail = q.clientEmail || null;
  let clientCompany: string | null = null;

  if (q.clientId) {
    const client = await db
      .select()
      .from(clients)
      .where(eq(clients.id, q.clientId))
      .limit(1);

    if (client.length > 0) {
      clientEmail = client[0].email || clientEmail;
      clientCompany = client[0].company || null;
    }
  }

  const lines = await db
    .select()
    .from(quoteLines)
    .where(eq(quoteLines.quoteId, q.id));

  const amount = lines.reduce((sum, l) => sum + Number(l.totalAmount), 0);

  return {
    quoteId: q.id,
    userId,
    action: 'SEND_EMAIL',
    quoteRejectedCount: rejectedCount,
    quoteStatus: derivedStatus,
    clientEmail,
    followUpCount,
    daysSinceLastAction,
    lastFollowupTone,
    clientCompany,
    amount,
  };
}

function ruleNoEmailIfRejectedTwice(ctx: PolicyContext): PolicyCheck | null {
  if (ctx.action !== 'SEND_EMAIL' && ctx.action !== 'FOLLOW_UP') return null;

  if (ctx.quoteRejectedCount >= 2) {
    return {
      allowed: false,
      reason: `Cliente rechazó ${ctx.quoteRejectedCount} veces. Política: no enviar emails tras 2+ rechazos.`,
      overrideRisk: 'high',
    };
  }

  return null;
}

function ruleNoFollowUpIfLost(ctx: PolicyContext): PolicyCheck | null {
  if (ctx.action !== 'FOLLOW_UP' && ctx.action !== 'SEND_EMAIL' && ctx.action !== 'ALERT_USER') return null;

  if (ctx.quoteStatus === 'rejected') {
    return {
      allowed: false,
      reason: `Presupuesto marcado como rejected. Política: no hacer follow-up a presupuestos perdidos.`,
      overrideRisk: 'medium',
    };
  }

  return null;
}

function ruleNoContactWithoutEmail(ctx: PolicyContext): PolicyCheck | null {
  if (ctx.action !== 'SEND_EMAIL' && ctx.action !== 'FOLLOW_UP') return null;

  if (!ctx.clientEmail || ctx.clientEmail.trim() === '' || !isValidEmail(ctx.clientEmail)) {
    return {
      allowed: false,
      reason: `No hay email válido para el cliente. Política: no contactar sin email.`,
      overrideRisk: 'low',
    };
  }

  return null;
}

function ruleMaxFollowUps(ctx: PolicyContext): PolicyCheck | null {
  if (ctx.action !== 'FOLLOW_UP' && ctx.action !== 'SEND_EMAIL') return null;

  if (ctx.followUpCount >= 3) {
    return {
      allowed: false,
      reason: `${ctx.followUpCount} follow-ups ya enviados. Política: máximo 3 por presupuesto.`,
      overrideRisk: 'high',
    };
  }

  return null;
}

function ruleReputationalRisk(ctx: PolicyContext): PolicyCheck | null {
  if (ctx.action !== 'SEND_EMAIL' && ctx.action !== 'FOLLOW_UP' && ctx.action !== 'ALERT_USER') return null;

  const riskSignals: string[] = [];

  if (ctx.followUpCount >= 3 && ctx.quoteRejectedCount >= 1) {
    riskSignals.push('multiple_followups_after_rejection');
  }

  if (ctx.daysSinceLastAction >= 0 && ctx.daysSinceLastAction < 1) {
    riskSignals.push('action_too_recent');
  }

  const recentRejections = ctx.quoteRejectedCount > 0;
  const highValueWithAggressiveTone = ctx.amount > 5000 && ctx.lastFollowupTone === 'urgency';

  if (riskSignals.length >= 2) {
    return {
      allowed: false,
      reason: `Riesgo reputacional alto: ${riskSignals.join(', ')}. El cliente podría percibir spam.`,
      overrideRisk: 'high',
    };
  }

  if (highValueWithAggressiveTone && ctx.followUpCount >= 2) {
    return {
      allowed: false,
      reason: `Importe alto (${ctx.amount}€) + tono urgente + 2+ follow-ups. Riesgo de dañar relación con cliente corporativo.`,
      overrideRisk: 'high',
    };
  }

  if (recentRejections && ctx.followUpCount >= 2) {
    return {
      allowed: false,
      reason: `Cliente ya rechazó y recibió ${ctx.followUpCount} follow-ups. Contactar más podría dañar la marca.`,
      overrideRisk: 'medium',
    };
  }

  return null;
}

function isValidEmail(email: string): boolean {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

async function evaluatePolicies(
  userId: string,
  quoteId: string,
  action: PolicyAction
): Promise<PolicyCheck> {
  const ctx = await buildPolicyContext(userId, quoteId);

  if (!ctx) {
    return {
      allowed: false,
      reason: 'Presupuesto no encontrado o no pertenece al usuario.',
      overrideRisk: 'low',
    };
  }

  ctx.action = action;

  const rules = [
    ruleNoEmailIfRejectedTwice,
    ruleNoFollowUpIfLost,
    ruleNoContactWithoutEmail,
    ruleMaxFollowUps,
    ruleReputationalRisk,
  ];

  for (const rule of rules) {
    const result = rule(ctx);
    if (result) return result;
  }

  return {
    allowed: true,
    reason: 'Todas las políticas aprobadas. Acción permitida.',
    overrideRisk: 'low',
  };
}

export async function checkAllPolicies(
  userId: string,
  pendingActions: { quoteId: string; action: PolicyAction }[]
): Promise<{ quoteId: string; action: PolicyAction; check: PolicyCheck }[]> {
  const results: { quoteId: string; action: PolicyAction; check: PolicyCheck }[] = [];

  for (const pa of pendingActions) {
    const check = await evaluatePolicies(pa.quoteId ? userId : '', pa.quoteId, pa.action);
    results.push({ quoteId: pa.quoteId, action: pa.action, check });
  }

  return results;
}

export async function evaluatePoliciesWrapper(
  userId: string,
  quoteId: string,
  action: PolicyAction
): Promise<PolicyCheck> {
  return evaluatePolicies(userId, quoteId, action);
}
