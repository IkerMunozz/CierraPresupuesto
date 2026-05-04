import { db } from '@/lib/db';
import { eq, and, sql } from 'drizzle-orm';
import { quotes, quoteLines, quoteEvents } from '@/lib/db/schema';
import { deriveQuoteStatus, getQuotesStatusesFromEvents, QUOTE_EVENT_TYPES } from '@/lib/db/events';

export type ActionType = 'SEND_EMAIL' | 'FOLLOW_UP' | 'PRIORITIZE_QUOTE' | 'ALERT_USER' | 'DO_NOTHING';

export interface DecisionOutput {
  action: ActionType;
  reason: string;
  targetId: string;
  expectedImpact: number;
  confidence: number;
}

interface QuoteCandidate {
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
  lastFollowupDaysAgo: number;
}

async function fetchQuotesForDecision(userId: string): Promise<QuoteCandidate[]> {
  const userQuotes = await db
    .select({
      id: quotes.id,
      title: quotes.title,
      clientName: quotes.clientName,
      clientEmail: sql<string | null>`(SELECT c.email FROM ${import('@/lib/db/schema').then(m => m.clients).then(c => c.clients) ?? null} c WHERE c.id = ${quotes.clientId})`,
      score: quotes.score,
      status: quotes.status,
      createdAt: quotes.createdAt,
    })
    .from(quotes)
    .where(eq(quotes.userId, userId));

  const quoteIds = userQuotes.map(q => q.id);
  const statusMap = await getQuotesStatusesFromEvents(quoteIds);

  const amounts = new Map<string, number>();
  if (quoteIds.length > 0) {
    const lines = await db
      .select()
      .from(quoteLines)
      .where(quoteIds.length > 0 ? undefined : sql`false`);

    if (quoteIds.length > 0) {
      const linesFiltered = await db
        .select()
        .from(quoteLines)
        .where(
          quoteIds.length === 1
            ? eq(quoteLines.quoteId, quoteIds[0])
            : sql`${quoteLines.quoteId} = ANY(${quoteIds})`
        );

      linesFiltered.forEach(line => {
        const current = amounts.get(line.quoteId) || 0;
        amounts.set(line.quoteId, current + Number(line.totalAmount));
      });
    }
  }

  const candidates: QuoteCandidate[] = [];

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
    const lastFollowup = followUpEvents[followUpEvents.length - 1];
    const lastFollowupDaysAgo = lastFollowup
      ? Math.floor((Date.now() - new Date(lastFollowup.createdAt).getTime()) / (1000 * 60 * 60 * 24))
      : -1;

    candidates.push({
      id: q.id,
      title: q.title,
      clientName: q.clientName,
      clientEmail: q.clientEmail,
      amount: amounts.get(q.id) || 0,
      score: q.score || 50,
      status: derivedStatus,
      daysSinceSent,
      daysSinceCreated,
      viewCount,
      followUpCount,
      lastFollowupDaysAgo,
    });
  }

  return candidates;
}

