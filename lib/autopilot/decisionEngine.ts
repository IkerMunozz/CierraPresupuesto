import { decideFollowUp, type FollowUpAction, type FollowUpDecision } from '@/lib/services/followUpDecision';
import { buildSalesContext, type SalesContext } from '@/lib/services/salesContext';

export type DecisionType =
  | 'SEND_DRAFT'
  | 'SEND_FOLLOWUP'
  | 'IMPROVE_QUOTE'
  | 'RESEND_UNOPENED'
  | 'MARK_LOST'
  | 'URGENT_FOLLOWUP'
  | 'WAIT'
  | 'NO_ACTION';

export type UrgencyLevel = 'critical' | 'high' | 'medium' | 'low' | 'none';

export interface Decision {
  type: DecisionType;
  urgency: UrgencyLevel;
  quoteId: string;
  clientName: string;
  title: string;
  amount: number;
  reason: string;
  action: string;
  impact: string;
  estimatedEuros: number;
  cooldownOk: boolean;
  metadata: Record<string, unknown>;
}

export interface AutopilotConfig {
  minDaysBeforeFirstFollowup: number;
  maxFollowups: number;
  lostDaysThreshold: number;
  highScoreThreshold: number;
  lowScoreThreshold: number;
  highAmountThreshold: number;
  draftMaxDays: number;
  unopenedResendDays: number;
  cooldownHours: number;
}

const DEFAULT_CONFIG: AutopilotConfig = {
  minDaysBeforeFirstFollowup: 3,
  maxFollowups: 3,
  lostDaysThreshold: 30,
  highScoreThreshold: 80,
  lowScoreThreshold: 40,
  highAmountThreshold: 2000,
  draftMaxDays: 7,
  unopenedResendDays: 5,
  cooldownHours: 12,
};

interface RawQuoteData {
  id: string;
  title: string;
  clientName: string;
  clientEmail: string | null;
  status: string;
  score: number | null;
  amount: number;
  daysSinceSent: number;
  viewCount: number;
  followUpCount: number;
  lastFollowupDaysAgo: number;
  daysSinceCreated: number;
  hasEmailBeenOpened: boolean;
}

export function evaluateDecision(
  quote: RawQuoteData,
  config: AutopilotConfig = DEFAULT_CONFIG
): Decision {
  const baseDecision: Decision = {
    type: 'NO_ACTION',
    urgency: 'none',
    quoteId: quote.id,
    clientName: quote.clientName,
    title: quote.title,
    amount: quote.amount,
    reason: '',
    action: '',
    impact: '',
    estimatedEuros: 0,
    cooldownOk: true,
    metadata: {},
  };

  if (quote.status === 'accepted') {
    return { ...baseDecision, type: 'NO_ACTION', urgency: 'none', reason: 'Presupuesto aceptado. No hay acción necesaria.' };
  }

  if (quote.status === 'rejected') {
    if (quote.amount > config.highAmountThreshold) {
      return {
        ...baseDecision,
        type: 'IMPROVE_QUOTE',
        urgency: 'high',
        reason: `Presupuesto rechazado de ${formatCurrency(quote.amount)}. Valor alto merece una segunda versión mejorada.`,
        action: `Revisa por qué fue rechazado y usa la IA para generar una versión mejorada con enfoque diferente.`,
        impact: `Recuperar este cliente podría significar ${formatCurrency(quote.amount)} en ingresos.`,
        estimatedEuros: quote.amount * 0.25,
        metadata: { status: 'rejected' },
      };
    }
    return { ...baseDecision, type: 'NO_ACTION', urgency: 'none', reason: 'Rechazado. Importe bajo, no merece re-intento.' };
  }

  if (quote.status === 'draft') {
    return evaluateDraft(quote, config, baseDecision);
  }

  if (quote.status === 'sent' || quote.status === 'viewed') {
    return evaluateActiveQuote(quote, config, baseDecision);
  }

  return { ...baseDecision, type: 'NO_ACTION', urgency: 'none', reason: 'Estado desconocido.' };
}

