import { db } from './index';
import { quoteEvents, quotes, quoteLines } from './schema';
import { eq, and, sql, desc, inArray } from 'drizzle-orm';
import { initializeAutomations, processEventWithAutomation } from '@/lib/automations';
import { QUOTE_EVENT_TYPES, QuoteEventType as QuoteEventTypeFromTypes } from './eventTypes';

export { QUOTE_EVENT_TYPES, QuoteEventTypeFromTypes as QuoteEventType };

// Inicializar automatizaciones al cargar el módulo
if (typeof window === 'undefined') {
  initializeAutomations();
}

export interface EventMetadata {
  [key: string]: unknown;
}

// ==================== EMISIÓN DE EVENTOS ====================

export async function emitEvent(
  type: string,
  quoteId: string,
  metadata?: EventMetadata
): Promise<void> {
  const [event] = await db
    .insert(quoteEvents)
    .values({
      quoteId,
      type,
      metadata: metadata || null,
    })
    .returning({
      id: quoteEvents.id,
      type: quoteEvents.type,
      quoteId: quoteEvents.quoteId,
      createdAt: quoteEvents.createdAt,
    });

  // Disparar automatizaciones (fire and forget)
  if (event) {
    processEventWithAutomation(event).catch((err) =>
      console.error('Automation processing failed:', err)
    );
  }
}

export async function emitQuoteCreated(quoteId: string, metadata?: EventMetadata): Promise<void> {
  await emitEvent(QUOTE_EVENT_TYPES.CREATED, quoteId, metadata);
}

export async function emitQuoteSent(quoteId: string, metadata?: EventMetadata): Promise<void> {
  await emitEvent(QUOTE_EVENT_TYPES.SENT, quoteId, metadata);
}

export async function emitQuoteViewed(quoteId: string, metadata?: EventMetadata): Promise<void> {
  await emitEvent(QUOTE_EVENT_TYPES.VIEWED, quoteId, metadata);
}

export async function emitQuoteAccepted(quoteId: string, metadata?: EventMetadata): Promise<void> {
  await emitEvent(QUOTE_EVENT_TYPES.ACCEPTED, quoteId, metadata);
}

export async function emitQuoteRejected(quoteId: string, metadata?: EventMetadata): Promise<void> {
  await emitEvent(QUOTE_EVENT_TYPES.REJECTED, quoteId, metadata);
}

// ==================== DERIVACIÓN DE ESTADOS ====================

export type QuoteStatusFromEvents = 'draft' | 'sent' | 'viewed' | 'accepted' | 'rejected';

export function deriveQuoteStatus(events: { type: string; createdAt: Date }[]): QuoteStatusFromEvents {
  if (events.length === 0) return 'draft';

  const sortedEvents = [...events].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const latestEvent = sortedEvents[0];

  switch (latestEvent.type) {
    case QUOTE_EVENT_TYPES.ACCEPTED: return 'accepted';
    case QUOTE_EVENT_TYPES.REJECTED: return 'rejected';
    case QUOTE_EVENT_TYPES.VIEWED: return 'viewed';
    case QUOTE_EVENT_TYPES.SENT: return 'sent';
    case QUOTE_EVENT_TYPES.CREATED: return 'draft';
    default: return 'draft';
  }
}

export async function getQuoteStatusFromEvents(quoteId: string): Promise<QuoteStatusFromEvents> {
  const latestEvent = await db
    .select({ type: quoteEvents.type, createdAt: quoteEvents.createdAt })
    .from(quoteEvents)
    .where(eq(quoteEvents.quoteId, quoteId))
    .orderBy(desc(quoteEvents.createdAt))
    .limit(1);

  if (latestEvent.length === 0) return 'draft';
  return deriveQuoteStatus(latestEvent);
}

