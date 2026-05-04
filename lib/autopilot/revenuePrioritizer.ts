import { db } from '@/lib/db';
import { eq, and, sql, desc } from 'drizzle-orm';
import { quotes, quoteLines, quoteEvents, clients } from '@/lib/db/schema';
import { deriveQuoteStatus, getQuotesStatusesFromEvents, QUOTE_EVENT_TYPES } from '@/lib/db/events';

export interface PrioritizedAction {
  action: string;
  quoteId: string;
  title: string;
  clientName: string;
  impact: number;
  priority: 1 | 2 | 3;
  confidence: number;
  breakdown: {
    closureProbability: number;
    clientValue: number;
    timeUrgency: number;
    lossRisk: number;
  };
}

interface QuoteRevenueProfile {
  id: string;
  title: string;
  clientName: string;
  clientEmail: string | null;
  clientId: number | null;
  amount: number;
  score: number;
  status: string;
  daysSinceSent: number;
  daysSinceCreated: number;
  viewCount: number;
  followUpCount: number;
  lastViewedAt: Date | null;
  lastFollowupAt: Date | null;
  hasOpenedEmail: boolean;
  clientPotentialValue: number;
  clientStatus: string;
  clientCompany: string | null;
}

async function fetchRevenueProfiles(userId: string): Promise<QuoteRevenueProfile[]> {
  const userQuotes = await db
    .select()
    .from(quotes)
    .where(eq(quotes.userId, userId))
    .orderBy(desc(quotes.createdAt));

  if (userQuotes.length === 0) return [];

  const quoteIds = userQuotes.map(q => q.id);

  const amounts = new Map<string, number>();
  const lines = await db
    .select()
    .from(quoteLines)
    .where(sql`${quoteLines.quoteId} = ANY(${quoteIds})`);

  lines.forEach(line => {
    const current = amounts.get(line.quoteId) || 0;
    amounts.set(line.quoteId, current + Number(line.totalAmount));
  });

  const profiles: QuoteRevenueProfile[] = [];

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

    const viewEvents = events.filter(e => e.type === QUOTE_EVENT_TYPES.VIEWED);
    const lastViewedAt = viewEvents.length > 0 ? new Date(viewEvents[viewEvents.length - 1].createdAt) : null;
    const lastFollowupAt = followUpEvents.length > 0 ? new Date(followUpEvents[followUpEvents.length - 1].createdAt) : null;

    const emailEvents = events.filter(e => e.type === QUOTE_EVENT_TYPES.FOLLOWUP_SENT);
    const hasOpenedEmail = emailEvents.some(e => {
      const meta = e.metadata as Record<string, unknown> | null;
      return meta && meta.opened === true;
    });

    let clientPotentialValue = 0;
    let clientStatus = 'lead';
    let clientCompany: string | null = null;

    if (q.clientId) {
      const client = await db
        .select()
        .from(clients)
        .where(eq(clients.id, q.clientId))
        .limit(1);

      if (client.length > 0) {
        clientPotentialValue = Number(client[0].potentialValue) || 0;
        clientStatus = client[0].status || 'lead';
        clientCompany = client[0].company || null;
      }
    }

    profiles.push({
      id: q.id,
      title: q.title,
      clientName: q.clientName,
      clientEmail: q.clientEmail || null,
      clientId: q.clientId,
      amount: amounts.get(q.id) || 0,
      score: q.score || 50,
      status: derivedStatus,
      daysSinceSent,
      daysSinceCreated,
      viewCount,
      followUpCount,
      lastViewedAt,
      lastFollowupAt,
      hasOpenedEmail,
      clientPotentialValue,
      clientStatus,
      clientCompany,
    });
  }

  return profiles;
}

function scoreClosureProbability(p: QuoteRevenueProfile): number {
  if (p.status === 'accepted') return 0;
  if (p.status === 'rejected') return 0;
  if (p.status === 'draft') return 0;

  let prob = p.score / 100;

  if (p.viewCount >= 3) prob *= 1.4;
  else if (p.viewCount >= 2) prob *= 1.2;
  else if (p.viewCount >= 1) prob *= 1.1;
  else prob *= 0.6;

  if (p.followUpCount === 0 && p.daysSinceSent >= 3) prob *= 0.85;
  if (p.followUpCount >= 1 && p.followUpCount < 3) prob *= 1.1;
  if (p.daysSinceSent > 14) prob *= 0.5;
  if (p.daysSinceSent > 21) prob *= 0.3;

  return Math.min(prob, 1);
}

function scoreClientValue(p: QuoteRevenueProfile): number {
  const quoteValue = p.amount;
  const potentialValue = p.clientPotentialValue;

  const base = Math.max(quoteValue, potentialValue);

  if (p.clientStatus === 'active') return base * 1.3;
  if (p.clientCompany) return base * 1.2;

  return base;
}