function evaluateDraft(
  quote: RawQuoteData,
  config: AutopilotConfig,
  base: Decision
): Decision {
  const daysSinceCreated = quote.daysSinceCreated;

  if (daysSinceCreated > config.draftMaxDays && quote.amount > config.highAmountThreshold) {
    return {
      ...base,
      type: 'SEND_DRAFT',
      urgency: 'critical',
      reason: `Borrador de ${formatCurrency(quote.amount)} lleva ${daysSinceCreated} días sin enviar. El valor decae un 15% por día de retraso.`,
      action: `Envía hoy el presupuesto "${quote.title}" a ${quote.clientName}. Cada día que pasa, la probabilidad de cierre baja significativamente.`,
      impact: `Si se convierte al 35% (tasa media), este borrador vale ~${formatCurrency(quote.amount * 0.35)}. Enviarlo hoy maximiza la oportunidad.`,
      estimatedEuros: Math.round(quote.amount * 0.35),
      cooldownOk: true,
      metadata: { daysSinceCreated, score: quote.score },
    };
  }

  if (daysSinceCreated > 3) {
    return {
      ...base,
      type: 'SEND_DRAFT',
      urgency: 'medium',
      reason: `Borrador lleva ${daysSinceCreated} días sin enviar.`,
      action: `Revisa y envía el presupuesto de ${quote.clientName} (${formatCurrency(quote.amount)}).`,
      impact: `Oportunidad de ${formatCurrency(quote.amount)} en juego.`,
      estimatedEuros: Math.round(quote.amount * 0.35),
      cooldownOk: true,
      metadata: { daysSinceCreated, score: quote.score },
    };
  }

  return {
    ...base,
    type: 'NO_ACTION',
    urgency: 'low',
    reason: `Borrador creado hace ${daysSinceCreated} días. Aún dentro del período normal de preparación.`,
  };
}

