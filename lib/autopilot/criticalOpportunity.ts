import { db } from '@/lib/db';
import { eq, and, sql, desc } from 'drizzle-orm';
import { quotes, quoteLines, quoteEvents, clients } from '@/lib/db/schema';
import { deriveQuoteStatus, getQuotesStatusesFromEvents, QUOTE_EVENT_TYPES } from '@/lib/db/events';

export interface CriticalOpportunity {
  quoteId: string;
  type: 'opportunity' | 'risk';
  reason: string;
  value: number;
  urgency: 'low' | 'medium' | 'high';
}

interface QuoteProfile {
  id: string;
  title: string;
  clientName: string;
  clientEmail: string | null;
  amount: number;
  score: number;
  status: string;
  daysSinceSent: number;
  daysSinceCreated: number;
  viewCount: number;
  followUpCount: number;
  lastEventDate: Date | null;
  hasViewedAfterFollowup: boolean;
}

async function fetchQuoteProfiles(userId: string): Promise<QuoteProfile[]> {
  const userQuotes = await db
    .select()
    .from(quotes)
    .where(eq(quotes.userId, userId))
    .orderBy(desc(quotes.createdAt));

  if (userQuotes.length === 0) return [];

  const quoteIds = userQuotes.map(q => q.id);
  const statusMap = await getQuotesStatusesFromEvents(quoteIds);

  const amounts = new Map<string, number>();
  const lines = await db
    .select()
    .from(quoteLines)
    .where(sql`${quoteLines.quoteId} = ANY(${quoteIds})`);

  lines.forEach(line => {
    const current = amounts.get(line.quoteId) || 0;
    amounts.set(line.quoteId, current + Number(line.totalAmount));
  });

  const profiles: QuoteProfile[] = [];

  for (const q of userQuotes) {
    const events = await db
      .select()
      .from(quoteEvents)
      .where(eq(quoteEvents.quoteId, q.id))
      .orderBy(quoteEvents.createdAt);

    const derivedStatus = deriveQuoteStatus(events);
    const sentEvent = events.find(e => e.type === QUOTE_EVENT_TYPES.SENT);
    const daysSinceSent = sentEvent
      ? Math.floor((Date.now() - new Date(sentEvent.createdAt).getTime()) / (1000 * 60 * 60 * 24))
      : -1;

    const daysSinceCreated = Math.floor((Date.now() - new Date(q.createdAt).getTime()) / (1000 * 60 * 60 * 24));
    const viewCount = events.filter(e => e.type === QUOTE_EVENT_TYPES.VIEWED).length;
    const followUpEvents = events.filter(e => e.type === QUOTE_EVENT_TYPES.FOLLOWUP_SENT);
    const followUpCount = followUpEvents.length;
    const lastEvent = events[events.length - 1];

    const hasViewedAfterFollowup = followUpEvents.length > 0
      ? events.some(e => e.type === QUOTE_EVENT_TYPES.VIEWED && new Date(e.createdAt) > followUpEvents[followUpEvents.length - 1].createdAt)
      : false;

    profiles.push({
      id: q.id,
      title: q.title,
      clientName: q.clientName,
      clientEmail: q.clientEmail || null,
      amount: amounts.get(q.id) || 0,
      score: q.score || 50,
      status: derivedStatus,
      daysSinceSent,
      daysSinceCreated,
      viewCount,
      followUpCount,
      lastEventDate: lastEvent ? new Date(lastEvent.createdAt) : null,
      hasViewedAfterFollowup,
    });
  }

  return profiles;
}

