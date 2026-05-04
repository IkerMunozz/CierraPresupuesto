// lib/services/salesContext.ts
import { db } from '@/lib/db';
import { quotes, quoteEvents, quoteLines, clients, emailTracking } from '@/lib/db/schema';
import { eq, and, desc, count } from 'drizzle-orm';
import { QUOTE_EVENT_TYPES, QuoteEventType } from '@/lib/db/eventTypes';
import { deriveQuoteStatus } from '@/lib/db/events';

export interface FollowUpEvent {
  sentAt: Date;
  stage: number;
  opened: boolean;
}

export interface SalesContext {
  quoteId: string;
  status: 'draft' | 'sent' | 'viewed' | 'accepted' | 'rejected';
  daysSinceSent: number;
  viewCount: number;
  lastEvent: {
    type: QuoteEventType;
    date: Date;
  };
  score: number;
  amount: number;
  clientType: 'nuevo' | 'recurrente' | 'corporativo' | 'particular';
  clientName: string;
  clientCompany: string | null;
  followUps: FollowUpEvent[];
  createdAt: Date;
}

export async function buildSalesContext(quoteId: string): Promise<SalesContext | null> {
  const quote = await db
    .select({
      id: quotes.id,
      title: quotes.title,
      clientName: quotes.clientName,
      clientId: quotes.clientId,
      score: quotes.score,
      createdAt: quotes.createdAt,
      clientCompany: clients.company,
      clientEmail: clients.email,
      clientStatus: clients.status,
    })
    .from(quotes)
    .leftJoin(clients, eq(quotes.clientId, clients.id))
    .where(eq(quotes.id, quoteId))
    .limit(1);

  if (!quote[0]) return null;

  const [events, amountRows, followUpEmails, clientQuoteCount] = await Promise.all([
    db
      .select({ type: quoteEvents.type, createdAt: quoteEvents.createdAt, metadata: quoteEvents.metadata })
      .from(quoteEvents)
      .where(eq(quoteEvents.quoteId, quoteId))
      .orderBy(desc(quoteEvents.createdAt)),

    db
      .select({ totalAmount: quoteLines.totalAmount })
      .from(quoteLines)
      .where(eq(quoteLines.quoteId, quoteId)),

    db
      .select({ emailId: emailTracking.emailId, openedAt: emailTracking.openedAt })
      .from(emailTracking)
      .where(and(eq(emailTracking.quoteId, quoteId), eq(emailTracking.eventType, QUOTE_EVENT_TYPES.FOLLOWUP_SENT))),

    quote[0].clientId
      ? db
          .select({ count: count() })
          .from(quotes)
          .where(and(eq(quotes.clientId, quote[0].clientId), eq(quotes.status, 'accepted')))
          .then(r => r[0]?.count ?? 0)
      : Promise.resolve(0),
  ]);

  const amount = amountRows.reduce((sum, row) => sum + Number(row.totalAmount), 0);

  const sortedEvents = [...events].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const status = sortedEvents.length > 0
    ? deriveQuoteStatus(sortedEvents)
    : 'draft';

  const sentEvent = sortedEvents.find(e => e.type === QUOTE_EVENT_TYPES.SENT);
  const daysSinceSent = sentEvent
    ? Math.floor((Date.now() - new Date(sentEvent.createdAt).getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  const viewCount = events.filter(e => e.type === QUOTE_EVENT_TYPES.VIEWED).length;

  const lastEvent = sortedEvents[0]
    ? { type: sortedEvents[0].type as QuoteEventType, date: sortedEvents[0].createdAt }
    : { type: QUOTE_EVENT_TYPES.CREATED, date: quote[0].createdAt };

  const followUps = buildFollowUpHistory(events, followUpEmails);

  const clientType = resolveClientType({
    hasCompany: !!quote[0].clientCompany,
    hasClientId: !!quote[0].clientId,
    acceptedQuotes: clientQuoteCount,
    clientStatus: quote[0].clientStatus,
  });

  return {
    quoteId,
    status,
    daysSinceSent,
    viewCount,
    lastEvent,
    score: quote[0].score ?? 0,
    amount,
    clientType,
    clientName: quote[0].clientName,
    clientCompany: quote[0].clientCompany,
    followUps,
    createdAt: quote[0].createdAt,
  };
}

function buildFollowUpHistory(
  events: { type: string; createdAt: Date; metadata: unknown }[],
  tracked: { emailId: string | null; openedAt: Date | null }[]
): FollowUpEvent[] {
  const followUpEvents = events.filter(e => e.type === QUOTE_EVENT_TYPES.FOLLOWUP_SENT);
  const openedEmailIds = new Set(tracked.filter(t => t.openedAt).map(t => t.emailId));

  return followUpEvents
    .map(e => ({
      sentAt: e.createdAt,
      stage: (e.metadata as Record<string, number> | null)?.stage ?? 1,
      opened: false,
    }))
    .sort((a, b) => a.sentAt.getTime() - b.sentAt.getTime());
}

function resolveClientType(ctx: {
  hasCompany: boolean;
  hasClientId: boolean;
  acceptedQuotes: number;
  clientStatus: string | null;
}): 'nuevo' | 'recurrente' | 'corporativo' | 'particular' {
  if (ctx.hasCompany) return 'corporativo';
  if (ctx.acceptedQuotes > 1) return 'recurrente';
  if (ctx.clientStatus === 'active') return 'recurrente';
  if (!ctx.hasClientId) return 'nuevo';
  return 'particular';
}