function scoreCandidate(c: QuoteCandidate): { decision: DecisionOutput; score: number } {
  const baseImpact = c.amount * 0.35;

  if (c.status === 'accepted') {
    return {
      decision: {
        action: 'DO_NOTHING',
        reason: 'Presupuesto aceptado. No hay acción necesaria.',
        targetId: c.id,
        expectedImpact: 0,
        confidence: 100,
      },
      score: 0,
    };
  }

  if (c.status === 'rejected') {
    if (c.amount > 2000) {
      return {
        decision: {
          action: 'ALERT_USER',
          reason: `Presupuesto rechazado de ${c.amount}€. Valor alto merece re-intento con IA.`,
          targetId: c.id,
          expectedImpact: c.amount * 0.2,
          confidence: 45,
        },
        score: c.amount * 0.2,
      };
    }
    return {
      decision: {
        action: 'DO_NOTHING',
        reason: 'Rechazado. Importe bajo, no merece acción.',
        targetId: c.id,
        expectedImpact: 0,
        confidence: 90,
      },
      score: 0,
    };
  }

  if (c.status === 'draft') {
    if (c.daysSinceCreated > 3 && c.amount > 500) {
      const urgency = Math.min(c.daysSinceCreated * 5, 50);
      return {
        decision: {
          action: 'PRIORITIZE_QUOTE',
          reason: `Borrador de ${c.amount}€ lleva ${c.daysSinceCreated} días sin enviar. Dinero en riesgo.`,
          targetId: c.id,
          expectedImpact: baseImpact,
          confidence: 60 + urgency,
        },
        score: baseImpact + urgency,
      };
    }
    return {
      decision: {
        action: 'DO_NOTHING',
        reason: `Borrador reciente (${c.daysSinceCreated} días). Aún en período de preparación.`,
        targetId: c.id,
        expectedImpact: 0,
        confidence: 80,
      },
      score: 0,
    };
  }

  if (c.status === 'viewed' || c.status === 'sent') {
    if (c.viewCount >= 3 && c.followUpCount === 0) {
      return {
        decision: {
          action: 'FOLLOW_UP',
          reason: `Visto ${c.viewCount} veces sin respuesta. Cliente caliente con ${c.amount}€ en juego.`,
          targetId: c.id,
          expectedImpact: c.amount * 0.55,
          confidence: Math.min(c.score + 10, 85),
        },
        score: c.amount * 0.55 + c.score,
      };
    }

    if (c.viewCount === 0 && c.daysSinceSent >= 5 && c.followUpCount === 0) {
      return {
        decision: {
          action: 'SEND_EMAIL',
          reason: `Nunca abierto en ${c.daysSinceSent} días. Reenviar con asunto nuevo.`,
          targetId: c.id,
          expectedImpact: c.amount * 0.25,
          confidence: 50,
        },
        score: c.amount * 0.25 + 20,
      };
    }

    if (c.followUpCount === 0 && c.daysSinceSent >= 3) {
      return {
        decision: {
          action: 'FOLLOW_UP',
          reason: `Primer seguimiento pendiente. Enviado hace ${c.daysSinceSent} días.`,
          targetId: c.id,
          expectedImpact: baseImpact,
          confidence: 55,
        },
        score: baseImpact + 30,
      };
    }

    if (c.followUpCount > 0 && c.followUpCount < 3 && c.lastFollowupDaysAgo >= 4) {
      return {
        decision: {
          action: 'FOLLOW_UP',
          reason: `Seguimiento #${c.followUpCount + 1} pendiente. ${c.lastFollowupDaysAgo} días desde el último.`,
          targetId: c.id,
          expectedImpact: baseImpact * (1 + c.followUpCount * 0.15),
          confidence: 45 + c.followUpCount * 10,
        },
        score: baseImpact * (1 + c.followUpCount * 0.15) + 25,
      };
    }

    if (c.daysSinceSent >= 30) {
      return {
        decision: {
          action: 'DO_NOTHING',
          reason: `${c.daysSinceSent} días sin respuesta. Oportunidad caducada.`,
          targetId: c.id,
          expectedImpact: 0,
          confidence: 95,
        },
        score: 0,
      };
    }
  }

  return {
    decision: {
      action: 'DO_NOTHING',
      reason: 'Sin acción recomendada en este momento.',
      targetId: c.id,
      expectedImpact: 0,
      confidence: 70,
    },
    score: 0,
  };
}

export async function makeAutonomousDecision(userId: string): Promise<DecisionOutput> {
  const candidates = await fetchQuotesForDecision(userId);

  if (candidates.length === 0) {
    return {
      action: 'DO_NOTHING',
      reason: 'No hay presupuestos. Crea tu primer presupuesto para empezar a generar ingresos.',
      targetId: '',
      expectedImpact: 0,
      confidence: 100,
    };
  }

  const scored = candidates.map(c => scoreCandidate(c));

  const best = scored.reduce((prev, curr) => (curr.score > prev.score ? curr : prev));

  return best.decision;
}

export async function makeAllDecisions(userId: string): Promise<DecisionOutput[]> {
  const candidates = await fetchQuotesForDecision(userId);
  const scored = candidates.map(c => scoreCandidate(c));

  return scored
    .filter(s => s.decision.action !== 'DO_NOTHING')
    .sort((a, b) => b.score - a.score)
    .map(s => s.decision);
}