function scoreOpportunity(p: QuoteProfile): { opp: CriticalOpportunity | null; score: number } {
  if (p.status === 'accepted') return { opp: null, score: 0 };
  if (p.status === 'draft') {
    if (p.daysSinceCreated > 5) {
      const urgency = p.amount > 2000 ? 'high' : p.amount > 500 ? 'medium' : 'low';
      return {
        opp: {
          quoteId: p.id,
          type: 'risk',
          reason: `Borrador "${p.title}" (${p.amount}€) lleva ${p.daysSinceCreated} días sin enviar. El interés del cliente se enfría cada día.`,
          value: p.amount,
          urgency,
        },
        score: p.amount * (1 - p.daysSinceCreated * 0.05),
      };
    }
    return { opp: null, score: 0 };
  }

  if (p.status === 'rejected') {
    if (p.amount > 2000) {
      return {
        opp: {
          quoteId: p.id,
          type: 'risk',
          reason: `Presupuesto rechazado de ${p.amount}€. Valor alto merece una segunda versión con enfoque diferente.`,
          value: p.amount,
          urgency: 'medium',
        },
        score: p.amount * 0.3,
      };
    }
    return { opp: null, score: 0 };
  }

  if (p.status === 'viewed' || p.status === 'sent') {
    if (p.viewCount >= 2 && p.followUpCount === 0 && p.daysSinceSent >= 3) {
      return {
        opp: {
          quoteId: p.id,
          type: 'opportunity',
          reason: `${p.clientName} vio "${p.title}" ${p.viewCount} veces. Score: ${p.score}/100. Cliente caliente sin seguimiento — alto riesgo de que se enfríe.`,
          value: p.amount,
          urgency: p.amount > 1500 ? 'high' : 'medium',
        },
        score: p.amount * 0.8 + p.score * 10,
      };
    }

    if (p.viewCount >= 1 && p.followUpCount > 0 && p.hasViewedAfterFollowup && p.followUpCount < 3) {
      return {
        opp: {
          quoteId: p.id,
          type: 'opportunity',
          reason: `${p.clientName} volvió a ver el presupuesto DESPUÉS del seguimiento. Interés confirmado. Momento exacto para cerrar.`,
          value: p.amount,
          urgency: 'high',
        },
        score: p.amount * 1.2 + p.score * 15,
      };
    }

    if (p.viewCount === 0 && p.daysSinceSent >= 5 && p.followUpCount === 0) {
      return {
        opp: {
          quoteId: p.id,
          type: 'risk',
          reason: `"${p.title}" enviado hace ${p.daysSinceSent} días, nunca abierto. Probablemente llegó a spam o el cliente lo ignoró.`,
          value: p.amount,
          urgency: p.amount > 1000 ? 'high' : 'medium',
        },
        score: p.amount * 0.4 + (p.daysSinceSent * 20),
      };
    }

    if (p.daysSinceSent >= 10 && p.followUpCount < 2) {
      return {
        opp: {
          quoteId: p.id,
          type: 'risk',
          reason: `${p.daysSinceSent} días sin respuesta y solo ${p.followUpCount} seguimiento(s). ${p.clientName} está a punto de desaparecer.`,
          value: p.amount,
          urgency: 'high',
        },
        score: p.amount * 0.5 + p.daysSinceSent * 30,
      };
    }

    if (p.score >= 75 && p.followUpCount === 0 && p.daysSinceSent >= 3) {
      return {
        opp: {
          quoteId: p.id,
          type: 'opportunity',
          reason: `Score alto (${p.score}/100) para "${p.title}". ${p.clientName} tiene alta probabilidad de cierre pero nadie ha hecho seguimiento.`,
          value: p.amount,
          urgency: 'high',
        },
        score: p.amount * 0.7 + p.score * 8,
      };
    }
  }

  return { opp: null, score: 0 };
}

export async function findCriticalOpportunity(userId: string): Promise<CriticalOpportunity | null> {
  const profiles = await fetchQuoteProfiles(userId);

  if (profiles.length === 0) {
    return {
      quoteId: '',
      type: 'opportunity',
      reason: 'No hay presupuestos. Crea tu primer presupuesto para empezar a generar ingresos.',
      value: 0,
      urgency: 'medium',
    };
  }

  const scored = profiles.map(p => scoreOpportunity(p)).filter(s => s.opp !== null);

  if (scored.length === 0) {
    return {
      quoteId: '',
      type: 'opportunity',
      reason: 'No hay oportunidades ni riesgos críticos detectados. Tu pipeline está estable.',
      value: 0,
      urgency: 'low',
    };
  }

  scored.sort((a, b) => b.score - a.score);

  return scored[0].opp;
}
