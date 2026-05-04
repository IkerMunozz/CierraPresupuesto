import { db } from '@/lib/db';
import { eq, and, sql, gte, desc } from 'drizzle-orm';
import { quotes, quoteLines, quoteEvents, emailTracking } from '@/lib/db/schema';
import { deriveQuoteStatus, QUOTE_EVENT_TYPES } from '@/lib/db/events';

export interface DecisionLearning {
  patterns: string[];
  badActions: string[];
  suggestedAdjustments: string[];
}

interface DecisionOutcome {
  quoteId: string;
  title: string;
  clientName: string;
  amount: number;
  score: number;
  actionType: string;
  actionTone: string | null;
  actionAt: Date;
  finalStatus: string;
  daysToResolution: number;
  followUpCount: number;
  viewCount: number;
  wasSuccessful: boolean;
}

interface PatternAnalysis {
  actionType: string;
  totalExecuted: number;
  successful: number;
  failed: number;
  noResponse: number;
  successRate: number;
  avgAmount: number;
  avgScore: number;
  avgDaysToResolution: number;
}

async function fetchDecisionOutcomes(userId: string): Promise<DecisionOutcome[]> {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

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

  const followUpActions = await db
    .select()
    .from(quoteEvents)
    .where(
      and(
        sql`${quoteEvents.quoteId} = ANY(${quoteIds})`,
        eq(quoteEvents.type, QUOTE_EVENT_TYPES.FOLLOWUP_SENT),
        gte(quoteEvents.createdAt, thirtyDaysAgo)
      )
    )
    .orderBy(desc(quoteEvents.createdAt));

  const allEvents = await db
    .select()
    .from(quoteEvents)
    .where(sql`${quoteEvents.quoteId} = ANY(${quoteIds})`)
    .orderBy(quoteEvents.createdAt);

  const eventsByQuote = new Map<string, typeof allEvents>();
  allEvents.forEach(e => {
    const existing = eventsByQuote.get(e.quoteId) || [];
    existing.push(e);
    eventsByQuote.set(e.quoteId, existing);
  });

  const outcomes: DecisionOutcome[] = [];

  for (const q of userQuotes) {
    const events = eventsByQuote.get(q.id) || [];
    if (events.length === 0) continue;

    const derivedStatus = deriveQuoteStatus(events);

    const sentEvent = events.find(e => e.type === QUOTE_EVENT_TYPES.SENT);
    const acceptedEvent = events.find(e => e.type === QUOTE_EVENT_TYPES.ACCEPTED);
    const rejectedEvent = events.find(e => e.type === QUOTE_EVENT_TYPES.REJECTED);

    const resolutionEvent = acceptedEvent || rejectedEvent;
    const referenceDate = sentEvent?.createdAt || q.createdAt;

    let daysToResolution = -1;
    if (resolutionEvent) {
      daysToResolution = Math.floor(
        (new Date(resolutionEvent.createdAt).getTime() - new Date(referenceDate).getTime()) / (1000 * 60 * 60 * 24)
      );
    }

    const followUpsForQuote = events.filter(e => e.type === QUOTE_EVENT_TYPES.FOLLOWUP_SENT);
    const viewsForQuote = events.filter(e => e.type === QUOTE_EVENT_TYPES.VIEWED);

    for (const fu of followUpsForQuote) {
      const metadata = fu.metadata as Record<string, unknown> | null;
      const tone = metadata?.tone ? String(metadata.tone) : null;

      const wasSuccessful = derivedStatus === 'accepted';

      outcomes.push({
        quoteId: q.id,
        title: q.title,
        clientName: q.clientName,
        amount: amounts.get(q.id) || 0,
        score: q.score || 50,
        actionType: 'FOLLOW_UP',
        actionTone: tone,
        actionAt: new Date(fu.createdAt),
        finalStatus: derivedStatus,
        daysToResolution,
        followUpCount: followUpsForQuote.length,
        viewCount: viewsForQuote.length,
        wasSuccessful,
      });
    }

    const initialSent = events.find(e => e.type === QUOTE_EVENT_TYPES.SENT);
    if (initialSent) {
      const wasSuccessful = derivedStatus === 'accepted';

      outcomes.push({
        quoteId: q.id,
        title: q.title,
        clientName: q.clientName,
        amount: amounts.get(q.id) || 0,
        score: q.score || 50,
        actionType: 'INITIAL_SEND',
        actionTone: null,
        actionAt: new Date(initialSent.createdAt),
        finalStatus: derivedStatus,
        daysToResolution,
        followUpCount: followUpsForQuote.length,
        viewCount: viewsForQuote.length,
        wasSuccessful,
      });
    }
  }

  return outcomes;
}

