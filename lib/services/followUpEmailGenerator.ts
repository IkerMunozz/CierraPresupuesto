// lib/services/followUpEmailGenerator.ts
import { callGemini } from '@/lib/gemini';
import { SalesContext } from './salesContext';
import { FollowUpDecision } from './followUpDecision';

export interface GeneratedEmail {
  subject: string;
  body: string;
}

const SYSTEM_PROMPT = `Eres un profesional que escribe emails de seguimiento comerciales.

REGLAS:
- Escribe como una persona real, no como un bot
- NO repitas frases de emails anteriores
- NO uses emojis ni lenguaje corporativo vacío
- Sé específico al contexto del cliente
- Máximo 4-5 frases cortas
- Asunto: 6-10 palabras, natural`;

const TONE_GUIDES = {
  soft: {
    goal: 'Confirmar recepción sin presionar. El cliente puede estar ocupado o no haberlo visto.',
    style: 'Casual, breve, sin preguntas directas sobre la decisión.',
  },
  warm: {
    goal: 'Aprovechar el interés demostrado. El cliente revisó el presupuesto y tiene score alto.',
    style: 'Positivo, proactivo, ofrecer ayuda concreta.',
  },
  direct: {
    goal: 'Pedir una respuesta clara. El cliente revisó pero no decide.',
    style: 'Directo, profesional, pregunta concreta sobre próximo paso.',
  },
  value: {
    goal: 'Aportar algo nuevo para reactivar la conversación.',
    style: 'Aportar dato útil o idea, invitar a llamada breve de 10 min.',
  },
  urgency: {
    goal: 'Último intento con urgencia legítima. No ser agresivo.',
    style: 'Mencionar validez o disponibilidad, dejar puerta abierta.',
  },
};

function buildPrompt(
  context: SalesContext,
  decision: FollowUpDecision,
  previousEmails: { subject: string; body: string }[]
): string {
  const tone = decision.action.type === 'send_email' ? decision.action.tone : 'soft';
  const guide = TONE_GUIDES[tone];

  const contextLines: string[] = [];
  contextLines.push(`- Presupuesto: "${context.title}"`);
  contextLines.push(`- Enviado hace ${context.daysSinceSent} días`);

  if (context.viewCount >= 3) {
    contextLines.push(`- El cliente revisó el presupuesto ${context.viewCount} veces`);
  } else if (context.viewCount === 0) {
    contextLines.push('- El cliente NUNCA ha abierto el presupuesto');
  } else {
    contextLines.push(`- El cliente vio el presupuesto ${context.viewCount} vez/veces`);
  }

  if (context.score >= 80) contextLines.push(`- Score alto: ${context.score}/100 — buena probabilidad de cierre`);
  if (context.score < 40 && context.score > 0) contextLines.push(`- Score bajo: ${context.score}/100 — contenido mejorable`);
  if (context.amount > 0) contextLines.push(`- Importe: ${formatAmount(context.amount)}`);
  if (context.clientType === 'corporativo') contextLines.push('- Tipo: empresa/corporativo');
  if (context.clientType === 'recurrente') contextLines.push('- Tipo: cliente recurrente con historial');

  const historyLines = previousEmails.map((e, i) =>
    `Email ${i + 1} (${e.subject || 'sin asunto'}): "${e.body.substring(0, 120)}${e.body.length > 120 ? '...' : ''}"`
  );

  const noOpenSignal = context.followUps.some(f => !f.opened);

  return `Genera un email de seguimiento para este cliente:

CONTEXTO:
${contextLines.map(l => `  ${l}`).join('\n')}

SEÑALES DETECTADAS:
${decision.signals.length > 0 ? decision.signals.map(s => `  - ${s}`).join('\n') : '  - Ninguna específica'}

${noOpenSignal ? 'IMPORTANTE: El cliente NO abrió los emails anteriores. Cambia el asunto radicalmente.' : ''}

TONO DEL EMAIL: ${tone}
- Objetivo: ${guide.goal}
- Estilo: ${guide.style}

${previousEmails.length > 0 ? `EMAILS ENVIADOS ANTERIORMENTE (NO REPITAS):\n${historyLines.map(l => `  ${l}`).join('\n')}` : 'Es el primer email de seguimiento.'}

Devuelve SOLO JSON:
{"subject": "asunto del email", "body": "cuerpo del email"}`;
}

function parseResponse(text: string, fallbackContext: { clientName: string; title: string }): GeneratedEmail {
  let cleaned = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  if (jsonMatch) cleaned = jsonMatch[0];

  try {
    const parsed = JSON.parse(cleaned);
    const subject = (parsed.subject || '').trim();
    const body = (parsed.body || '').trim();

    if (!subject || subject.length < 5 || !body || body.length < 10) {
      return fallbackEmail(fallbackContext);
    }

    return { subject, body };
  } catch {
    return fallbackEmail(fallbackContext);
  }
}

function fallbackEmail(ctx: { clientName: string; title: string }): GeneratedEmail {
  return {
    subject: `Seguimiento: ${ctx.title}`,
    body: `Hola ${ctx.clientName},\n\nTe escribo para hacer seguimiento del presupuesto "${ctx.title}". Si tienes alguna duda o necesitas ajustar algo, estoy a tu disposición.\n\nSaludos`,
  };
}

function formatAmount(amount: number): string {
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(amount);
}

async function getPreviousEmails(quoteId: string): Promise<{ subject: string; body: string }[]> {
  try {
    const { db } = await import('@/lib/db');
    const { quoteEvents } = await import('@/lib/db/schema');
    const { eq, and, desc } = await import('drizzle-orm');
    const { QUOTE_EVENT_TYPES } = await import('@/lib/db/eventTypes');

    const events = await db
      .select({ metadata: quoteEvents.metadata })
      .from(quoteEvents)
      .where(and(eq(quoteEvents.quoteId, quoteId), eq(quoteEvents.type, QUOTE_EVENT_TYPES.FOLLOWUP_SENT)))
      .orderBy(desc(quoteEvents.createdAt));

    return events
      .map(e => e.metadata as Record<string, string> | null)
      .filter(m => m && m.subject && m.body)
      .map(m => ({ subject: m!.subject, body: m!.body }));
  } catch {
    return [];
  }
}

export async function generateFollowUpEmail(
  context: SalesContext,
  decision: FollowUpDecision
): Promise<GeneratedEmail> {
  if (decision.action.type !== 'send_email') {
    throw new Error(`Cannot generate email for action type: ${decision.action.type}`);
  }

  const previousEmails = await getPreviousEmails(context.quoteId);
  const prompt = buildPrompt(context, decision, previousEmails);

  const response = await callGemini(prompt, SYSTEM_PROMPT, true);
  return parseResponse(response, { clientName: context.clientName, title: context.title });
}