export async function getQuotesStatusesFromEvents(
  quoteIds: string[]
): Promise<Map<string, QuoteStatusFromEvents>> {
  if (quoteIds.length === 0) return new Map();

  const latestEvents = await db
    .select({ quoteId: quoteEvents.quoteId, type: quoteEvents.type, createdAt: quoteEvents.createdAt })
    .from(quoteEvents)
    .where(inArray(quoteEvents.quoteId, quoteIds))
    .orderBy(quoteEvents.quoteId, desc(quoteEvents.createdAt));

  const statusMap = new Map<string, QuoteStatusFromEvents>();
  const seen = new Set<string>();

  for (const event of latestEvents) {
    if (!seen.has(event.quoteId)) {
      seen.add(event.quoteId);
      statusMap.set(event.quoteId, deriveQuoteStatus([event]));
    }
  }

  for (const id of quoteIds) {
    if (!statusMap.has(id)) statusMap.set(id, 'draft');
  }

  return statusMap;
}

// ==================== KPIs (Híbrido: Eventos + Status) ====================

export async function getQuoteKPIsFromEvents(
  userId: string,
  dateRange?: { start: Date; end: Date }
) {
  const userQuotesQuery = db
    .select({ id: quotes.id })
    .from(quotes)
    .where(eq(quotes.userId, userId))
    .as('user_quotes');

  const dateCondition = dateRange
    ? and(
        sql`${quoteEvents.createdAt} >= ${dateRange.start}`,
        sql`${quoteEvents.createdAt} <= ${dateRange.end}`
      )
    : undefined;

  const [sentByEvent, acceptedByEvent, rejectedByEvent, createdByEvent] = await Promise.all([
    db.select({ count: sql<number>`count(*)` }).from(quoteEvents)
      .innerJoin(userQuotesQuery, eq(quoteEvents.quoteId, userQuotesQuery.id))
      .where(and(eq(quoteEvents.type, QUOTE_EVENT_TYPES.SENT), dateCondition)),
    db.select({ count: sql<number>`count(*)` }).from(quoteEvents)
      .innerJoin(userQuotesQuery, eq(quoteEvents.quoteId, userQuotesQuery.id))
      .where(and(eq(quoteEvents.type, QUOTE_EVENT_TYPES.ACCEPTED), dateCondition)),
    db.select({ count: sql<number>`count(*)` }).from(quoteEvents)
      .innerJoin(userQuotesQuery, eq(quoteEvents.quoteId, userQuotesQuery.id))
      .where(and(eq(quoteEvents.type, QUOTE_EVENT_TYPES.REJECTED), dateCondition)),
    db.select({ count: sql<number>`count(*)` }).from(quoteEvents)
      .innerJoin(userQuotesQuery, eq(quoteEvents.quoteId, userQuotesQuery.id))
      .where(and(eq(quoteEvents.type, QUOTE_EVENT_TYPES.CREATED), dateCondition)),
  ]);

  // Contar por status (fallback para presupuestos sin eventos)
  const [sentByStatus, acceptedByStatus, rejectedByStatus, draftByStatus] = await Promise.all([
    db.select({ count: sql<number>`count(*)` }).from(quotes)
      .where(and(eq(quotes.userId, userId), eq(quotes.status, 'sent'))),
    db.select({ count: sql<number>`count(*)` }).from(quotes)
      .where(and(eq(quotes.userId, userId), eq(quotes.status, 'accepted'))),
    db.select({ count: sql<number>`count(*)` }).from(quotes)
      .where(and(eq(quotes.userId, userId), eq(quotes.status, 'rejected'))),
    db.select({ count: sql<number>`count(*)` }).from(quotes)
      .where(and(eq(quotes.userId, userId), eq(quotes.status, 'draft'))),
  ]);

  const sent = Math.max(Number(sentByEvent[0]?.count || 0), Number(sentByStatus[0]?.count || 0));
  const accepted = Math.max(Number(acceptedByEvent[0]?.count || 0), Number(acceptedByStatus[0]?.count || 0));
  const rejected = Math.max(Number(rejectedByEvent[0]?.count || 0), Number(rejectedByStatus[0]?.count || 0));
  const created = Math.max(Number(createdByEvent[0]?.count || 0), Number(draftByStatus[0]?.count || 0) + sent + accepted + rejected);

  return {
    sent,
    accepted,
    rejected,
    created,
    opportunities: Math.max(0, created - sent),
    conversionRate: sent > 0 ? ((accepted / sent) * 100).toFixed(2) : '0',
  };
}

