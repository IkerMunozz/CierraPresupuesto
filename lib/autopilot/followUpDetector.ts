import { db } from '@/lib/db';
import { eq, and, sql, desc, gt } from 'drizzle-orm';
import { quotes, quoteLines, quoteEvents, emailTracking } from '@/lib/db/schema';
import { deriveQuoteStatus, getQuotesStatusesFromEvents, QUOTE_EVENT_TYPES } from '@/lib/db/events';
import { buildSalesContext } from '@/lib/services/salesContext';
import { decideFollowUp } from '@/lib/services/followUpDecision';
import { generateFollowUpEmail } from '@/lib/services/followUpEmailGenerator';
import { sendTrackedEmail } from '@/lib/email';

export type FollowUpTone = 'soft' | 'medium' | 'urgent';

export interface FollowUpCandidate {
  quoteId: string;
  title: string;
  clientName: string;
  clientEmail: string | null;
  amount: number;
  score: number;
  daysSinceSent: number;
  viewCount: number;
  followUpCount: number;
  lastFollowupDaysAgo: number;
  status: string;
}

export interface FollowUpEmail {
  quoteId: string;
  clientName: string;
  to: string;
  subject: string;
  body: string;
  tone: FollowUpTone;
  goal: string;
  daysSinceSent: number;
  viewCount: number;
  urgency: 'low' | 'medium' | 'high';
  estimatedValue: number;
}

export async function detectFollowUpNeeds(userId: string): Promise<FollowUpCandidate[]> {
  const userQuotes = await db
    .select()
    .from(quotes)
    .where(eq(quotes.userId, userId))
    .orderBy(desc(quotes.createdAt));

  if (userQuotes.length === 0) return [];

  const quoteIds = userQuotes.map(q => q.id);
  const statusMap = await getQuotesStatusesFromEvents(quoteIds);

  const amounts = new Map<string, number>();
  if (quoteIds.length > 0) {
    const lines = await db
      .select()
      .from(quoteLines)
      .where(sql`${quoteLines.quoteId} = ANY(${quoteIds})`);

    lines.forEach(line => {
      const current = amounts.get(line.quoteId) || 0;
      amounts.set(line.quoteId, current + Number(line.totalAmount));
    });
  }

  const candidates: FollowUpCandidate[] = [];

  for (const q of userQuotes) {
    const events = await db
      .select()
      .from(quoteEvents)
      .where(eq(quoteEvents.quoteId, q.id))
      .orderBy(quoteEvents.createdAt);

    const derivedStatus = deriveQuoteStatus(events);
    if (derivedStatus !== 'sent' && derivedStatus !== 'viewed') continue;

    const sentEvent = events.find(e => e.type === QUOTE_EVENT_TYPES.SENT);
    const daysSinceSent = sentEvent
      ? Math.floor((Date.now() - new Date(sentEvent.createdAt).getTime()) / (1000 * 60 * 60 * 24))
      : -1;

    const viewCount = events.filter(e => e.type === QUOTE_EVENT_TYPES.VIEWED).length;
    const followUpEvents = events.filter(e => e.type === QUOTE_EVENT_TYPES.FOLLOWUP_SENT);
    const followUpCount = followUpEvents.length;
    const lastFollowup = followUpEvents[followUpEvents.length - 1];
    const lastFollowupDaysAgo = lastFollowup
      ? Math.floor((Date.now() - new Date(lastFollowup.createdAt).getTime()) / (1000 * 60 * 60 * 24))
      : -1;

    const candidate: FollowUpCandidate = {
      quoteId: q.id,
      title: q.title,
      clientName: q.clientName,
      clientEmail: q.clientEmail || null,
      amount: amounts.get(q.id) || 0,
      score: q.score || 50,
      daysSinceSent,
      viewCount,
      followUpCount,
      lastFollowupDaysAgo,
      status: derivedStatus,
    };

    if (shouldFollowUp(candidate)) {
      candidates.push(candidate);
    }
  }

  return candidates.sort((a, b) => {
    const urgencyA = getUrgencyScore(a);
    const urgencyB = getUrgencyScore(b);
    return urgencyB - urgencyA;
  });
}

