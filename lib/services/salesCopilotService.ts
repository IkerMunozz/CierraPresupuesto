import { db } from '@/lib/db';
import { eq, inArray, sql } from 'drizzle-orm';
import { quotes, quoteEvents, quoteLines } from '@/lib/db/schema';
import { deriveQuoteStatus, QUOTE_EVENT_TYPES } from '@/lib/db/events';
import { generateFollowUpDecision, type FollowUpDecision } from './followUpDecision';
import { buildSalesContext, type SalesContext } from './salesContext';

export type CopilotMode = 'DAILY_ACTION' | 'RISK_ANALYSIS' | 'SALES_STRATEGY' | 'CHAT';

export interface CopilotResponse {
  mode: CopilotMode;
  insight: string;
  data: {
    metric: string;
    value: string;
    context: string;
  }[];
  action: string;
  impact: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
}

interface QuoteData {
  id: string;
  title: string;
  clientName: string;
  score: number | null;
  status: string;
  amount: number;
  daysSinceSent: number;
  viewCount: number;
  createdAt: Date;
}

async function getUserQuotes(userId: string): Promise<QuoteData[]> {
  const userQuotes = await db
    .select({
      id: quotes.id,
      title: quotes.title,
      clientName: quotes.clientName,
      score: quotes.score,
      status: quotes.status,
      createdAt: quotes.createdAt,
    })
    .from(quotes)
    .where(eq(quotes.userId, userId));

  const quoteIds = userQuotes.map(q => q.id);

  let amounts: { quoteId: string; total: number }[] = [];
  if (quoteIds.length > 0) {
    const rawAmounts = await db
      .select({
        quoteId: quoteLines.quoteId,
        total: sql<number>`SUM(CAST(${quoteLines.totalAmount} AS NUMERIC))`,
      })
      .from(quoteLines)
      .where(inArray(quoteLines.quoteId, quoteIds))
      .groupBy(quoteLines.quoteId);

    amounts = rawAmounts.map(r => ({
      quoteId: r.quoteId!,
      total: Number(r.total) || 0,
    }));
  }

  const amountMap = new Map(amounts.map(a => [a.quoteId, a.total]));

  const result: QuoteData[] = [];

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

    const viewedCount = events.filter(e => e.type === QUOTE_EVENT_TYPES.VIEWED).length;
    const amount = amountMap.get(q.id) || 0;

    result.push({
      id: q.id,
      title: q.title,
      clientName: q.clientName,
      score: q.score,
      status: derivedStatus,
      amount,
      daysSinceSent,
      viewCount: viewedCount,
      createdAt: new Date(q.createdAt),
    });
  }

  return result;
}