function evaluateActiveQuote(
  quote: RawQuoteData,
  config: AutopilotConfig,
  base: Decision
): Decision {
  const daysSinceSent = quote.daysSinceSent;
  const viewCount = quote.viewCount;
  const followUpCount = quote.followUpCount;
  const score = quote.score || 50;

  if (daysSinceSent >= config.lostDaysThreshold) {
    return {
      ...base,
      type: 'MARK_LOST',
      urgency: 'low',
      reason: `${daysSinceSent} días sin respuesta. Umbral de pérdida alcanzado.`,
      action: `Marca "${quote.title}" como perdido. El cliente no responderá. Limpia tu pipeline.`,
      impact: `Limpiar este presupuesto te da claridad para enfocar en oportunidades reales. ${formatCurrency(quote.amount)} fuera del pipeline.`,
      estimatedEuros: 0,
      cooldownOk: true,
      metadata: { daysSinceSent, status: 'expired' },
    };
  }

  if (followUpCount >= config.maxFollowups) {
    if (quote.amount > config.highAmountThreshold) {
      return {
        ...base,
        type: 'NO_ACTION',
        urgency: 'medium',
        reason: `${config.maxFollowups} seguimientos agotados, pero importe alto (${formatCurrency(quote.amount)}).`,
        action: `Revisión manual recomendada. El sistema ya hizo ${config.maxFollowups} seguimientos sin respuesta. Considera llamar por teléfono.`,
        impact: `${formatCurrency(quote.amount)} en juego. Un contacto personal puede reactivar oportunidades perdidas por email.`,
        estimatedEuros: quote.amount * 0.15,
        cooldownOk: true,
        metadata: { followUpCount, manualReview: true },
      };
    }
    return {
      ...base,
      type: 'MARK_LOST',
      urgency: 'low',
      reason: `${config.maxFollowups} seguimientos sin respuesta.`,
      action: `Marca como perdido. Ya se agotaron los seguimientos automáticos.`,
      impact: `${formatCurrency(quote.amount)} fuera del pipeline activo.`,
      estimatedEuros: 0,
      cooldownOk: true,
      metadata: { followUpCount, status: 'exhausted' },
    };
  }

  if (score < config.lowScoreThreshold) {
    return {
      ...base,
      type: 'IMPROVE_QUOTE',
      urgency: 'medium',
      reason: `Score bajo (${score}/100). La propuesta actual tiene baja probabilidad de cierre.`,
      action: `Usa la IA para mejorar "${quote.title}" antes de hacer más seguimiento. Un presupuesto con score <40 tiene menos del 10% de conversión.`,
      impact: `Mejorar el score de ${score} a 70+ puede triplicar la probabilidad de cierre. Valor: ${formatCurrency(quote.amount)}.`,
      estimatedEuros: Math.round(quote.amount * 0.2),
      cooldownOk: true,
      metadata: { score, currentConversionProb: score * 0.005 },
    };
  }

  if (daysSinceSent < config.minDaysBeforeFirstFollowup && followUpCount === 0) {
    return {
      ...base,
      type: 'WAIT',
      urgency: 'none',
      reason: `Día ${daysSinceSent} de ${config.minDaysBeforeFirstFollowup} antes del primer seguimiento.`,
      action: `Espera al día ${config.minDaysBeforeFirstFollowup} para enviar el primer seguimiento.`,
      impact: 'Seguir el timing correcto mejora la tasa de respuesta un 25%.',
      estimatedEuros: 0,
      cooldownOk: false,
      metadata: { daysUntilFollowup: config.minDaysBeforeFirstFollowup - daysSinceSent },
    };
  }

  if (viewCount >= 3 && followUpCount === 0) {
    return {
      ...base,
      type: 'URGENT_FOLLOWUP',
      urgency: quote.amount > config.highAmountThreshold ? 'critical' : 'high',
      reason: `Visto ${viewCount} veces sin respuesta. El cliente está revisando activamente pero no se decide.`,
      action: `Envía seguimiento directo a ${quote.clientName}. Muestra interés activo (${viewCount} vistas) — pregunta si tiene dudas o necesita ajustes.`,
      impact: `Los presupuestos vistos 3+ veces con seguimiento inmediato tienen un 55% de conversión vs 20% sin seguimiento. ${formatCurrency(quote.amount)} en juego.`,
      estimatedEuros: Math.round(quote.amount * 0.55),
      cooldownOk: true,
      metadata: { viewCount, signal: 'hot_lead' },
    };
  }

  if (viewCount === 0 && followUpCount === 0 && daysSinceSent >= config.unopenedResendDays) {
    return {
      ...base,
      type: 'RESEND_UNOPENED',
      urgency: 'medium',
      reason: `Enviado hace ${daysSinceSent} días y nunca fue abierto. Posible problema de entrega o desinterés.`,
      action: `Reenvía a ${quote.clientName} con asunto diferente. El original nunca fue visto — cambia a: "${quote.title} — ¿revisamos?"`,
      impact: `Reenviar con asunto nuevo recupera un 25% de oportunidades perdidas por falta de apertura. ${formatCurrency(quote.amount)} potencial.`,
      estimatedEuros: Math.round(quote.amount * 0.25),
      cooldownOk: true,
      metadata: { signal: 'never_opened', daysSinceSent },
    };
  }

  if (viewCount >= 2 && score >= config.highScoreThreshold && followUpCount < config.maxFollowups) {
    const daysSinceLastFollowup = quote.lastFollowupDaysAgo;
    if (followUpCount === 0 || daysSinceLastFollowup >= 3) {
      return {
        ...base,
        type: 'SEND_FOLLOWUP',
        urgency: 'high',
        reason: `Score alto (${score}/100), visto ${viewCount} veces, sin seguimiento reciente. Momento ideal de cierre.`,
        action: `Envía seguimiento cálido a ${quote.clientName}. El cliente tiene alta probabilidad de cierre — refuerza el valor y ofrece una llamada rápida.`,
        impact: `Score ${score} + ${viewCount} vistas = probabilidad estimada del ${(score * 0.65)}%. Valor esperado: ${formatCurrency(Math.round(quote.amount * score * 0.0065))}.`,
        estimatedEuros: Math.round(quote.amount * score * 0.0065),
        cooldownOk: true,
        metadata: { signal: 'high_probability_close', viewCount, score },
      };
    }
  }

  if (quote.amount > config.highAmountThreshold && followUpCount === 0 && daysSinceSent >= config.minDaysBeforeFirstFollowup) {
    return {
      ...base,
      type: 'SEND_FOLLOWUP',
      urgency: 'high',
      reason: `Importe alto (${formatCurrency(quote.amount)}) sin seguimiento. No perder oportunidades de valor.`,
      action: `Primer seguimiento a ${quote.clientName}. Presupuesto de ${formatCurrency(quote.amount)} merece atención inmediata.`,
      impact: `Primer seguimiento en presupuestos >${formatCurrency(config.highAmountThreshold)} tiene un 45% de efectividad.`,
      estimatedEuros: Math.round(quote.amount * 0.45),
      cooldownOk: true,
      metadata: { signal: 'high_value_no_followup' },
    };
  }

  if (followUpCount === 0 && daysSinceSent >= config.minDaysBeforeFirstFollowup) {
    return {
      ...base,
      type: 'SEND_FOLLOWUP',
      urgency: 'medium',
      reason: `Primer seguimiento pendiente. Enviado hace ${daysSinceSent} días.`,
      action: `Envía primer seguimiento a ${quote.clientName} sobre "${quote.title}".`,
      impact: `Los seguimientos a los ${config.minDaysBeforeFirstFollowup} días tienen un 40% más de conversión que esperar.`,
      estimatedEuros: Math.round(quote.amount * 0.35),
      cooldownOk: true,
      metadata: { signal: 'first_followup_due' },
    };
  }

  if (followUpCount > 0 && followUpCount < config.maxFollowups) {
    const daysSinceLastFollowup = quote.lastFollowupDaysAgo;
    if (daysSinceLastFollowup >= 4) {
      const tone = followUpCount === 1 ? 'value' : 'urgency';
      return {
        ...base,
        type: 'SEND_FOLLOWUP',
        urgency: followUpCount >= 2 ? 'high' : 'medium',
        reason: `Seguimiento ${followUpCount + 1} pendiente. ${daysSinceLastFollowup} días desde el último contacto.`,
        action: `Envía seguimiento #${followUpCount + 1} a ${quote.clientName}. Tono: ${tone === 'value' ? 'aportar valor adicional' : 'crear urgencia'}.`,
        impact: `Seguimiento ${followUpCount + 1} de ${config.maxFollowups}. Cada contacto aumenta probabilidad de cierre un 15-20%.`,
        estimatedEuros: Math.round(quote.amount * (0.35 + followUpCount * 0.1)),
        cooldownOk: true,
        metadata: { signal: 'subsequent_followup', followUpCount, daysSinceLastFollowup },
      };
    }

    return {
      ...base,
      type: 'WAIT',
      urgency: 'none',
      reason: `Último seguimiento hace ${daysSinceLastFollowup} días. Esperar al menos 4 días entre contactos.`,
      action: `Próximo seguimiento disponible en ${4 - daysSinceLastFollowup} días.`,
      impact: 'Respetar el cooldown evita spam y mejora la percepción del cliente.',
      estimatedEuros: 0,
      cooldownOk: false,
      metadata: { daysUntilNextFollowup: 4 - daysSinceLastFollowup },
    };
  }

  return {
    ...base,
    type: 'NO_ACTION',
    urgency: 'none',
    reason: 'No hay acción recomendada en este momento.',
    metadata: { status: 'all_good' },
  };
}