function shouldFollowUp(c: FollowUpCandidate): boolean {
  if (c.followUpCount >= 3) return false;

  if (c.viewCount > 0 && c.followUpCount === 0 && c.daysSinceSent >= 2) {
    return true;
  }

  if (c.viewCount === 0 && c.followUpCount === 0 && c.daysSinceSent >= 3) {
    return true;
  }

  if (c.followUpCount === 1 && c.lastFollowupDaysAgo >= 3) {
    return true;
  }

  if (c.followUpCount === 2 && c.lastFollowupDaysAgo >= 4) {
    return true;
  }

  return false;
}

function getUrgencyScore(c: FollowUpCandidate): number {
  let score = 0;

  score += c.amount * 0.5;

  if (c.viewCount >= 3) score += 100;
  else if (c.viewCount >= 2) score += 60;
  else if (c.viewCount >= 1) score += 30;

  if (c.daysSinceSent >= 7) score += 80;
  else if (c.daysSinceSent >= 5) score += 50;
  else if (c.daysSinceSent >= 3) score += 30;

  if (c.score >= 80) score += 70;
  else if (c.score >= 60) score += 40;

  if (c.followUpCount === 0) score += 20;

  return score;
}

function determineTone(c: FollowUpCandidate): FollowUpTone {
  if (c.daysSinceSent >= 7 || (c.followUpCount >= 2 && c.lastFollowupDaysAgo >= 4)) {
    return 'urgent';
  }

  if (c.daysSinceSent >= 3 || (c.followUpCount >= 1 && c.lastFollowupDaysAgo >= 3)) {
    return 'medium';
  }

  return 'soft';
}

function determineUrgency(c: FollowUpCandidate): 'low' | 'medium' | 'high' {
  if (c.daysSinceSent >= 7 || (c.viewCount >= 3 && c.followUpCount === 0)) {
    return 'high';
  }

  if (c.daysSinceSent >= 3 || c.followUpCount >= 1) {
    return 'medium';
  }

  return 'low';
}

function determineGoal(c: FollowUpCandidate, tone: FollowUpTone): string {
  if (c.viewCount === 0) {
    return 'Asegurar que el presupuesto fue recibido. Posible problema de entrega.';
  }

  if (c.viewCount >= 3 && tone === 'urgent') {
    return 'Último intento. Cliente mostró interés pero no decide. Crear urgencia legítima.';
  }

  if (c.viewCount >= 2 && tone === 'medium') {
    return 'Segundo contacto. Cliente interesado. Ofrecer ayuda concreta y pedir feedback.';
  }

  if (c.viewCount >= 1 && tone === 'soft') {
    return 'Primer seguimiento suave. Confirmar recepción sin presionar.';
  }

  if (tone === 'urgent') {
    return 'Seguimiento urgente. Han pasado 7+ días. Último contacto antes de archivar.';
  }

  if (tone === 'medium') {
    return 'Seguimiento medio. Recordar disponibilidad y ofrecer ajustes si es necesario.';
  }

  return 'Confirmar recepción. Cliente puede estar ocupado.';
}

export async function generateAllFollowUpEmails(userId: string): Promise<FollowUpEmail[]> {
  const candidates = await detectFollowUpNeeds(userId);

  const emails: FollowUpEmail[] = [];

  for (const c of candidates) {
    const tone = determineTone(c);
    const urgency = determineUrgency(c);
    const goal = determineGoal(c, tone);

    const emailContent = await generateEmailContent(c, tone, goal);

    emails.push({
      quoteId: c.quoteId,
      clientName: c.clientName,
      to: c.clientEmail || '',
      subject: emailContent.subject,
      body: emailContent.body,
      tone,
      goal,
      daysSinceSent: c.daysSinceSent,
      viewCount: c.viewCount,
      urgency,
      estimatedValue: Math.round(c.amount * 0.35),
    });
  }

  return emails;
}

