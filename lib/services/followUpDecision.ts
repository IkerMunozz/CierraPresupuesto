// lib/services/followUpDecision.ts
import { SalesContext } from './salesContext';

export type FollowUpAction =
  | { type: 'no_action' }
  | { type: 'send_email'; tone: 'soft' | 'warm' | 'direct' | 'value' | 'urgency' }
  | { type: 'suggest_improve' }
  | { type: 'notify_user' }
  | { type: 'mark_lost' }
  | { type: 'change_subject' };

export type Priority = 'low' | 'medium' | 'high' | 'critical';

export interface FollowUpDecision {
  action: FollowUpAction;
  priority: Priority;
  reason: string;
  signals: string[];
}

const MIN_DAYS_BEFORE_FIRST_FOLLOWUP = 3;
const MAX_FOLLOWUPS = 3;
const LOST_DAYS = 30;
const HIGH_SCORE = 80;
const LOW_SCORE = 40;
const HIGH_AMOUNT = 2000;

export function decideFollowUp(ctx: SalesContext): FollowUpDecision {
  if (ctx.status === 'accepted') return noAction('Presupuesto aceptado.');
  if (ctx.status === 'rejected') return markLost('Presupuesto rechazado.');
  if (ctx.status === 'draft') return noAction('Presupuesto no enviado aún.');

  if (ctx.daysSinceSent >= LOST_DAYS) return markLost(`${ctx.daysSinceSent} días sin respuesta.`);

  if (ctx.followUps.length >= MAX_FOLLOWUPS) {
    return ctx.amount > HIGH_AMOUNT
      ? notifyUser(`Seguimientos agotados. Importe alto requiere revisión manual.`)
      : markLost(`${MAX_FOLLOWUPS} seguimientos sin respuesta.`);
  }

  if (ctx.score < LOW_SCORE && ctx.score > 0) {
    return suggestImprove(`Score bajo (${ctx.score}). Mejorar contenido antes de seguir.`);
  }

  if (ctx.daysSinceSent < MIN_DAYS_BEFORE_FIRST_FOLLOWUP && ctx.followUps.length === 0) {
    return noAction(`Día ${ctx.daysSinceSent}. Esperar a día ${MIN_DAYS_BEFORE_FIRST_FOLLOWUP}.`);
  }

  return dynamicFollowUp(ctx);
}

function dynamicFollowUp(ctx: SalesContext): FollowUpDecision {
  const signals = detectSignals(ctx);
  const followUpCount = ctx.followUps.length;

  if (ctx.viewCount >= 3 && followUpCount === 0) {
    return sendEmail('direct', {
      priority: ctx.amount > HIGH_AMOUNT ? 'critical' : 'high',
      reason: `Visto ${ctx.viewCount} veces sin respuesta. Cliente revisando activamente.`,
      signals,
    });
  }

  if (ctx.viewCount === 0 && followUpCount === 0 && ctx.daysSinceSent >= 5) {
    return sendEmail('soft', {
      priority: 'low',
      reason: 'Nunca visto. Posible problema de entrega o cliente desinteresado.',
      signals,
    });
  }

  if (ctx.viewCount >= 3 && followUpCount > 0) {
    const lastFollowUp = ctx.followUps[ctx.followUps.length - 1];
    const daysSinceLastFollowUp = Math.floor(
      (Date.now() - lastFollowUp.sentAt.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysSinceLastFollowUp >= 3) {
      return ctx.score >= HIGH_SCORE
        ? sendEmail('urgency', {
            priority: ctx.amount > HIGH_AMOUNT ? 'critical' : 'high',
            reason: `Revisa ${ctx.viewCount} veces, score alto (${ctx.score}). Momento ideal para cierre.`,
            signals,
          })
        : sendEmail('value', {
            priority: 'high',
            reason: `Interés demostrado (${ctx.viewCount} vistas) pero score moderado. Aportar valor adicional.`,
            signals,
          });
    }

    return noAction(`Último seguimiento hace ${daysSinceLastFollowUp} días. Esperar.`);
  }

  if (ctx.score >= HIGH_SCORE && ctx.viewCount >= 1) {
    return sendEmail('warm', {
      priority: 'high',
      reason: `Score alto (${ctx.score}) y visto. Cliente interesado con alta probabilidad de cierre.`,
      signals,
    });
  }

  if (ctx.amount > HIGH_AMOUNT && followUpCount === 0) {
    return sendEmail('direct', {
      priority: 'high',
      reason: `Importe alto (${formatAmount(ctx.amount)}). No perder oportunidades de valor.`,
      signals,
    });
  }

  if (followUpCount === 0) {
    return sendEmail('soft', {
      priority: ctx.clientType === 'recurrente' || ctx.clientType === 'corporativo' ? 'medium' : 'low',
      reason: 'Primer seguimiento pendiente.',
      signals,
    });
  }

  if (ctx.viewCount === 0 && followUpCount > 0) {
    return sendEmail('soft', {
      priority: 'medium',
      reason: 'Nunca abrió emails. Cambiar enfoque — posible problema de asunto o entrega.',
      signals: [...signals, 'cambiar_asunto'],
    });
  }

  const daysSinceLastFollowUp = followUpCount > 0
    ? Math.floor((Date.now() - ctx.followUps[followUpCount - 1].sentAt.getTime()) / (1000 * 60 * 60 * 24))
    : ctx.daysSinceSent;

  if (daysSinceLastFollowUp >= 4) {
    return sendEmail(followUpCount === 1 ? 'value' : 'urgency', {
      priority: followUpCount >= 2 ? 'high' : 'medium',
      reason: `Seguimiento ${followUpCount + 1}. ${daysSinceLastFollowUp} días desde el último contacto.`,
      signals,
    });
  }

  return noAction(`Demasiado pronto desde último seguimiento (${daysSinceLastFollowUp} días).`);
}

function detectSignals(ctx: SalesContext): string[] {
  const signals: string[] = [];

  if (ctx.viewCount >= 3) signals.push('alta_interaccion');
  if (ctx.viewCount === 0) signals.push('sin_interaccion');
  if (ctx.score >= HIGH_SCORE) signals.push('score_alto');
  if (ctx.score < LOW_SCORE) signals.push('score_bajo');
  if (ctx.amount > HIGH_AMOUNT) signals.push('alto_valor');
  if (ctx.clientType === 'corporativo') signals.push('cliente_corporativo');
  if (ctx.clientType === 'recurrente') signals.push('cliente_recurrente');
  if (ctx.followUps.some(fu => !fu.opened)) signals.push('email_no_abierto');

  return signals;
}

function sendEmail(
  tone: 'soft' | 'warm' | 'direct' | 'value' | 'urgency',
  opts: { priority: Priority; reason: string; signals: string[] }
): FollowUpDecision {
  return { action: { type: 'send_email', tone }, ...opts };
}

function noAction(reason: string): FollowUpDecision {
  return { action: { type: 'no_action' }, priority: 'low', reason, signals: [] };
}

function markLost(reason: string): FollowUpDecision {
  return { action: { type: 'mark_lost' }, priority: 'low', reason, signals: [] };
}

function notifyUser(reason: string): FollowUpDecision {
  return { action: { type: 'notify_user' }, priority: 'high', reason, signals: [] };
}

function suggestImprove(reason: string): FollowUpDecision {
  return { action: { type: 'suggest_improve' }, priority: 'medium', reason, signals: [] };
}

function formatAmount(amount: number): string {
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(amount);
}
