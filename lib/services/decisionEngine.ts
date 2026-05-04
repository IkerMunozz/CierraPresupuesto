// lib/services/decisionEngine.ts
import { callGemini } from '@/lib/gemini';

export type QuoteStatus = 'draft' | 'sent' | 'viewed' | 'accepted' | 'rejected';
export type ClientType = 'nuevo' | 'recurrente' | 'corporativo' | 'particular';
export type RecommendedAction = 'send_followup' | 'wait' | 'mark_lost' | 'notify_user' | 'send_quote';
export type Priority = 'low' | 'medium' | 'high' | 'critical';

export interface DecisionContext {
  status: QuoteStatus;
  daysSinceSent: number;
  viewCount: number;
  score: number;
  clientType: ClientType;
  amount: number;
  previousFollowUps: number;
  userConversionRate: number;
}

export interface Decision {
  action: RecommendedAction;
  priority: Priority;
  reason: string;
  aiEnhanced: boolean;
}

const LOST_THRESHOLD_DAYS = 30;
const URGENT_AMOUNT_THRESHOLD = 2000;
const LOW_SCORE_THRESHOLD = 40;
const HIGH_SCORE_THRESHOLD = 80;
const FOLLOWUP_WINDOW = { min: 3, max: 10 };
const MAX_FOLLOWUPS = 3;

export function decideNextAction(ctx: DecisionContext): Decision {
  if (ctx.status === 'accepted') return { action: 'wait', priority: 'low', reason: 'Presupuesto aceptado. No se requiere acción.', aiEnhanced: false };
  if (ctx.status === 'rejected') return { action: 'mark_lost', priority: 'low', reason: 'Presupuesto rechazado. Marcar como perdido.', aiEnhanced: false };

  if (ctx.status === 'draft') return decideDraft(ctx);
  if (ctx.status === 'sent' || ctx.status === 'viewed') return decideSentOrViewed(ctx);

  return { action: 'wait', priority: 'low', reason: 'Sin datos suficientes.', aiEnhanced: false };
}

function decideDraft(ctx: DecisionContext): Decision {
  if (ctx.score < LOW_SCORE_THRESHOLD && ctx.score > 0) {
    return {
      action: 'notify_user',
      priority: ctx.amount > URGENT_AMOUNT_THRESHOLD ? 'high' : 'medium',
      reason: `El score es bajo (${ctx.score}/100). Mejora el contenido antes de enviar.`,
      aiEnhanced: false,
    };
  }

  return {
    action: 'send_quote',
    priority: ctx.amount > URGENT_AMOUNT_THRESHOLD ? 'high' : 'medium',
    reason: `Presupuesto listo para enviar${ctx.amount > URGENT_AMOUNT_THRESHOLD ? ` — importe alto (${formatAmount(ctx.amount)})` : ''}.`,
    aiEnhanced: false,
  };
}

function decideSentOrViewed(ctx: DecisionContext): Decision {
  if (ctx.daysSinceSent >= LOST_THRESHOLD_DAYS) {
    return {
      action: 'mark_lost',
      priority: 'low',
      reason: `Han pasado ${ctx.daysSinceSent} días sin respuesta. Marca como perdido para limpiar el pipeline.`,
      aiEnhanced: false,
    };
  }

  if (ctx.daysSinceSent >= FOLLOWUP_WINDOW.max && ctx.previousFollowUps >= MAX_FOLLOWUPS) {
    return {
      action: ctx.amount > URGENT_AMOUNT_THRESHOLD ? 'notify_user' : 'mark_lost',
      priority: ctx.amount > URGENT_AMOUNT_THRESHOLD ? 'high' : 'medium',
      reason: `Agotados ${MAX_FOLLOWUPS} seguimientos sin respuesta.${ctx.amount > URGENT_AMOUNT_THRESHOLD ? ' Importe alto requiere decisión manual.' : ''}`,
      aiEnhanced: false,
    };
  }

  if (ctx.daysSinceSent >= FOLLOWUP_WINDOW.min && ctx.previousFollowUps < MAX_FOLLOWUPS) {
    const priority = calculateFollowUpPriority(ctx);
    const reason = buildFollowUpReason(ctx);

    return { action: 'send_followup', priority, reason, aiEnhanced: false };
  }

  if (ctx.status === 'viewed' && ctx.viewCount >= 3 && ctx.previousFollowUps === 0) {
    return {
      action: 'notify_user',
      priority: ctx.amount > URGENT_AMOUNT_THRESHOLD ? 'high' : 'medium',
      reason: `El cliente vio el presupuesto ${ctx.viewCount} veces sin responder. Posible interés con dudas.`,
      aiEnhanced: false,
    };
  }

  return { action: 'wait', priority: 'low', reason: `Día ${ctx.daysSinceSent}. Esperar a ventana de seguimiento (día ${FOLLOWUP_WINDOW.min}).`, aiEnhanced: false };
}