// ==================== INGRESOS POTENCIALES (Híbrido) ====================

export async function getPotentialRevenueFromEvents(
  userId: string,
  dateRange?: { start: Date; end: Date }
) {
  // 1. Obtener presupuestos con evento ACCEPTED
  const acceptedQuotesSubquery = db
    .selectDistinct({ quoteId: quoteEvents.quoteId })
    .from(quoteEvents)
    .where(eq(quoteEvents.type, QUOTE_EVENT_TYPES.ACCEPTED))
    .as('accepted_quotes');

  const acceptedByEvent = await db
    .select({ quoteId: acceptedQuotesSubquery.quoteId })
    .from(acceptedQuotesSubquery)
    .innerJoin(quotes, eq(acceptedQuotesSubquery.quoteId, quotes.id))
    .where(eq(quotes.userId, userId));

  // 2. Obtener presupuestos con status 'accepted' (fallback)
  const acceptedByStatus = await db
    .select({ id: quotes.id })
    .from(quotes)
    .where(and(eq(quotes.userId, userId), eq(quotes.status, 'accepted')));

  // 3. Combinar IDs únicos
  const eventIds = new Set(acceptedByEvent.map(q => q.quoteId));
  const statusIds = new Set(acceptedByStatus.map(q => q.id));
  const allAcceptedIds = [...new Set([...eventIds, ...statusIds])];

  if (allAcceptedIds.length === 0) {
    return { potentialRevenue: 0, acceptedCount: 0 };
  }

  const revenueResult = await db
    .select({ total: sql<number>`COALESCE(sum(${quoteLines.totalAmount}), 0)` })
    .from(quoteLines)
    .where(inArray(quoteLines.quoteId, allAcceptedIds));

  return {
    potentialRevenue: Number(revenueResult[0]?.total || 0),
    acceptedCount: allAcceptedIds.length,
  };
}

// ==================== FUNNEL (Híbrido) ====================

export async function getQuoteFunnelFromEvents(
  userId: string,
  dateRange?: { start: Date; end: Date }
) {
  const userQuotesQuery = db
    .select({ id: quotes.id })
    .from(quotes)
    .where(eq(quotes.userId, userId))
    .as('user_quotes');

  const dateCondition = dateRange
    ? and(
        sql`${quoteEvents.createdAt} >= ${dateRange.start}`,
        sql`${quoteEvents.createdAt} <= ${dateRange.end}`
      )
    : undefined;

  const buildWhere = (type: string) => {
    const base = eq(quoteEvents.type, type);
    return dateCondition ? and(base, dateCondition) : base;
  };

  const [createdByEvent, sentByEvent, viewedByEvent, acceptedByEvent, rejectedByEvent] = await Promise.all([
    db.select({ count: sql<number>`count(distinct ${quoteEvents.quoteId})` })
      .from(quoteEvents)
      .innerJoin(userQuotesQuery, eq(quoteEvents.quoteId, userQuotesQuery.id))
      .where(buildWhere(QUOTE_EVENT_TYPES.CREATED)),
    db.select({ count: sql<number>`count(distinct ${quoteEvents.quoteId})` })
      .from(quoteEvents)
      .innerJoin(userQuotesQuery, eq(quoteEvents.quoteId, userQuotesQuery.id))
      .where(buildWhere(QUOTE_EVENT_TYPES.SENT)),
    db.select({ count: sql<number>`count(distinct ${quoteEvents.quoteId})` })
      .from(quoteEvents)
      .innerJoin(userQuotesQuery, eq(quoteEvents.quoteId, userQuotesQuery.id))
      .where(buildWhere(QUOTE_EVENT_TYPES.VIEWED)),
    db.select({ count: sql<number>`count(distinct ${quoteEvents.quoteId})` })
      .from(quoteEvents)
      .innerJoin(userQuotesQuery, eq(quoteEvents.quoteId, userQuotesQuery.id))
      .where(buildWhere(QUOTE_EVENT_TYPES.ACCEPTED)),
    db.select({ count: sql<number>`count(distinct ${quoteEvents.quoteId})` })
      .from(quoteEvents)
      .innerJoin(userQuotesQuery, eq(quoteEvents.quoteId, userQuotesQuery.id))
      .where(buildWhere(QUOTE_EVENT_TYPES.REJECTED)),
  ]);

  // Contar por status (fallback)
  const [draftByStatus, sentByStatus, acceptedByStatus, rejectedByStatus] = await Promise.all([
    db.select({ count: sql<number>`count(*)` }).from(quotes)
      .where(and(eq(quotes.userId, userId), eq(quotes.status, 'draft'))),
    db.select({ count: sql<number>`count(*)` }).from(quotes)
      .where(and(eq(quotes.userId, userId), eq(quotes.status, 'sent'))),
    db.select({ count: sql<number>`count(*)` }).from(quotes)
      .where(and(eq(quotes.userId, userId), eq(quotes.status, 'accepted'))),
    db.select({ count: sql<number>`count(*)` }).from(quotes)
      .where(and(eq(quotes.userId, userId), eq(quotes.status, 'rejected'))),
  ]);

  return {
    created: Math.max(Number(createdByEvent[0]?.count || 0), Number(draftByStatus[0]?.count || 0)),
    sent: Math.max(Number(sentByEvent[0]?.count || 0), Number(sentByStatus[0]?.count || 0)),
    viewed: Number(viewedByEvent[0]?.count || 0),
    accepted: Math.max(Number(acceptedByEvent[0]?.count || 0), Number(acceptedByStatus[0]?.count || 0)),
    rejected: Math.max(Number(rejectedByEvent[0]?.count || 0), Number(rejectedByStatus[0]?.count || 0)),
  };
}