export function evaluateAllQuotes(
  rawQuotes: RawQuoteData[],
  config: AutopilotConfig = DEFAULT_CONFIG
): Decision[] {
  const decisions = rawQuotes.map(q => evaluateDecision(q, config));

  return decisions
    .filter(d => d.urgency !== 'none')
    .sort((a, b) => {
      const urgencyOrder = { critical: 5, high: 4, medium: 3, low: 2, none: 1 };
      const urgencyDiff = urgencyOrder[b.urgency] - urgencyOrder[a.urgency];
      if (urgencyDiff !== 0) return urgencyDiff;
      return b.estimatedEuros - a.estimatedEuros;
    });
}

export function getTopAction(
  decisions: Decision[]
): Decision | null {
  return decisions.length > 0 ? decisions[0] : null;
}

export function getSummaryStats(decisions: Decision[]) {
  const stats = {
    total: decisions.length,
    critical: decisions.filter(d => d.urgency === 'critical').length,
    high: decisions.filter(d => d.urgency === 'high').length,
    medium: decisions.filter(d => d.urgency === 'medium').length,
    low: decisions.filter(d => d.urgency === 'low').length,
    totalPotentialEuros: decisions.reduce((sum, d) => sum + d.estimatedEuros, 0),
    sendDraftCount: decisions.filter(d => d.type === 'SEND_DRAFT').length,
    sendFollowupCount: decisions.filter(d => d.type === 'SEND_FOLLOWUP' || d.type === 'URGENT_FOLLOWUP').length,
    improveCount: decisions.filter(d => d.type === 'IMPROVE_QUOTE').length,
    resendCount: decisions.filter(d => d.type === 'RESEND_UNOPENED').length,
    markLostCount: decisions.filter(d => d.type === 'MARK_LOST').length,
  };

  return stats;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(amount);
}
