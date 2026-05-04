import { db } from '@/lib/db';
import { eq, and } from 'drizzle-orm';
import { quotes, quoteLines, quoteEvents, emailTracking } from '@/lib/db/schema';
import { sendTrackedEmail } from '@/lib/email';
import { createTask } from '@/lib/services/taskService';
import { createNotification } from '@/lib/notifications';
import { generateFollowUpEmail } from '@/lib/services/followUpEmailGenerator';
import { buildSalesContext } from '@/lib/services/salesContext';
import { QUOTE_EVENT_TYPES } from '@/lib/db/events';
import { decideFollowUp } from '@/lib/services/followUpDecision';
import type { DecisionOutput, ActionType } from '@/lib/autopilot/autonomousDecision';
import type { RuleTrigger, TriggerType } from '@/lib/autopilot/triggerRules';
import type { PolicyAction } from '@/lib/autopilot/policyEngine';

export interface ExecutionResult {
  success: boolean;
  action: ActionType;
  quoteId: string;
  detail: string;
  error?: string;
}

const actionToPolicy: Record<ActionType, PolicyAction> = {
  SEND_EMAIL: 'SEND_EMAIL',
  FOLLOW_UP: 'FOLLOW_UP',
  PRIORITIZE_QUOTE: 'PRIORITIZE_QUOTE',
  ALERT_USER: 'ALERT_USER',
  DO_NOTHING: 'SEND_EMAIL',
};

export async function executeDecision(
  userId: string,
  decision: DecisionOutput
): Promise<ExecutionResult> {
  const { evaluatePoliciesWrapper } = await import('./policyEngine');

  if (decision.targetId) {
    const policyAction = actionToPolicy[decision.action] || 'SEND_EMAIL';
    const policy = await evaluatePoliciesWrapper(userId, decision.targetId, policyAction);

    if (!policy.allowed) {
      return {
        success: false,
        action: decision.action,
        quoteId: decision.targetId,
        detail: `Política bloqueó acción: ${policy.reason}`,
        error: 'policy_violation',
      };
    }
  }

  switch (decision.action) {
    case 'SEND_EMAIL':
      return executeSendEmail(userId, decision);
    case 'FOLLOW_UP':
      return executeFollowUp(userId, decision);
    case 'PRIORITIZE_QUOTE':
      return executePrioritizeQuote(userId, decision);
    case 'ALERT_USER':
      return executeAlertUser(userId, decision);
    case 'DO_NOTHING':
      return { success: true, action: 'DO_NOTHING', quoteId: '', detail: decision.reason };
    default:
      return { success: false, action: decision.action, quoteId: decision.targetId, detail: 'Unknown action type', error: `Action "${decision.action}" not implemented` };
  }
}

async function executeSendEmail(
  userId: string,
  decision: DecisionOutput
): Promise<ExecutionResult> {
  try {
    const quote = await db.select().from(quotes).where(eq(quotes.id, decision.targetId)).limit(1);
    if (quote.length === 0) return { success: false, action: 'SEND_EMAIL', quoteId: decision.targetId, detail: 'Quote not found', error: 'Quote not found' };

    const q = quote[0];
    const lines = await db.select().from(quoteLines).where(eq(quoteLines.quoteId, q.id));
    const amount = lines.reduce((sum, l) => sum + Number(l.totalAmount), 0);

    const events = await db.select().from(quoteEvents).where(eq(quoteEvents.quoteId, q.id)).orderBy(quoteEvents.createdAt);
    const context = await buildSalesContext(q, events, amount, userId);

    const emailResult = await sendFollowUpEmail(q.id, q.clientName, q.clientEmail || '', context);

    if (!emailResult.success) {
      return { success: false, action: 'SEND_EMAIL', quoteId: q.id, detail: emailResult.error || 'Failed to send email', error: emailResult.error };
    }

    await db.insert(quoteEvents).values({
      quoteId: q.id,
      type: QUOTE_EVENT_TYPES.FOLLOWUP_SENT,
      metadata: { emailId: emailResult.emailId, reason: decision.reason, expectedImpact: decision.expectedImpact },
    });

    return {
      success: true,
      action: 'SEND_EMAIL',
      quoteId: q.id,
      detail: `Follow-up email sent to ${q.clientName}. Reason: ${decision.reason}`,
    };
  } catch (err) {
    return { success: false, action: 'SEND_EMAIL', quoteId: decision.targetId, detail: 'Error executing SEND_EMAIL', error: (err as Error).message };
  }
}