function calculateFollowUpPriority(ctx: DecisionContext): Priority {
  if (ctx.amount > URGENT_AMOUNT_THRESHOLD && ctx.clientType === 'corporativo') return 'critical';
  if (ctx.amount > URGENT_AMOUNT_THRESHOLD || ctx.clientType === 'recurrente') return 'high';
  if (ctx.viewCount >= 3) return 'high';
  if (ctx.score >= HIGH_SCORE_THRESHOLD) return 'medium';
  return 'low';
}

function buildFollowUpReason(ctx: DecisionContext): string {
  const parts: string[] = [];

  if (ctx.previousFollowUps === 0) {
    parts.push('Primer seguimiento pendiente');
  } else {
    parts.push(`Seguimiento ${ctx.previousFollowUps + 1} de ${MAX_FOLLOWUPS}`);
  }

  if (ctx.viewCount >= 3) parts.push(`visto ${ctx.viewCount} veces`);
  if (ctx.score >= HIGH_SCORE_THRESHOLD) parts.push(`score alto (${ctx.score})`);
  if (ctx.clientType === 'recurrente') parts.push('cliente recurrente');
  if (ctx.amount > URGENT_AMOUNT_THRESHOLD) parts.push(`importe alto (${formatAmount(ctx.amount)})`);

  return parts.join('. ') + '.';
}

function formatAmount(amount: number): string {
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(amount);
}

export async function enrichWithAI(ctx: DecisionContext, decision: Decision): Promise<Decision> {
  if (decision.action === 'wait' || decision.action === 'mark_lost') return decision;

  try {
    const prompt = buildEnrichmentPrompt(ctx, decision);
    const response = await callGemini(prompt, ENRICHMENT_SYSTEM_PROMPT, true);
    const parsed = JSON.parse(response.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim());

    return {
      action: decision.action,
      priority: parsed.priority || decision.priority,
      reason: parsed.reason || decision.reason,
      aiEnhanced: true,
    };
  } catch {
    return { ...decision, aiEnhanced: false };
  }
}

const ENRICHMENT_SYSTEM_PROMPT = `Eres un consultor de ventas que refina decisiones automáticas. No cambias la acción recomendada, solo mejoras la razón y ajustas prioridad si es necesario.

REGLAS:
- NO cambies la acción
- La razón debe ser específica al contexto
- Prioridad: low/medium/high/critical
- Máximo 2 oraciones`;

function buildEnrichmentPrompt(ctx: DecisionContext, decision: Decision): string {
  return `Decisión automática: ${decision.action} (${decision.priority})
Razón actual: ${decision.reason}

Contexto adicional:
- Cliente ${ctx.clientType}, ${ctx.score}/100 score
- ${ctx.daysSinceSent} días desde envío, visto ${ctx.viewCount} veces
- Importe: ${formatAmount(ctx.amount)}
- ${ctx.previousFollowUps} seguimientos previos
- Tu tasa de conversión habitual: ${ctx.userConversionRate.toFixed(0)}%

Mejora la razón para que sea más específica y accionable. Ajusta la prioridad si el contexto lo justifica.

Devuelve SOLO JSON:
{"priority": "low|medium|high|critical", "reason": "razón mejorada"}`;
}