export async function analyzeDailyAction(userId: string): Promise<CopilotResponse> {
  const quotesData = await getUserQuotes(userId);

  const drafts = quotesData.filter(q => q.status === 'draft');
  const sent = quotesData.filter(q => q.status === 'sent');
  const viewed = quotesData.filter(q => q.status === 'viewed');
  const accepted = quotesData.filter(q => q.status === 'accepted');
  const rejected = quotesData.filter(q => q.status === 'rejected');

  const totalAmount = quotesData.reduce((sum, q) => sum + q.amount, 0);
  const potentialRevenue = [...sent, ...viewed].reduce((sum, q) => sum + q.amount, 0);
  const draftRevenue = drafts.reduce((sum, q) => sum + q.amount, 0);

  const totalSent = sent.length + viewed.length + accepted.length + rejected.length;
  const conversionRate = totalSent > 0 ? (accepted.length / totalSent) * 100 : 0;

  // Detectar presupuesto visto sin respuesta con score alto
  const highPriorityFollowUp = viewed
    .filter(q => (q.score || 0) >= 60 && q.daysSinceSent >= 3)
    .sort((a, b) => b.amount - a.amount);

  // Detectar borradores con alto valor
  const highValueDrafts = drafts
    .filter(q => q.amount > 0)
    .sort((a, b) => b.amount - a.amount);

  // Detectar presupuestos en riesgo (enviados hace mucho, sin ver)
  const atRisk = sent
    .filter(q => q.daysSinceSent >= 7 && q.viewCount === 0)
    .sort((a, b) => b.amount - a.amount);

  // DECISION: qué priorizar hoy
  let response: CopilotResponse;

  if (highValueDrafts.length > 0) {
    const topDraft = highValueDrafts[0];
    const totalDraftAtRisk = highValueDrafts.reduce((s, q) => s + q.amount, 0);

    response = {
      mode: 'DAILY_ACTION',
      insight: `Tienes ${drafts.length} presupuestos sin enviar. ${highValueDrafts.length} superan los 500€ y representan dinero que estás dejando sobre la mesa.`,
      data: [
        {
          metric: 'Borradores sin enviar',
          value: `${drafts.length}`,
          context: `${drafts.length} presupuestos creados pero nunca enviados`,
        },
        {
          metric: 'Dinero en riesgo',
          value: `${totalDraftAtRisk.toFixed(0)}€`,
          context: `Importe total de ${highValueDrafts.length} borradores de alto valor`,
        },
        {
          metric: 'Top borrador',
          value: `${topDraft.amount.toFixed(0)}€ — ${topDraft.clientName}`,
          context: `Creado hace ${Math.floor((Date.now() - topDraft.createdAt.getTime()) / (1000 * 60 * 60 * 24))} días`,
        },
      ],
      action: `Envía hoy el presupuesto de "${topDraft.title}" (${topDraft.amount.toFixed(0)}€) a ${topDraft.clientName}. Cada día que pasa sin enviarlo, la probabilidad de cierre baja un 15%.`,
      impact: `${totalDraftAtRisk.toFixed(0)}€ potenciales en juego. Enviar hoy podría generar ~${(totalDraftAtRisk * 0.35).toFixed(0)}€ (basado en tu conversión del ${conversionRate.toFixed(0)}%)`,
      priority: totalDraftAtRisk > 1000 ? 'critical' : 'high',
    };
  } else if (highPriorityFollowUp.length > 0) {
    const topFollowUp = highPriorityFollowUp[0];

    response = {
      mode: 'DAILY_ACTION',
      insight: `${viewed.length} clientes han visto tu presupuesto y no han respondido. El que más dinero mueve es el de ${topFollowUp.clientName}.`,
      data: [
        {
          metric: 'Vistos sin respuesta',
          value: `${viewed.length}`,
          context: `Clientes que abrieron el presupuesto pero no han tomado decisión`,
        },
        {
          metric: 'Oportunidad principal',
          value: `${topFollowUp.amount.toFixed(0)}€ — ${topFollowUp.clientName}`,
          context: `Score: ${topFollowUp.score}/100 · Visto hace ${topFollowUp.daysSinceSent} días · Score IA: ${topFollowUp.score || 'N/A'}`,
        },
        {
          metric: 'Tu conversión actual',
          value: `${conversionRate.toFixed(0)}%`,
          context: `${accepted.length} aceptados de ${totalSent} enviados`,
        },
      ],
      action: `Envía un seguimiento a ${topFollowUp.clientName} sobre "${topFollowUp.title}". El cliente vio el presupuesto y tiene un score de ${topFollowUp.score}/100 — alta probabilidad de cierre si insistes ahora.`,
      impact: `${topFollowUp.amount.toFixed(0)}€ en juego. Los seguimientos a los 3-5 días tras la vista tienen un 40% más de conversión que esperar.`,
      priority: topFollowUp.amount > 1500 ? 'critical' : 'high',
    };
  } else if (atRisk.length > 0) {
    const topRisk = atRisk[0];
    const totalAtRisk = atRisk.reduce((s, q) => s + q.amount, 0);

    response = {
      mode: 'RISK_ANALYSIS',
      insight: `${atRisk.length} presupuestos fueron enviados hace más de 7 días y el cliente nunca los abrió. Estás perdiendo visibilidad de ${totalAtRisk.toFixed(0)}€.`,
      data: [
        {
          metric: 'Presupuestos sin abrir',
          value: `${atRisk.length}`,
          context: `Enviados pero nunca vistos por el cliente`,
        },
        {
          metric: 'Mayor riesgo',
          value: `${topRisk.amount.toFixed(0)}€ — ${topRisk.clientName}`,
          context: `Enviado hace ${topRisk.daysSinceSent} días sin apertura`,
        },
        {
          metric: 'Dinero en riesgo',
          value: `${totalAtRisk.toFixed(0)}€`,
          context: `Total de presupuestos sin abrir`,
        },
      ],
      action: `Reenvía el presupuesto a ${topRisk.clientName} con un asunto diferente. El original nunca fue abierto — probablemente llegó a spam o el cliente lo ignoró. Cambia el asunto a algo más directo: "Propuesta para ${topRisk.clientName} — ¿revisamos?"`,
      impact: `${totalAtRisk.toFixed(0)}€ en riesgo. Reenviar con asunto nuevo recupera un 25% de oportunidades perdidas.`,
      priority: 'high',
    };
  } else if (drafts.length > 0) {
    const totalDraftAtRisk = drafts.reduce((s, q) => s + q.amount, 0);

    response = {
      mode: 'DAILY_ACTION',
      insight: `Tienes ${drafts.length} borradores sin enviar. Aunque sean de valor bajo, cada uno es una oportunidad que se enfría.`,
      data: [
        {
          metric: 'Borradores pendientes',
          value: `${drafts.length}`,
          context: `Creados pero nunca enviados`,
        },
        {
          metric: 'Valor total borradores',
          value: `${totalDraftAtRisk.toFixed(0)}€`,
          context: `Suma de todos los borradores`,
        },
        {
          metric: 'Presupuestos enviados',
          value: `${totalSent}`,
          context: `${accepted.length} aceptados (${conversionRate.toFixed(0)}% conversión)`,
        },
      ],
      action: `Revisa y envía al menos 2 borradores hoy. No necesitan ser perfectos — un presupuesto enviado vale más que uno perfecto que nunca sale.`,
      impact: `Si tu conversión se mantiene al ${conversionRate.toFixed(0)}%, enviar estos ${drafts.length} borradores podría generar ~${(totalDraftAtRisk * conversionRate / 100).toFixed(0)}€ adicionales.`,
      priority: 'medium',
    };
  } else {
    response = {
      mode: 'SALES_STRATEGY',
      insight: `Tu pipeline está limpio. No hay acciones urgentes pendientes. Es buen momento para crear nuevos presupuestos.`,
      data: [
        {
          metric: 'Total presupuestos',
          value: `${quotesData.length}`,
          context: `Todos tus presupuestos`,
        },
        {
          metric: 'Conversión',
          value: `${conversionRate.toFixed(0)}%`,
          context: `${accepted.length} de ${totalSent} enviados`,
        },
        {
          metric: 'Ingresos cerrados',
          value: `${accepted.reduce((s, q) => s + q.amount, 0).toFixed(0)}€`,
          context: `De un potencial de ${totalAmount.toFixed(0)}€`,
        },
      ],
      action: 'Crea 2-3 nuevos presupuestos esta semana. Tu conversión es sólida — aumentar volumen es la palanca más efectiva ahora.',
      impact: `Con tu conversión actual del ${conversionRate.toFixed(0)}%, cada presupuesto nuevo tiene un valor esperado de ~${(totalAmount / Math.max(quotesData.length, 1) * conversionRate / 100).toFixed(0)}€.`,
      priority: 'low',
    };
  }

  return response;
}