async function executeFollowUp(
  userId: string,
  decision: DecisionOutput
): Promise<ExecutionResult> {
  try {
    const quote = await db.select().from(quotes).where(eq(quotes.id, decision.targetId)).limit(1);
    if (quote.length === 0) return { success: false, action: 'FOLLOW_UP', quoteId: decision.targetId, detail: 'Quote not found', error: 'Quote not found' };

    const q = quote[0];
    const lines = await db.select().from(quoteLines).where(eq(quoteLines.quoteId, q.id));
    const amount = lines.reduce((sum, l) => sum + Number(l.totalAmount), 0);

    const events = await db.select().from(quoteEvents).where(eq(quoteEvents.quoteId, q.id)).orderBy(quoteEvents.createdAt);
    const context = await buildSalesContext(q, events, amount, userId);

    const emailResult = await sendFollowUpEmail(q.id, q.clientName, q.clientEmail || '', context);

    if (emailResult.success) {
      await db.insert(quoteEvents).values({
        quoteId: q.id,
        type: QUOTE_EVENT_TYPES.FOLLOWUP_SENT,
        metadata: { emailId: emailResult.emailId, reason: decision.reason, expectedImpact: decision.expectedImpact },
      });
    }

    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 2);

    await createTask({
      userId,
      quoteId: q.id,
      title: `Seguimiento: ${q.title}`,
      description: `Cliente: ${q.clientName} | Importe: ${amount}€ | Score: ${q.score || 'N/A'}/100\n\n${decision.reason}\n\nImpacto esperado: ${decision.expectedImpact}€`,
      dueDate,
    });

    return {
      success: true,
      action: 'FOLLOW_UP',
      quoteId: q.id,
      detail: `Email + tarea creados para ${q.clientName}. Próximo seguimiento en 2 días.`,
    };
  } catch (err) {
    return { success: false, action: 'FOLLOW_UP', quoteId: decision.targetId, detail: 'Error executing FOLLOW_UP', error: (err as Error).message };
  }
}

async function executePrioritizeQuote(
  userId: string,
  decision: DecisionOutput
): Promise<ExecutionResult> {
  try {
    const quote = await db.select().from(quotes).where(eq(quotes.id, decision.targetId)).limit(1);
    if (quote.length === 0) return { success: false, action: 'PRIORITIZE_QUOTE', quoteId: decision.targetId, detail: 'Quote not found', error: 'Quote not found' };

    const q = quote[0];
    const lines = await db.select().from(quoteLines).where(eq(quoteLines.quoteId, q.id));
    const amount = lines.reduce((sum, l) => sum + Number(l.totalAmount), 0);

    const dueDate = new Date();
    dueDate.setHours(dueDate.getHours() + 4);

    await createTask({
      userId,
      quoteId: q.id,
      title: `URGENTE: Enviar presupuesto — ${q.title}`,
      description: `Cliente: ${q.clientName} | Importe: ${amount}€\n\n${decision.reason}\n\nImpacto estimado si se envía hoy: ${decision.expectedImpact}€`,
      dueDate,
    });

    await createNotification({
      userId,
      type: 'closure_opportunity',
      title: 'Presupuesto prioritario sin enviar',
      message: `${q.title} para ${q.clientName} lleva tiempo en borrador. ${decision.reason}`,
      priority: 'high',
      metadata: { quoteId: q.id, amount, expectedImpact: decision.expectedImpact },
    });

    return {
      success: true,
      action: 'PRIORITIZE_QUOTE',
      quoteId: q.id,
      detail: `Tarea urgente + notificación creadas para "${q.title}" (${amount}€).`,
    };
  } catch (err) {
    return { success: false, action: 'PRIORITIZE_QUOTE', quoteId: decision.targetId, detail: 'Error executing PRIORITIZE_QUOTE', error: (err as Error).message };
  }
}