// ==================== ACTIVIDAD RECIENTE ====================

export async function getRecentActivityFromEvents(
  userId: string,
  limit: number = 10
) {
  const userQuotesQuery = db
    .select({ id: quotes.id, title: quotes.title, clientName: quotes.clientName })
    .from(quotes)
    .where(eq(quotes.userId, userId))
    .as('user_quotes');

  const events = await db
    .select({
      id: quoteEvents.id,
      type: quoteEvents.type,
      metadata: quoteEvents.metadata,
      createdAt: quoteEvents.createdAt,
      quoteId: quoteEvents.quoteId,
      quoteTitle: userQuotesQuery.title,
      clientName: userQuotesQuery.clientName,
    })
    .from(quoteEvents)
    .innerJoin(userQuotesQuery, eq(quoteEvents.quoteId, userQuotesQuery.id))
    .orderBy(desc(quoteEvents.createdAt))
    .limit(limit);

  return events.map(event => ({
    id: event.id,
    type: event.type,
    quoteId: event.quoteId,
    quoteTitle: event.quoteTitle || 'Sin título',
    clientName: event.clientName || 'Cliente desconocido',
    metadata: event.metadata as EventMetadata | null,
    timestamp: event.createdAt,
  }));
}

// ==================== DASHBOARD DATA (CONSOLIDADO) ====================

export interface DashboardDataFromEvents {
  kpis: {
    potentialRevenue: number;
    potentialRevenueChange: number;
    conversionRate: number;
    conversionRateChange: number;
    sent: number;
    sentChange: number;
    accepted: number;
    acceptedChange: number;
  };
  funnel: {
    created: number;
    sent: number;
    viewed: number;
    accepted: number;
    rejected: number;
  };
  recentActivity: Awaited<ReturnType<typeof getRecentActivityFromEvents>>;
}

export async function getDashboardDataFromEvents(
  userId: string
): Promise<DashboardDataFromEvents> {
  const [kpis, funnel, revenueData, recentActivity] = await Promise.all([
    getQuoteKPIsFromEvents(userId),
    getQuoteFunnelFromEvents(userId),
    getPotentialRevenueFromEvents(userId),
    getRecentActivityFromEvents(userId, 10),
  ]);

  return {
    kpis: {
      potentialRevenue: revenueData.potentialRevenue,
      potentialRevenueChange: 0,
      conversionRate: parseFloat(kpis.conversionRate),
      conversionRateChange: 0,
      sent: kpis.sent,
      sentChange: 0,
      accepted: kpis.accepted,
      acceptedChange: 0,
    },
    funnel,
    recentActivity,
  };
}
