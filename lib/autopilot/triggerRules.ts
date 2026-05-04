import { db } from '@/lib/db';
import { eq, and, sql, desc, gte, lt } from 'drizzle-orm';
import { quotes, quoteLines, quoteEvents, clients } from '@/lib/db/schema';
import { deriveQuoteStatus, getQuotesStatusesFromEvents, QUOTE_EVENT_TYPES } from '@/lib/db/events';

export type TriggerType = 'FOLLOW_UP' | 'PRIORITIZE' | 'ALERT_USER' | 'INSIGHT_ACTION';

export interface RuleTrigger {
  id: string;
  type: TriggerType;
  quoteId: string;
  clientName: string;
  reason: string;
  value: number;
  urgency: 'critical' | 'high' | 'medium' | 'low';
  data: Record<string, unknown>;
}

interface QuoteSnapshot {
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
  isHighValue: boolean;
  clientCompany: string | null;
  clientSector: string | null;
}

async function fetchSnapshots(userId: string): Promise<QuoteSnapshot[]> {
  const userQuotes = await db
    .select()
    .from(quotes)
    .where(eq(quotes.userId, userId))
    .orderBy(desc(quotes.createdAt));

  if (userQuotes.length === 0) return [];

  const quoteIds = userQuotes.map(q => q.id);
  const amounts = new Map<string, number>();

  if (quoteIds.length > 0) {
    const lines = await db
      .select()
      .from(quoteLines)
      .where(sql`${quoteLines.quoteId} = ANY(${quoteIds})`);

    lines.forEach(line => {
      const current = amounts.get(line.quoteId) || 0;
      amounts.set(line.quoteId, current + Number(line.totalAmount));
    });
  }

  const snapshots: QuoteSnapshot[] = [];

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

    const amount = amounts.get(q.id) || 0;

    snapshots.push({
      id: q.id,
      title: q.title,
      clientName: q.clientName,
      clientEmail: q.clientEmail || null,
      clientId: q.clientId,
      amount,
      score: q.score || 50,
      status: derivedStatus,
      daysSinceSent,
      daysSinceCreated,
      viewCount,
      followUpCount,
      lastViewedAt,
      lastFollowupAt,
      isHighValue: amount >= 2000,
      clientCompany: null,
      clientSector: null,
    });
  }

  if (snapshots.length > 0) {
    const clientIds = snapshots.filter(s => s.clientId).map(s => s.clientId!);
    if (clientIds.length > 0) {
      const clientRecords = await db
        .select()
        .from(clients)
        .where(sql`${clients.id} = ANY(${clientIds})`);

      const clientMap = new Map(clientRecords.map(c => [c.id, c]));

      for (const s of snapshots) {
        if (s.clientId) {
          const client = clientMap.get(s.clientId);
          if (client) {
            s.clientCompany = client.company;
            s.clientSector = client.sector;
          }
        }
      }
    }
  }

  return snapshots;
}

function ruleFollowUp(snapshot: QuoteSnapshot): RuleTrigger | null {
  if (snapshot.status !== 'sent' && snapshot.status !== 'viewed') return null;
  if (snapshot.viewCount === 0) return null;

  if (!snapshot.lastViewedAt) return null;

  const hoursSinceViewed = (Date.now() - snapshot.lastViewedAt.getTime()) / (1000 * 60 * 60);

  if (hoursSinceViewed < 48) return null;

  const hasRecentFollowup = snapshot.lastFollowupAt
    ? (Date.now() - snapshot.lastFollowupAt.getTime()) < (4 * 24 * 60 * 60 * 1000)
    : false;

  if (hasRecentFollowup) return null;

  if (snapshot.followUpCount >= 3) return null;

  return {
    id: `follow_up_${snapshot.id}_${Date.now()}`,
    type: 'FOLLOW_UP',
    quoteId: snapshot.id,
    clientName: snapshot.clientName,
    reason: `${snapshot.clientName} vio "${snapshot.title}" hace ${Math.floor(hoursSinceViewed)}h y no ha respondido. Cliente con interés demostrado.`,
    value: snapshot.amount,
    urgency: snapshot.amount > 1500 ? 'high' : 'medium',
    data: {
      viewCount: snapshot.viewCount,
      hoursSinceViewed: Math.round(hoursSinceViewed),
      followUpCount: snapshot.followUpCount,
      score: snapshot.score,
    },
  };
}

function rulePrioritize(snapshot: QuoteSnapshot): RuleTrigger | null {
  if (snapshot.status !== 'draft') return null;
  if (snapshot.score <= 80) return null;

  return {
    id: `prioritize_${snapshot.id}_${Date.now()}`,
    type: 'PRIORITIZE',
    quoteId: snapshot.id,
    clientName: snapshot.clientName,
    reason: `Borrador "${snapshot.title}" con score ${snapshot.score}/100 sin enviar. Alta probabilidad de cierre desperdiciada.`,
    value: snapshot.amount,
    urgency: snapshot.amount > 2000 ? 'critical' : 'high',
    data: {
      score: snapshot.score,
      daysSinceCreated: snapshot.daysSinceCreated,
      isHighValue: snapshot.isHighValue,
    },
  };
}

