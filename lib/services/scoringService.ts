// lib/services/scoringService.ts
import { google } from '@ai-sdk/google';
import { generateText } from 'ai';
import { db } from '@/lib/db';
import { quotes, quoteEvents, clients } from '@/lib/db/schema';
import { eq, and, avg, count, gte } from 'drizzle-orm';
import { QUOTE_EVENT_TYPES } from '@/lib/db/eventTypes';

const apiKey = process.env.GOOGLE_AI_API_KEY;
const model = apiKey ? google('gemini-1.5-flash', { apiKey }) : null;

export interface ScoringFactors {
  textQuality: number;      // 0-40
  priceCompetitiveness: number; // 0-30
  clientTypeBonus: number;     // 0-20
  historicalSuccess: number;    // 0-10
  totalScore: number;         // 0-100
}

export interface ScoringResult {
  success: boolean;
  scoring?: ScoringFactors;
  probability?: number; // 0-100
  error?: string;
}

/**
 * Calcula score realista basado en múltiples factores
 */
export async function calculateAdvancedScore(quoteId: string): Promise<ScoringResult> {
  try {
    // 1. Obtener datos del presupuesto
    const quote = await db
      .select({
        id: quotes.id,
        title: quotes.title,
        content: quotes.content,
        userId: quotes.userId,
        clientName: quotes.clientName,
        clientId: quotes.clientId,
        price: quotes.price,
      })
      .from(quotes)
      .where(eq(quotes.id, quoteId))
      .limit(1);

    if (!quote[0]) {
      return { success: false, error: 'Quote not found' };
    }

    const quoteData = quote[0];

    // 2. Calcular factores en paralelo
    const [textQuality, priceScore, clientBonus, historyScore] = await Promise.all([
      analyzeTextQuality(quoteData.content || ''),
      calculatePriceCompetitiveness(quoteData.userId, quoteData.price),
      calculateClientTypeBonus(quoteData.clientId, quoteData.userId),
      calculateHistoricalSuccess(quoteData.userId),
    ]);

    const scoring: ScoringFactors = {
      textQuality,
      priceCompetitiveness: priceScore,
      clientTypeBonus: clientBonus,
      historicalSuccess: historyScore,
      totalScore: Math.min(100, textQuality + priceScore + clientBonus + historyScore),
    };

    // 3. Actualizar score en BD
    await db
      .update(quotes)
      .set({ score: scoring.totalScore })
      .where(eq(quotes.id, quoteId));

    // 4. Actualizar probabilidad en analysis
    const analysis = await db
      .select({ analysis: quotes.analysis })
      .from(quotes)
      .where(eq(quotes.id, quoteId))
      .limit(1);

    const currentAnalysis = (analysis[0]?.analysis as any) || {};
    const updatedAnalysis = {
      ...currentAnalysis,
      probability: scoring.totalScore,
      scoringFactors: scoring,
      scoredAt: new Date().toISOString(),
    };

    await db
      .update(quotes)
      .set({ analysis: updatedAnalysis })
      .where(eq(quotes.id, quoteId));

    return {
      success: true,
      scoring,
      probability: scoring.totalScore,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Analiza calidad del texto con IA (0-40 puntos)
 */
async function analyzeTextQuality(content: string): Promise<number> {
  if (!content || content.length < 50) return 10; // Muy corto
  if (!model) return 20; // Default si no hay IA

  try {
    const prompt = `Analyze the quality of this quote text and return ONLY a number between 0 and 40.

Criteria:
- Clarity and professionalism (0-15 points)
- Completeness of information (0-15 points)
- Grammar and formatting (0-10 points)

Text to analyze (first 1000 chars):
${content.substring(0, 1000)}

Return ONLY the number, nothing else.`;

    const { text } = await generateText({
      model,
      prompt,
      maxTokens: 10,
    });

    const score = parseInt(text.trim(), 10);
    return isNaN(score) ? 20 : Math.min(40, Math.max(0, score));
  } catch {
    // Heurística simple si falla IA
    const words = content.split(/\s+/).length;
    if (words < 50) return 15;
    if (words < 100) return 25;
    return 35;
  }
}

/**
 * Calcula competitividad de precio (0-30 puntos)
 */
async function calculatePriceCompetitiveness(userId: string, priceStr: string | null): Promise<number> {
  if (!priceStr) return 15; // Default

  const currentPrice = parseFloat(priceStr.replace(/[^0-9.]/g, ''));
  if (isNaN(currentPrice) || currentPrice === 0) return 15;

  // Obtener promedio de precios históricos del usuario
  const historicalQuotes = await db
    .select({ price: quotes.price })
    .from(quotes)
    .where(and(eq(quotes.userId, userId), eq(quotes.price, priceStr))); // Simplified, should parse prices

  // Heurística: comparar con rangos razonables
  if (currentPrice < 100) return 30; // Muy accesible
  if (currentPrice < 500) return 25;
  if (currentPrice < 1000) return 20;
  if (currentPrice < 5000) return 15;
  return 10; // Precio alto
}

/**
 * Bonus por tipo de cliente (0-20 puntos)
 */
async function calculateClientTypeBonus(
  clientId: number | null,
  userId: string
): Promise<number> {
  if (!clientId) return 5; // Cliente nuevo, poco historial

  try {
    // Verificar si el cliente tiene presupuestos anteriores
    const clientQuotes = await db
      .select({ id: quotes.id })
      .from(quotes)
      .where(and(eq(quotes.clientId, clientId), eq(quotes.userId, userId)));

    const quoteCount = clientQuotes.length;

    if (quoteCount === 0) return 5; // Nuevo cliente
    if (quoteCount <= 2) return 10; // Cliente ocasional

    // Verificar si tiene aceptaciones previas
    const acceptedEvents = await db
      .select({ count: count() })
      .from(quoteEvents)
      .where(
        and(
          eq(quoteEvents.quoteId, clientQuotes[0].id), // Simplified - should check all quotes
          eq(quoteEvents.type, QUOTE_EVENT_TYPES.ACCEPTED)
        )
      );

    const hasAcceptance = parseInt(acceptedEvents[0]?.count as any, 10) > 0;

    if (hasAcceptance) return 20; // Cliente recurrente con éxito
    if (quoteCount > 5) return 15; // Cliente frecuente
    return 10;
  } catch {
    return 5;
  }
}

/**
 * Éxito histórico del usuario (0-10 puntos)
 */
async function calculateHistoricalSuccess(userId: string): Promise<number> {
  try {
    // Obtener total de presupuestos enviados
    const totalSent = await db
      .select({ count: count() })
      .from(quoteEvents)
      .innerJoin(quotes, eq(quoteEvents.quoteId, quotes.id))
      .where(
        and(
          eq(quotes.userId, userId),
          eq(quoteEvents.type, QUOTE_EVENT_TYPES.SENT)
        )
      );

    const sentCount = parseInt(totalSent[0]?.count as any, 10);
    if (sentCount === 0) return 5; // No hay historial

    // Obtener total de aceptados
    const totalAccepted = await db
      .select({ count: count() })
      .from(quoteEvents)
      .innerJoin(quotes, eq(quoteEvents.quoteId, quotes.id))
      .where(
        and(
          eq(quotes.userId, userId),
          eq(quoteEvents.type, QUOTE_EVENT_TYPES.ACCEPTED)
        )
      );

    const acceptedCount = parseInt(totalAccepted[0]?.count as any, 10);
    const successRate = (acceptedCount / sentCount) * 100;

    // Mapear tasa de éxito a puntos (0-10)
    if (successRate >= 70) return 10;
    if (successRate >= 50) return 8;
    if (successRate >= 30) return 5;
    if (successRate >= 15) return 3;
    return 1;
  } catch {
    return 3; // Default conservador
  }
}

/**
 * Recalcular probabilidad de cierre para todos los presupuestos abiertos
 */
export async function recalculateAllScores(userId: string): Promise<{
  updated: number;
  errors: number;
}> {
  const userQuotes = await db
    .select({ id: quotes.id })
    .from(quotes)
    .where(eq(quotes.userId, userId));

  let updated = 0;
  let errors = 0;

  for (const quote of userQuotes) {
    const result = await calculateAdvancedScore(quote.id);
    if (result.success) {
      updated++;
    } else {
      errors++;
    }
  }

  return { updated, errors };
}