async function generateEmailContent(
  candidate: FollowUpCandidate,
  tone: FollowUpTone,
  goal: string
): Promise<{ subject: string; body: string }> {
  const context = await buildSalesContextForCandidate(candidate);
  const decision = decideFollowUp(context);

  if (decision.action.type === 'send_email') {
    try {
      const generated = await generateFollowUpEmail(context, decision);
      return generated;
    } catch {
      return generateFallbackEmail(candidate, tone, goal);
    }
  }

  return generateFallbackEmail(candidate, tone, goal);
}

function generateFallbackEmail(
  c: FollowUpCandidate,
  tone: FollowUpTone,
  goal: string
): { subject: string; body: string } {
  const templates = {
    soft: {
      subject: `Seguimiento: ${c.title}`,
      body: `Hola ${c.clientName},\n\nTe escribo para confirmar que recibiste el presupuesto "${c.title}". Si tienes alguna duda o necesitas que ajustemos algo, estoy a tu disposición.\n\nUn saludo`,
    },
    medium: {
      subject: `Sobre "${c.title}" — ¿necesitas ajustes?`,
      body: `Hola ${c.clientName},\n\nHace ${c.daysSinceSent} días te envié la propuesta "${c.title}". Me gustaría saber si has podido revisarla y si tienes alguna pregunta.\n\nSi necesitas ajustar algún aspecto del presupuesto, puedo adaptarlo a lo que necesitas.\n\n¿Hablamos esta semana?\n\nUn saludo`,
    },
    urgent: {
      subject: `Última oportunidad: ${c.title}`,
      body: `Hola ${c.clientName},\n\nTe contacté hace ${c.daysSinceSent} días sobre "${c.title}" y no he tenido respuesta.\n\nEntiendo que puedes estar evaluando otras opciones. Solo quiero confirmar si sigues interesado o si prefieres que archiviemos esta propuesta.\n\nEsta oferta tiene validez hasta dentro de unos días. Si necesitas más tiempo, dímelo y lo miramos.\n\nUn saludo`,
    },
  };

  return templates[tone];
}

async function buildSalesContextForCandidate(c: FollowUpCandidate) {
  const quote = await db.select().from(quotes).where(eq(quotes.id, c.quoteId)).limit(1);
  const events = await db.select().from(quoteEvents).where(eq(quoteEvents.quoteId, c.quoteId)).orderBy(quoteEvents.createdAt);

  return {
    quoteId: c.quoteId,
    title: c.title,
    status: c.status as 'draft' | 'sent' | 'viewed' | 'accepted' | 'rejected',
    daysSinceSent: c.daysSinceSent,
    viewCount: c.viewCount,
    score: c.score,
    amount: c.amount,
    clientName: c.clientName,
    clientType: 'nuevo' as const,
    clientCompany: null,
    followUps: [],
    createdAt: quote[0]?.createdAt || new Date(),
    lastEvent: {
      type: events[events.length - 1]?.type || 'QUOTE_SENT',
      date: events[events.length - 1]?.createdAt || new Date(),
    },
  };
}

export async function sendFollowUpEmail(userId: string, quoteId: string): Promise<{
  success: boolean;
  emailId?: string;
  error?: string;
}> {
  const candidates = await detectFollowUpNeeds(userId);
  const candidate = candidates.find(c => c.quoteId === quoteId);

  if (!candidate) {
    return { success: false, error: 'No follow-up needed for this quote' };
  }

  if (!candidate.clientEmail) {
    return { success: false, error: 'No client email available' };
  }

  const tone = determineTone(candidate);
  const goal = determineGoal(candidate, tone);
  const content = await generateEmailContent(candidate, tone, goal);

  const result = await sendTrackedEmail({
    to: candidate.clientEmail,
    subject: content.subject,
    html: content.body.replace(/\n/g, '<br />'),
    quoteId,
    eventType: QUOTE_EVENT_TYPES.FOLLOWUP_SENT,
  });

  if (result.success && result.emailId) {
    await db.insert(quoteEvents).values({
      quoteId,
      type: QUOTE_EVENT_TYPES.FOLLOWUP_SENT,
      metadata: {
        emailId: result.emailId,
        tone,
        goal,
        daysSinceSent: candidate.daysSinceSent,
        viewCount: candidate.viewCount,
      },
    });
  }

  return result;
}