function scoreTimeUrgency(p: QuoteRevenueProfile): number {
  if (p.status === 'accepted') return 0;
  if (p.status === 'rejected') return 0;

  if (p.status === 'draft') {
    const decay = Math.min(p.daysSinceCreated * 0.15, 1);
    return p.amount * decay * 0.8;
  }

  let urgency = 0;

  if (p.viewCount >= 2 && p.followUpCount === 0) {
    urgency += 0.4;
  }

  if (p.daysSinceSent >= 3 && p.daysSinceSent < 7) {
    urgency += 0.3;
  } else if (p.daysSinceSent >= 7 && p.daysSinceSent < 14) {
    urgency += 0.5;
  } else if (p.daysSinceSent >= 14) {
    urgency += 0.7;
  }

  if (p.lastViewedAt) {
    const hoursSinceViewed = (Date.now() - p.lastViewedAt.getTime()) / (1000 * 60 * 60);
    if (hoursSinceViewed >= 24 && hoursSinceViewed < 72) {
      urgency += 0.3;
    } else if (hoursSinceViewed >= 72) {
      urgency += 0.2;
    }
  }

  if (p.followUpCount >= 2) {
    urgency += 0.2;
  }

  return p.amount * Math.min(urgency, 1);
}

function scoreLossRisk(p: QuoteRevenueProfile): number {
  if (p.status === 'accepted') return 0;
  if (p.status === 'rejected') return 0;
  if (p.status === 'draft') return p.amount * 0.5;

  let risk = 0;

  if (p.viewCount === 0 && p.daysSinceSent >= 5) {
    risk += 0.4;
  }

  if (p.daysSinceSent >= 10 && p.followUpCount === 0) {
    risk += 0.5;
  }

  if (p.daysSinceSent >= 7 && p.followUpCount >= 2) {
    risk += 0.3;
  }

  if (p.lastViewedAt) {
    const daysSinceViewed = (Date.now() - p.lastViewedAt.getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceViewed >= 5) {
      risk += 0.3;
    }
  }

  if (p.followUpCount >= 3) {
    risk += 0.4;
  }

  return p.amount * Math.min(risk, 1);
}

function determineAction(p: QuoteRevenueProfile, breakdown: PrioritizedAction['breakdown']): string {
  if (p.status === 'accepted' || p.status === 'rejected') return 'NO_ACTION';

  if (p.status === 'draft') {
    return 'SEND_DRAFT';
  }

  if (p.viewCount === 0 && p.daysSinceSent >= 5) {
    return 'RESEND_UNOPENED';
  }

  if (p.viewCount >= 2 && p.followUpCount === 0) {
    return 'FOLLOW_UP';
  }

  if (p.followUpCount === 0 && p.daysSinceSent >= 3) {
    return 'FOLLOW_UP';
  }

  if (p.followUpCount > 0 && p.followUpCount < 3) {
    return 'FOLLOW_UP';
  }

  if (p.daysSinceSent >= 14) {
    return 'FINAL_ATTEMPT';
  }

  return 'MONITOR';
}

function calculateConfidence(p: QuoteRevenueProfile, breakdown: PrioritizedAction['breakdown']): number {
  let conf = 50;

  if (p.score > 0) conf += (p.score - 50) * 0.3;

  if (p.viewCount >= 2) conf += 10;
  if (p.viewCount === 0) conf -= 15;

  if (p.followUpCount > 0) conf += 5;

  if (p.amount > 1000) conf += 5;
  if (p.clientPotentialValue > 5000) conf += 5;

  return Math.max(Math.min(Math.round(conf), 95), 15);
}

export async function prioritizeRevenue(userId: string): Promise<PrioritizedAction[]> {
  const profiles = await fetchRevenueProfiles(userId);

  if (profiles.length === 0) return [];

  const scored = profiles.map(p => {
    const closureProbability = scoreClosureProbability(p);
    const clientValue = scoreClientValue(p);
    const timeUrgency = scoreTimeUrgency(p);
    const lossRisk = scoreLossRisk(p);

    const compositeScore =
      closureProbability * clientValue * 0.35 +
      timeUrgency * 0.3 +
      lossRisk * 0.2 +
      clientValue * 0.15;

    const impact = Math.round(closureProbability * p.amount);

    const breakdown = {
      closureProbability: Math.round(closureProbability * 100),
      clientValue: Math.round(clientValue),
      timeUrgency: Math.round(timeUrgency),
      lossRisk: Math.round(lossRisk),
    };

    const action = determineAction(p, breakdown);

    return {
      action,
      quoteId: p.id,
      title: p.title,
      clientName: p.clientName,
      impact,
      priority: 1,
      confidence: calculateConfidence(p, breakdown),
      breakdown,
    };
  });

  scored.sort((a, b) => b.impact - a.impact);

  const top3 = scored.slice(0, 3);

  for (let i = 0; i < top3.length; i++) {
    top3[i].priority = (i + 1) as 1 | 2 | 3;
  }

  return top3;
}