export async function analyzeRisks(userId: string): Promise<CopilotResponse> {
  const quotesData = await getUserQuotes(userId);

  const rejected = quotesData.filter(q => q.status === 'rejected');
  const lowScore = quotesData.filter(q => (q.score || 0) < 40 && q.status !== 'accepted');
  const staleSent = quotesData.filter(q => q.status === 'sent' && q.daysSinceSent >= 14);

  const totalRejected = rejected.reduce((s, q) => s + q.amount, 0);
  const totalStale = staleSent.reduce((s, q) => s + q.amount, 0);

  let response: CopilotResponse;

  if (rejected.length > 0) {
    response = {
      mode: 'RISK_ANALYSIS',
      insight: `Has perdido ${rejected.length} presupuestos este mes por un valor de ${totalRejected.toFixed(0)}€. Analiza el patrón para evitar que se repita.`,
      data: [
        {
          metric: 'Presupuestos rechazados',
          value: `${rejected.length}`,
          context: `Total: ${totalRejected.toFixed(0)}€ perdidos`,
        },
        {
          metric: 'Score medio rechazados',
          value: `${(rejected.reduce((s, q) => s + (q.score || 0), 0) / rejected.length).toFixed(0)}/100`,
          context: `Score medio de los presupuestos rechazados`,
        },
        {
          metric: 'Tu conversión actual',
          value: `${((quotesData.filter(q => q.status === 'accepted').length / Math.max(quotesData.filter(q => q.status !== 'draft').length, 1)) * 100).toFixed(0)}%`,
          context: `Aceptados vs enviados`,
        },
      ],
      action: 'Revisa los presupuestos rechazados con score bajo. Si el score era <50, el problema era probablemente el precio o la propuesta. Usa la IA para mejorar la estructura antes de reenviar.',
      impact: `Recuperar incluso 1 de los ${rejected.length} rechazados significaría ${totalRejected / rejected.length}€ adicionales.`,
      priority: 'high',
    };
  } else if (staleSent.length > 0) {
    response = {
      mode: 'RISK_ANALYSIS',
      insight: `${staleSent.length} presupuestos llevan más de 14 días sin respuesta. Están a punto de caducar.`,
      data: [
        {
          metric: 'Presupuestos stale',
          value: `${staleSent.length}`,
          context: `Enviados hace 14+ días sin respuesta`,
        },
        {
          metric: 'Valor en riesgo',
          value: `${totalStale.toFixed(0)}€`,
          context: `Dinero que podría perderse`,
        },
      ],
      action: `Marca como perdidos los stale de más de 21 días. Para los de 14-21 días, envía un último seguimiento con oferta de llamada rápida.`,
      impact: `Limpiar el pipeline te da claridad para enfocar en oportunidades reales. ${totalStale.toFixed(0)}€ en decisión.`,
      priority: 'medium',
    };
  } else {
    response = {
      mode: 'RISK_ANALYSIS',
      insight: 'No hay riesgos críticos detectados en tu pipeline actual.',
      data: [
        {
          metric: 'Estado del pipeline',
          value: 'Saludable',
          context: 'Sin rechazos recientes ni presupuestos stale',
        },
      ],
      action: 'Mantén el ritmo. Sigue enviando presupuestos y haciendo seguimiento.',
      impact: 'Sin riesgos inmediatos.',
      priority: 'low',
    };
  }

  return response;
}

export async function runCopilotAnalysis(
  userId: string,
  mode: CopilotMode = 'DAILY_ACTION'
): Promise<CopilotResponse> {
  switch (mode) {
    case 'DAILY_ACTION':
      return analyzeDailyAction(userId);
    case 'RISK_ANALYSIS':
      return analyzeRisks(userId);
    case 'SALES_STRATEGY':
      return analyzeDailyAction(userId);
    default:
      return analyzeDailyAction(userId);
  }
}