function ruleAlertUser(snapshot: QuoteSnapshot): RuleTrigger | null {
  if (!snapshot.isHighValue) return null;
  if (!snapshot.clientCompany && snapshot.clientName.length < 10) return null;

  if ((snapshot.status === 'sent' || snapshot.status === 'viewed') && snapshot.daysSinceSent >= 5) {
    if (snapshot.viewCount <= 1 && snapshot.followUpCount === 0) {
      return {
        id: `alert_user_${snapshot.id}_${Date.now()}`,
        type: 'ALERT_USER',
        quoteId: snapshot.id,
        clientName: snapshot.clientName,
        reason: `Cliente de alto valor (${snapshot.amount}€) inactivo hace ${snapshot.daysSinceSent} días. "${snapshot.title}" apenas fue visto. Requiere contacto directo.`,
        value: snapshot.amount,
        urgency: 'high',
        data: {
          clientCompany: snapshot.clientCompany,
          clientSector: snapshot.clientSector,
          daysSinceSent: snapshot.daysSinceSent,
          viewCount: snapshot.viewCount,
        },
      };
    }
  }

  if (snapshot.status === 'draft' && snapshot.daysSinceCreated >= 4) {
    return {
      id: `alert_user_${snapshot.id}_${Date.now()}`,
      type: 'ALERT_USER',
      quoteId: snapshot.id,
      clientName: snapshot.clientName,
      reason: `Borrador de alto valor (${snapshot.amount}€) para ${snapshot.clientCompany || snapshot.clientName} lleva ${snapshot.daysSinceCreated} días sin enviar.`,
      value: snapshot.amount,
      urgency: 'critical',
      data: {
        clientCompany: snapshot.clientCompany,
        clientSector: snapshot.clientSector,
        daysSinceCreated: snapshot.daysSinceCreated,
        score: snapshot.score,
      },
    };
  }

  return null;
}

async function ruleConversionDrop(userId: string): Promise<RuleTrigger | null> {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const sixtyDaysAgo = new Date();
  sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

  const allQuotes = await db
    .select()
    .from(quotes)
    .where(eq(quotes.userId, userId))
    .orderBy(desc(quotes.createdAt));

  if (allQuotes.length < 6) return null;

  const quoteIds = allQuotes.map(q => q.id);
  const statusMap = await getQuotesStatusesFromEvents(quoteIds);

  const recentQuotes = allQuotes.filter(q => new Date(q.createdAt) >= thirtyDaysAgo);
  const olderQuotes = allQuotes.filter(q => new Date(q.createdAt) >= sixtyDaysAgo && new Date(q.createdAt) < thirtyDaysAgo);

  const getConversion = (qs: typeof allQuotes) => {
    const ids = qs.map(q => q.id);
    const statuses = ids.map(id => statusMap.get(id) || 'draft');
    const nonDraft = statuses.filter(s => s !== 'draft');
    const accepted = statuses.filter(s => s === 'accepted');
    return nonDraft.length > 0 ? (accepted.length / nonDraft.length) * 100 : 0;
  };

  const recentRate = getConversion(recentQuotes);
  const olderRate = getConversion(olderQuotes);

  if (olderQuotes.length < 3) return null;
  if (recentQuotes.length < 2) return null;

  const drop = olderRate - recentRate;

  if (drop >= 10) {
    const recentSent = recentQuotes.filter(q => {
      const s = statusMap.get(q.id);
      return s === 'sent' || s === 'viewed' || s === 'rejected';
    });

    const recentRejected = recentQuotes.filter(q => statusMap.get(q.id) === 'rejected');

    return {
      id: `insight_conversion_${Date.now()}`,
      type: 'INSIGHT_ACTION',
      quoteId: recentQuotes[0]?.id || '',
      clientName: 'Análisis general',
      reason: `Tu conversión bajó de ${olderRate.toFixed(0)}% a ${recentRate.toFixed(0)}% (-${drop.toFixed(0)}pp). ${recentRejected.length} rechazados en los últimos 30 días. Revisa precios o estructura de propuestas.`,
      value: 0,
      urgency: drop >= 20 ? 'critical' : 'high',
      data: {
        previousRate: Math.round(olderRate * 10) / 10,
        currentRate: Math.round(recentRate * 10) / 10,
        drop: Math.round(drop * 10) / 10,
        recentQuotes: recentQuotes.length,
        recentRejected: recentRejected.length,
        recentSent: recentSent.length,
      },
    };
  }

  return null;
}

export async function evaluateAllRules(userId: string): Promise<RuleTrigger[]> {
  const snapshots = await fetchSnapshots(userId);

  const triggers: RuleTrigger[] = [];

  for (const s of snapshots) {
    const followUp = ruleFollowUp(s);
    if (followUp) triggers.push(followUp);

    const prioritize = rulePrioritize(s);
    if (prioritize) triggers.push(prioritize);

    const alert = ruleAlertUser(s);
    if (alert) triggers.push(alert);
  }

  const conversionDrop = await ruleConversionDrop(userId);
  if (conversionDrop) triggers.push(conversionDrop);

  const urgencyOrder = { critical: 5, high: 4, medium: 3, low: 2 };

  return triggers.sort((a, b) => {
    const urgencyDiff = (urgencyOrder[b.urgency] || 0) - (urgencyOrder[a.urgency] || 0);
    if (urgencyDiff !== 0) return urgencyDiff;
    return b.value - a.value;
  });
}

export function getTriggersByType(triggers: RuleTrigger[]): Record<TriggerType, RuleTrigger[]> {
  return {
    FOLLOW_UP: triggers.filter(t => t.type === 'FOLLOW_UP'),
    PRIORITIZE: triggers.filter(t => t.type === 'PRIORITIZE'),
    ALERT_USER: triggers.filter(t => t.type === 'ALERT_USER'),
    INSIGHT_ACTION: triggers.filter(t => t.type === 'INSIGHT_ACTION'),
  };
}
