// lib/services/clientTimelineService.ts
import { db } from '@/lib/db';
import { quoteEvents, quotes, clients } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';
import { QUOTE_EVENT_TYPES } from '@/lib/db/eventTypes';

export interface TimelineInteraction {
  id: string;
  date: Date;
  type: string;
  eventType: string;
  description: string;
  impact: 'high_positive' | 'medium_positive' | 'low_positive' | 'neutral' | 'low_negative' | 'medium_negative' | 'high_negative';
  quoteId: string;
  quoteTitle: string;
  metadata?: Record<string, any>;
}

export interface TimelineResult {
  success: boolean;
  interactions?: TimelineInteraction[];
  clientName?: string;
  error?: string;
}

/**
 * Obtiene el timeline de interacciones de un cliente
 * Basado en quote_events relacionados via quotes
 */
export async function getClientTimeline(
  clientId: number,
  userId: string,
  options?: { limit?: number }
): Promise<TimelineResult> {
  try {
    // 1. Verificar que el cliente pertenece al usuario
    const client = await db
      .select({ id: clients.id, name: clients.name })
      .from(clients)
      .where(eq(clients.id, clientId))
      .limit(1);

    if (!client[0]) {
      return { success: false, error: 'Client not found' };
    }

    // Verificar pertenencia al usuario
    const clientCheck = await db
      .select({ userId: clients.userId })
      .from(clients)
      .where(eq(clients.id, clientId))
      .limit(1);

    if (clientCheck[0]?.userId !== userId) {
      return { success: false, error: 'Unauthorized' };
    }

    // 2. Obtener eventos via quotes del cliente
    const eventsQuery = db
      .select({
        id: quoteEvents.id,
        date: quoteEvents.createdAt,
        eventType: quoteEvents.type,
        metadata: quoteEvents.metadata,
        quoteId: quoteEvents.quoteId,
        quoteTitle: quotes.title,
      })
      .from(quoteEvents)
      .innerJoin(quotes, eq(quoteEvents.quoteId, quotes.id))
      .where(eq(quotes.clientId, clientId))
      .orderBy(desc(quoteEvents.createdAt));

    const events = options?.limit ? eventsQuery.limit(options.limit) : eventsQuery;

    const eventsData = await eventsQuery;

    // 3. Mapear a TimelineInteractions
    const interactions: TimelineInteraction[] = eventsData.map(event => ({
      id: event.id,
      date: new Date(event.date),
      type: mapEventTypeToDisplay(event.eventType),
      eventType: event.eventType,
      description: generateDescription(event.eventType, event.quoteTitle || 'Sin título', event.metadata),
      impact: calculateImpact(event.eventType),
      quoteId: event.quoteId,
      quoteTitle: event.quoteTitle || 'Sin título',
      metadata: event.metadata as Record<string, any> || undefined,
    }));

    return {
      success: true,
      interactions,
      clientName: client[0].name,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Mapea tipo de evento a etiqueta legible
 */
function mapEventTypeToDisplay(eventType: string): string {
  const mapping: Record<string, string> = {
    [QUOTE_EVENT_TYPES.CREATED]: 'Presupuesto Creado',
    [QUOTE_EVENT_TYPES.SENT]: 'Presupuesto Enviado',
    [QUOTE_EVENT_TYPES.VIEWED]: 'Presupuesto Visto',
    [QUOTE_EVENT_TYPES.ACCEPTED]: 'Presupuesto Aceptado',
    [QUOTE_EVENT_TYPES.REJECTED]: 'Presupuesto Rechazado',
    [QUOTE_EVENT_TYPES.FOLLOWUP_SENT]: 'Seguimiento Enviado',
    [QUOTE_EVENT_TYPES.FOLLOWUP_NEEDED]: 'Seguimiento Necesario',
  };

  return mapping[eventType] || eventType;
}

/**
 * Genera descripción basada en el evento
 */
function generateDescription(
  eventType: string,
  quoteTitle: string,
  metadata?: any
): string {
  const clientName = metadata?.clientName || 'Cliente';

  switch (eventType) {
    case QUOTE_EVENT_TYPES.CREATED:
      return `Se creó el presupuesto "${quoteTitle}"`;
    case QUOTE_EVENT_TYPES.SENT:
      return `Se envió el presupuesto "${quoteTitle}" al cliente`;
    case QUOTE_EVENT_TYPES.VIEWED:
      const viewSource = metadata?.source === 'email_open' ? 'abrió el email' :
                         metadata?.source === 'email_click' ? 'hizo clic en el enlace' :
                         'vio el presupuesto';
      return `El cliente ${viewSource} "${quoteTitle}"`;
    case QUOTE_EVENT_TYPES.ACCEPTED:
      return `¡El cliente aceptó el presupuesto "${quoteTitle}"! 🎉`;
    case QUOTE_EVENT_TYPES.REJECTED:
      return `El cliente rechazó el presupuesto "${quoteTitle}"`;
    case QUOTE_EVENT_TYPES.FOLLOWUP_SENT:
      return `Se envió seguimiento automático para "${quoteTitle}"`;
    default:
      return `Evento ${eventType} en "${quoteTitle}"`;
  }
}

/**
 * Calcula el impacto del evento
 */
function calculateImpact(eventType: string): TimelineInteraction['impact'] {
  switch (eventType) {
    case QUOTE_EVENT_TYPES.ACCEPTED:
      return 'high_positive';
    case QUOTE_EVENT_TYPES.REJECTED:
      return 'high_negative';
    case QUOTE_EVENT_TYPES.SENT:
      return 'medium_positive';
    case QUOTE_EVENT_TYPES.FOLLOWUP_SENT:
      return 'medium_positive';
    case QUOTE_EVENT_TYPES.VIEWED:
      return 'low_positive';
    case QUOTE_EVENT_TYPES.CREATED:
      return 'neutral';
    case QUOTE_EVENT_TYPES.FOLLOWUP_NEEDED:
      return 'low_negative';
    default:
      return 'neutral';
  }
}

/**
 * Obtener estadísticas de interacciones por cliente
 */
export async function getClientInteractionStats(
  clientId: number,
  userId: string
): Promise<{
  totalEvents: number;
  lastInteraction?: Date;
  acceptedCount: number;
  rejectedCount: number;
  viewedCount: number;
} | null> {
  try {
    // Verificar pertenencia
    const client = await db
      .select({ userId: clients.userId })
      .from(clients)
      .where(eq(clients.id, clientId))
      .limit(1);

    if (client[0]?.userId !== userId) return null;

    // Obtener todos los eventos del cliente
    const events = await db
      .select({ type: quoteEvents.type, date: quoteEvents.createdAt })
      .from(quoteEvents)
      .innerJoin(quotes, eq(quoteEvents.quoteId, quotes.id))
      .where(eq(quotes.clientId, clientId))
      .orderBy(desc(quoteEvents.createdAt));

    const totalEvents = events.length;
    const lastInteraction = events[0] ? new Date(events[0].date) : undefined;
    const acceptedCount = events.filter(e => e.type === QUOTE_EVENT_TYPES.ACCEPTED).length;
    const rejectedCount = events.filter(e => e.type === QUOTE_EVENT_TYPES.REJECTED).length;
    const viewedCount = events.filter(e => e.type === QUOTE_EVENT_TYPES.VIEWED).length;

    return {
      totalEvents,
      lastInteraction,
      acceptedCount,
      rejectedCount,
      viewedCount,
    };
  } catch (error) {
    console.error('Error getting client interaction stats:', error);
    return null;
  }
}