function analyzePatterns(outcomes: DecisionOutcome[]): PatternAnalysis[] {
  const grouped = new Map<string, DecisionOutcome[]>();

  outcomes.forEach(o => {
    const key = o.actionTone ? `${o.actionType}_${o.actionTone}` : o.actionType;
    const existing = grouped.get(key) || [];
    existing.push(o);
    grouped.set(key, existing);
  });

  const patterns: PatternAnalysis[] = [];

  grouped.forEach((items, key) => {
    const successful = items.filter(o => o.wasSuccessful).length;
    const failed = items.filter(o => o.finalStatus === 'rejected').length;
    const noResponse = items.length - successful - failed;

    const resolved = items.filter(o => o.daysToResolution >= 0);
    const avgDays = resolved.length > 0
      ? resolved.reduce((sum, o) => sum + o.daysToResolution, 0) / resolved.length
      : 0;

    patterns.push({
      actionType: key,
      totalExecuted: items.length,
      successful,
      failed,
      noResponse,
      successRate: items.length > 0 ? (successful / items.length) * 100 : 0,
      avgAmount: items.reduce((sum, o) => sum + o.amount, 0) / items.length,
      avgScore: items.reduce((sum, o) => sum + o.score, 0) / items.length,
      avgDaysToResolution: avgDays,
    });
  });

  return patterns.sort((a, b) => b.successRate - a.successRate);
}