async function executeAlertUser(
  userId: string,
  decision: DecisionOutput
): Promise<ExecutionResult> {
  try {
    await createNotification({
      userId,
      type: 'risk_of_loss',
      title: 'Acción requerida — presupuesto de alto valor',
      message: decision.reason,
      priority: 'high',
      metadata: { quoteId: decision.targetId, expectedImpact: decision.expectedImpact, confidence: decision.confidence },
    });

    const quote = await db.select().from(quotes).where(eq(quotes.id, decision.targetId)).limit(1);
    if (quote.length > 0) {
      const q = quote[0];
      const clientEmail = q.clientEmail || '';

      if (clientEmail) {
        const subject = `Re: ${q.title} — ¿necesitas ajustes?`;
        const html = `<p>Hola ${q.clientName},</p><p>He notado que la propuesta anterior no fue aceptada. Me gustaría entender qué no encajó y ver si puedo ajustarla para que se adapte mejor a lo que necesitas.</p><p>¿Tienes 5 minutos esta semana para hablar?</p><p>Un saludo</p>`;

        const emailResult = await sendTrackedEmail({
          to: clientEmail,
          subject,
          html,
          quoteId: q.id,
          eventType: 'ALERT_RESEND',
        });

        if (emailResult.success) {
          await db.insert(quoteEvents).values({
            quoteId: q.id,
            type: QUOTE_EVENT_TYPES.FOLLOWUP_SENT,
            metadata: { emailId: emailResult.emailId, reason: 'Alert resend - rejected high value', expectedImpact: decision.expectedImpact },
          });
        }
      }
    }

    return {
      success: true,
      action: 'ALERT_USER',
      quoteId: decision.targetId,
      detail: `Notificación creada. Email de re-intento enviado si email disponible.`,
    };
  } catch (err) {
    return { success: false, action: 'ALERT_USER', quoteId: decision.targetId, detail: 'Error executing ALERT_USER', error: (err as Error).message };
  }
}

