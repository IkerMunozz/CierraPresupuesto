// lib/services/pipelineService.ts
import { db } from '@/lib/db';
import { clients, quoteEvents, quotes } from '@/lib/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { emitEvent, QUOTE_EVENT_TYPES } from '@/lib/db/events';
import { getQuoteStatusFromEvents } from '@/lib/db/events';

export type PipelineStage = 'lead' | 'contactado' | 'propuesta' | 'negociacion' | 'ganado' | 'perdido';

export interface PipelineStats {
  stage: PipelineStage;
  count: number;
  totalValue: number;
  opportunities: number;
}

export interface PipelineMoveResult {
  success: boolean;
  oldStage?: PipelineStage;
  newStage?: PipelineStage;
  error?: string;
}

/**
 * Mover un cliente a una nueva etapa del pipeline
 * Emitir evento correspondiente
 */
export async function moveClientToStage(
  clientId: number,
  newStage: PipelineStage,
  userId: string,
  metadata?: Record<string, any>
): Promise<PipelineMoveResult> {
  try {
    // 1. Verificar que el cliente pertenece al usuario
    const client = await db
      .select({ 
        id: clients.id, 
        userId: clients.userId, 
        name: clients.name,
        pipelineStage: clients.pipelineStage 
      })
      .from(clients)
      .where(eq(clients.id, clientId))
      .limit(1);

    if (!client[0]) {
      return { success: false, error: 'Client not found' };
    }

    if (client[0].userId !== userId) {
      return { success: false, error: 'Unauthorized' };
    }

    const oldStage = client[0].pipelineStage as PipelineStage;

    if (oldStage === newStage) {
      return { success: true, oldStage, newStage };
    }

    // 2. Actualizar etapa en BD
    await db
      .update(clients)
      .set({ 
        pipelineStage: newStage, 
        updatedAt: new Date(),
        // Si es ganado/perdido, actualizar también el status
        ...(newStage === 'ganado' ? { status: 'active' as const } : {}),
        ...(newStage === 'perdido' ? { status: 'lost' as const } : {}),
      })
      .where(eq(clients.id, clientId));

    // 3. Emitir evento de cambio de etapa
    const stageToEventType: Record<PipelineStage, string> = {
      'lead': QUOTE_EVENT_TYPES.CREATED, // No hay evento específico, usar CREATED
      'contactado': 'CLIENT_CONTACTED',
      'propuesta': QUOTE_EVENT_TYPES.SENT,
      'negociacion': 'CLIENT_NEGOTIATING',
      'ganado': QUOTE_EVENT_TYPES.ACCEPTED,
      'perdido': QUOTE_EVENT_TYPES.REJECTED,
    };

    // Emitir evento genérico de cambio de etapa
    await emitEvent('PIPELINE_STAGE_CHANGE', '', {
      clientId,
      clientName: client[0].name,
      oldStage,
      newStage,
      ...metadata,
    });

    // Emitir también el evento específico si existe
    const specificEventType = stageToEventType[newStage];
    if (specificEventType && specificEventType !== 'PIPELINE_STAGE_CHANGE') {
      // Buscar el quoteId más reciente del cliente para el evento
      const latestQuote = await db
        .select({ id: quotes.id })
        .from(quotes)
        .where(eq(quotes.clientId, clientId))
        .orderBy(desc(quotes.createdAt))
        .limit(1);

      if (latestQuote[0]) {
        await emitEvent(specificEventType, latestQuote[0].id, {
          clientId,
          pipelineStage: newStage,
          ...metadata,
        });
      }
    }

    return { success: true, oldStage, newStage };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Obtener estadísticas del pipeline para un usuario
 */
export async function getPipelineStats(userId: string): Promise<PipelineStats[]> {
  const stages: PipelineStage[] = ['lead', 'contactado', 'propuesta', 'negociacion', 'ganado', 'perdido'];
  
  const stats: PipelineStats[] = [];

  for (const stage of stages) {
    const clientsInStage = await db
      .select({ 
        count: db.$count(),
        totalValue: clients.potentialValue,
      })
      .from(clients)
      .where(and(
        eq(clients.userId, userId),
        eq(clients.pipelineStage, stage)
      ));

    const totalValue = clientsInStage.reduce((sum, c) => sum + Number(c.totalValue || 0), 0);
    const opportunities = clientsInStage.length;

    stats.push({
      stage,
      count: opportunities,
      totalValue,
      opportunities,
    });
  }

  return stats;
}

/**
 * Obtener clientes por etapa (para el tablero Kanban)
 */
export async function getClientsByStage(
  userId: string,
  stage: PipelineStage
): Promise<{
  id: number;
  name: string;
  company: string | null;
  potentialValue: number;
  lastInteraction?: Date;
}[]> {
  const clientsData = await db
    .select({
      id: clients.id,
      name: clients.name,
      company: clients.company,
      potentialValue: clients.potentialValue,
      updatedAt: clients.updatedAt,
    })
    .from(clients)
    .where(and(
      eq(clients.userId, userId),
      eq(clients.pipelineStage, stage)
    ))
    .orderBy(desc(clients.updatedAt));

  return clientsData.map(c => ({
    id: c.id,
    name: c.name,
    company: c.company,
    potentialValue: Number(c.potentialValue || 0),
    lastInteraction: c.updatedAt,
  }));
}

/**
 * Auto-actualizar etapa basado en eventos de presupuestos
 * Esta función se debe llamar cuando se emite un evento
 */
export async function updatePipelineFromEvent(
  clientId: number,
  eventType: string
): Promise<void> {
  try {
    // Mapear eventos a etapas
    const eventToStage: Record<string, PipelineStage> = {
      [QUOTE_EVENT_TYPES.CREATED]: 'lead',
      [QUOTE_EVENT_TYPES.SENT]: 'propuesta',
      [QUOTE_EVENT_TYPES.VIEWED]: 'negociacion',
      [QUOTE_EVENT_TYPES.ACCEPTED]: 'ganado',
      [QUOTE_EVENT_TYPES.REJECTED]: 'perdido',
    };

    const newStage = eventToStage[eventType];
    if (!newStage) return;

    // Verificar etapa actual
    const client = await db
      .select({ pipelineStage: clients.pipelineStage })
      .from(clients)
      .where(eq(clients.id, clientId))
      .limit(1);

    if (!client[0]) return;

    const currentStage = client[0].pipelineStage as PipelineStage;

    // Solo mover si la nueva etapa es "posterior" (lógica de negocio)
    const stageOrder = ['lead', 'contactado', 'propuesta', 'negociacion', 'ganado', 'perdido'];
    const currentIndex = stageOrder.indexOf(currentStage);
    const newIndex = stageOrder.indexOf(newStage);

    // Mover si la nueva etapa es igual o posterior (no retroceder excepto para perdido)
    if (newStage === 'perdido' || newIndex >= currentIndex) {
      await db
        .update(clients)
        .set({ pipelineStage: newStage, updatedAt: new Date() })
        .where(eq(clients.id, clientId));
    }
  } catch (error) {
    console.error('Error updating pipeline from event:', error);
  }
}

/**
 * Obtener resumen del pipeline (para dashboard)
 */
export async function getPipelineSummary(userId: string): Promise<{
  totalClients: number;
  totalValue: number;
  conversionRate: number;
  stageDistribution: PipelineStats[];
}> {
  const allClients = await db
    .select({
      pipelineStage: clients.pipelineStage,
      potentialValue: clients.potentialValue,
    })
    .from(clients)
    .where(eq(clients.userId, userId));

  const totalClients = allClients.length;
  const totalValue = allClients.reduce((sum, c) => sum + Number(c.potentialValue || 0), 0);

  const stageDistribution = await getPipelineStats(userId);

  // Calcular tasa de conversión (ganado / total)
  const ganado = stageDistribution.find(s => s.stage === 'ganado');
  const conversionRate = totalClients > 0 && ganado ? (ganado.count / totalClients) * 100 : 0;

  return {
    totalClients,
    totalValue,
    conversionRate,
    stageDistribution,
  };
}