function generateLearning(
  outcomes: DecisionOutcome[],
  patterns: PatternAnalysis[]
): DecisionLearning {
  const learning: DecisionLearning = {
    patterns: [],
    badActions: [],
    suggestedAdjustments: [],
  };

  if (patterns.length === 0) {
    learning.patterns.push('No hay suficientes datos para identificar patrones. Ejecuta más acciones.');
    return learning;
  }

  const highSuccess = patterns.filter(p => p.successRate >= 50 && p.totalExecuted >= 2);
  const lowSuccess = patterns.filter(p => p.successRate < 20 && p.totalExecuted >= 2);
  const highValue = patterns.filter(p => p.avgAmount > 1000 && p.successRate >= 30);

  highSuccess.forEach(p => {
    learning.patterns.push(
      `Follow-up tono "${p.actionType}" tiene ${p.successRate.toFixed(0)}% de éxito (${p.successful}/${p.totalExecuted}). Funciona mejor con score medio ${(p.avgScore).toFixed(0)}/100.`
    );
  });

  if (highValue.length > 0) {
    const best = highValue[0];
    learning.patterns.push(
      `Presupuestos de alto valor (>${best.avgAmount.toFixed(0)}€) responden bien a "${best.actionType}" (${best.successRate.toFixed(0)}% éxito).`
    );
  }

  const viewedThenAccepted = outcomes.filter(o => o.viewCount >= 2 && o.wasSuccessful);
  if (viewedThenAccepted.length > 0) {
    learning.patterns.push(
      `Clientes que ven el presupuesto 2+ veces tienen alta conversión. Prioriza follow-ups rápidos en estos casos.`
    );
  }

  const lowScoreSuccessful = outcomes.filter(o => o.score < 40 && o.wasSuccessful);
  if (lowScoreSuccessful.length === 0 && outcomes.filter(o => o.score < 40).length > 2) {
    learning.patterns.push(
      'Presupuestos con score <40 casi nunca se aceptan. El score de IA es un predictor fiable.'
    );
  }

  lowSuccess.forEach(p => {
    learning.badActions.push(
      `"${p.actionType}" tiene solo ${p.successRate.toFixed(0)}% de éxito (${p.failed} rechazos de ${p.totalExecuted}). Considera reducir o cambiar enfoque.`
    );
  });

  const urgentFailures = patterns.filter(p => p.actionType.includes('urgency') && p.successRate < 25);
  if (urgentFailures.length > 0) {
    learning.badActions.push(
      'El tono "urgency" genera rechazo frecuente. Úsalo solo como último recurso después de 2+ follow-ups suaves.'
    );
  }

  const highFollowUpRejections = outcomes.filter(o => o.followUpCount >= 3 && o.finalStatus === 'rejected');
  if (highFollowUpRejections.length > 2) {
    learning.badActions.push(
      `Después de 3+ follow-ups, el cliente casi siempre rechaza (${highFollowUpRejections.length} casos). Marca como perdido en lugar de insistir.`
    );
  }

  const neverViewedFollowUps = outcomes.filter(o => o.viewCount === 0 && o.finalStatus === 'rejected');
  if (neverViewedFollowUps.length > outcomes.filter(o => o.viewCount === 0).length * 0.6) {
    learning.badActions.push(
      'Seguir insistiendo con clientes que nunca abren el presupuesto es inefectivo. Reenvía con asunto nuevo o cambia canal.'
    );
  }

  const avgDaysAccepted = outcomes
    .filter(o => o.wasSuccessful && o.daysToResolution > 0)
    .reduce((sum, o) => sum + o.daysToResolution, 0) /
    Math.max(outcomes.filter(o => o.wasSuccessful && o.daysToResolution > 0).length, 1);

  if (avgDaysAccepted > 0) {
    learning.suggestedAdjustments.push(
      `La media de días para cerrar es ${avgDaysAccepted.toFixed(0)} días. Enfoca follow-ups en la ventana de días ${Math.max(avgDaysAccepted - 3, 1)}-${Math.ceil(avgDaysAccepted + 2)}.`
    );
  }

  if (highSuccess.length > 0) {
    const best = highSuccess[0];
    learning.suggestedAdjustments.push(
      `Prioriza "${best.actionType}" — tu acción más efectiva (${best.successRate.toFixed(0)}% éxito). Úsala como primer follow-up por defecto.`
    );
  }

  if (patterns.some(p => p.actionType.includes('soft') && p.successRate > 30)) {
    learning.suggestedAdjustments.push(
      'Empieza con tono suave y escala gradualmente. Los datos muestran que agresividad temprana reduce conversión.'
    );
  }

  const scoreRanges = [
    { min: 80, label: 'alto (80+)' },
    { min: 50, label: 'medio (50-79)' },
    { min: 0, label: 'bajo (<50)' },
  ];

  scoreRanges.forEach(range => {
    const inRange = outcomes.filter(o => o.score >= range.min && o.score < (range.min === 50 ? 80 : range.min === 80 ? 101 : 50));
    const accepted = inRange.filter(o => o.wasSuccessful).length;
    const rate = inRange.length > 0 ? (accepted / inRange.length) * 100 : 0;

    if (range.label.includes('alto') && rate < 40) {
      learning.suggestedAdjustments.push(
        `Score alto pero conversión baja (${rate.toFixed(0)}%). El problema no es el score sino el seguimiento. Aumenta velocidad de follow-up.`
      );
    }
  });

  const draftConversion = outcomes.filter(o => o.actionType === 'INITIAL_SEND');
  if (draftConversion.length > 0) {
    const sentRate = draftConversion.length / Math.max(
      outcomes.filter(o => o.actionType === 'INITIAL_SEND' || o.actionType === 'DRAFT').length, 1
    ) * 100;

    if (sentRate < 60) {
      learning.suggestedAdjustments.push(
        `Solo ${(sentRate).toFixed(0)}% de borradores se envían. Cada borrador sin enviar es dinero perdido. Prioriza enviar sobre perfeccionar.`
      );
    }
  }

  return learning;
}

export async function analyzeDecisionLearning(userId: string): Promise<DecisionLearning> {
  const outcomes = await fetchDecisionOutcomes(userId);

  if (outcomes.length < 3) {
    return {
      patterns: ['Datos insuficientes. Se necesitan al menos 3 acciones ejecutadas para identificar patrones.'],
      badActions: [],
      suggestedAdjustments: [
        'Envía más presupuestos y follow-ups para generar datos de aprendizaje.',
        'El sistema necesita mínimo 30 días de actividad para análisis significativo.',
      ],
    };
  }

  const patterns = analyzePatterns(outcomes);
  return generateLearning(outcomes, patterns);
}

export async function getPatternStats(userId: string): Promise<PatternAnalysis[]> {
  const outcomes = await fetchDecisionOutcomes(userId);
  return analyzePatterns(outcomes);
}
