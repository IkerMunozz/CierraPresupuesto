// lib/services/revenuePredictionService.ts
import { db } from '@/lib/db';
import { quotes, quoteLines } from '@/lib/db/schema';
import { eq, inArray } from 'drizzle-orm';
import { getQuotesStatusesFromEvents } from '@/lib/db/events';
import { QUOTE_EVENT_TYPES } from '@/lib/db/eventTypes';

export interface QuotePredictionDetail {
  quoteId: string;
  title: string;
  clientName: string;
  amount: number;
  probability: number; // 0-1
  expectedValue: number;
  status: string;
}

export interface RevenuePrediction {
  expected: number; // expected revenue next 30 days
  optimistic: number;
  pessimistic: number;
  details: QuotePredictionDetail[];
  totalOpenQuotes: number;
  averageProbability: number;
}

/**
 * Calcula predicción de ingresos basada en eventos y probabilidad de cierre
 */
export async function getRevenuePrediction(
  userId: string
): Promise<RevenuePrediction> {
  // 1. Obtener todos los presupuestos del usuario
  const userQuotes = await db
    .select({
      id: quotes.id,
      title: quotes.title,
      clientName: quotes.clientName,
      analysis: quotes.analysis,
    })
    .from(quotes)
    .where(eq(quotes.userId, userId));

  if (userQuotes.length === 0) {
    return {
      expected: 0,
      optimistic: 0,
      pessimistic: 0,
      details: [],
      totalOpenQuotes: 0,
      averageProbability: 0,
    };
  }

  const quoteIds = userQuotes.map(q => q.id);

  // 2. Obtener estados desde eventos
  const statusMap = await getQuotesStatusesFromEvents(quoteIds);

  // 3. Obtener montos de quoteLines
  const lines = await db
    .select({
      quoteId: quoteLines.quoteId,
      totalAmount: quoteLines.totalAmount,
    })
    .from(quoteLines)
    .where(inArray(quoteLines.quoteId, quoteIds));

  // Agrupar montos por quoteId
  const amountMap = new Map<string, number>();
  lines.forEach(line => {
    const current = amountMap.get(line.quoteId) || 0;
    amountMap.set(line.quoteId, current + Number(line.totalAmount));
  });

  // 4. Construir detalles y filtrar solo abiertos (sent o viewed)
  const details: QuotePredictionDetail[] = [];
  let totalProbability = 0;
  let countWithProbability = 0;

  for (const quote of userQuotes) {
    const status = statusMap.get(quote.id) || 'draft';
    // Solo considerar presupuestos enviados o vistos (no aceptados/rechazados)
    if (status !== 'sent' && status !== 'viewed') continue;

    // Obtener probabilidad del análisis IA
    let probability = 0.3; // default para sent
    if (status === 'viewed') probability = 0.5; // mayor si fue visto

    if (quote.analysis && typeof quote.analysis === 'object') {
      const analysis = quote.analysis as any;
      if (typeof analysis.probability === 'number') {
        probability = analysis.probability / 100; // convertir de 0-100 a 0-1
      }
    }

    const amount = amountMap.get(quote.id) || 0;
    const expectedValue = amount * probability;

    details.push({
      quoteId: quote.id,
      title: quote.title || 'Sin título',
      clientName: quote.clientName,
      amount,
      probability,
      expectedValue,
      status,
    });

    totalProbability += probability;
    countWithProbability++;
  }

  // 5. Calcular totales
  const expected = details.reduce((sum, d) => sum + d.expectedValue, 0);
  const averageProbability = countWithProbability > 0 ? totalProbability / countWithProbability : 0;

  // Escenario optimista: probability + 20% (máximo 1)
  const optimistic = details.reduce((sum, d) => {
    const optProb = Math.min(1, d.probability + 0.2);
    return sum + d.amount * optProb;
  }, 0);

  // Escenario pesimista: probability - 20% (mínimo 0)
  const pessimistic = details.reduce((sum, d) => {
    const pesProb = Math.max(0, d.probability - 0.2);
    return sum + d.amount * pesProb;
  }, 0);

  return {
    expected,
    optimistic,
    pessimistic,
    details,
    totalOpenQuotes: details.length,
    averageProbability: averageProbability * 100, // en porcentaje
  };
}