async function sendFollowUpEmail(
  quoteId: string,
  clientName: string,
  toEmail: string,
  context: any
): Promise<{ success: boolean; emailId?: string; error?: string }> {
  try {
    const decision = decideFollowUp(context);

    if (decision.action.type !== 'send_email' && decision.action.type !== 'no_action') {
      const generated = await generateFollowUpEmail(context, decision);

      const emailResult = await sendTrackedEmail({
        to: toEmail,
        subject: generated.subject,
        html: generated.body,
        quoteId,
        eventType: QUOTE_EVENT_TYPES.FOLLOWUP_SENT,
      });

      return emailResult;
    }

    if (decision.action.type === 'no_action') {
      return { success: false, error: 'No action recommended by follow-up decision engine' };
    }

    return { success: false, error: 'Decision action not suitable for direct email' };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

export async function executeAutonomousCycle(userId: string): Promise<{
  decision: DecisionOutput;
  execution: ExecutionResult;
  memoryCheck?: import('./actionMemory').MemoryCheck;
}> {
  const { makeAutonomousDecision } = await import('@/lib/autopilot/autonomousDecision');
  const decision = await makeAutonomousDecision(userId);

  const { checkMemoryBeforeAction } = await import('./actionMemory');
  const memoryCheck = await checkMemoryBeforeAction(userId, [
    { quoteId: decision.targetId, action: decision.action },
  ]);

  const blockedForTarget = memoryCheck.blockedActions.find(
    b => b.quoteId === decision.targetId && b.blocked
  );

  if (blockedForTarget || memoryCheck.riskLevel === 'high') {
    return {
      decision,
      execution: {
        success: false,
        action: decision.action,
        quoteId: decision.targetId,
        detail: `Bloqueado por memoria: ${blockedForTarget?.reason || memoryCheck.reason}`,
        error: 'cooldown_violation',
      },
      memoryCheck,
    };
  }

  const execution = await executeDecision(userId, decision);

  return { decision, execution, memoryCheck };
}

export async function executeTrigger(
  userId: string,
  trigger: RuleTrigger
): Promise<ExecutionResult> {
  const { checkMemoryBeforeAction } = await import('./actionMemory');
  const { evaluatePoliciesWrapper } = await import('./policyEngine');

  const actionMap: Record<string, string> = {
    FOLLOW_UP: 'SEND_EMAIL',
    PRIORITIZE: 'PRIORITIZE_QUOTE',
    ALERT_USER: 'ALERT_USER',
    INSIGHT_ACTION: 'INSIGHT_ACTION',
  };

  const policyAction = actionMap[trigger.type] as PolicyAction || 'SEND_EMAIL';
  const policy = await evaluatePoliciesWrapper(userId, trigger.quoteId, policyAction);

  if (!policy.allowed) {
    return {
      success: false,
      action: 'DO_NOTHING',
      quoteId: trigger.quoteId,
      detail: `Política bloqueó: ${policy.reason}`,
      error: 'policy_violation',
    };
  }

  const memoryCheck = await checkMemoryBeforeAction(userId, [
    { quoteId: trigger.quoteId, action: actionMap[trigger.type] || trigger.type },
  ]);

  const blocked = memoryCheck.blockedActions.find(b => b.blocked);

  if (blocked) {
    return {
      success: false,
      action: 'DO_NOTHING',
      quoteId: trigger.quoteId,
      detail: `Bloqueado: ${blocked.reason}`,
      error: 'cooldown_violation',
    };
  }

  switch (trigger.type) {
    case 'FOLLOW_UP':
      return executeSendEmail(userId, {
        action: 'SEND_EMAIL',
        reason: trigger.reason,
        targetId: trigger.quoteId,
        expectedImpact: trigger.value,
        confidence: 65,
      });

    case 'PRIORITIZE':
      return executePrioritizeQuote(userId, {
        action: 'PRIORITIZE_QUOTE',
        reason: trigger.reason,
        targetId: trigger.quoteId,
        expectedImpact: trigger.value,
        confidence: 80,
      });

    case 'ALERT_USER':
      return executeAlertUser(userId, {
        action: 'ALERT_USER',
        reason: trigger.reason,
        targetId: trigger.quoteId,
        expectedImpact: trigger.value,
        confidence: 70,
      });

    case 'INSIGHT_ACTION':
      await createNotification({
        userId,
        type: 'followup_needed',
        title: 'Caída de conversión detectada',
        message: trigger.reason,
        priority: trigger.urgency === 'critical' ? 'high' : 'medium',
        metadata: trigger.data,
      });

      return {
        success: true,
        action: 'DO_NOTHING',
        quoteId: trigger.quoteId,
        detail: `Insight creado: ${trigger.reason}`,
      };

    default:
      return { success: false, action: 'DO_NOTHING', quoteId: trigger.quoteId, detail: 'Unknown trigger type', error: `Trigger "${trigger.type}" not implemented` };
  }
}

export async function executeAllTriggers(
  userId: string,
  triggers: RuleTrigger[]
): Promise<ExecutionResult[]> {
  const results: ExecutionResult[] = [];

  for (const trigger of triggers) {
    const result = await executeTrigger(userId, trigger);
    results.push(result);
  }

  return results;
}
