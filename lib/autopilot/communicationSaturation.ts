import { db } from '@/lib/db';
import { eq, and, sql, gte, desc } from 'drizzle-orm';
import { quotes, quoteEvents, emailTracking, clients } from '@/lib/db/schema';
import { QUOTE_EVENT_TYPES } from '@/lib/db/events';

export interface SaturationCheck {
  safeToAct: boolean;
  recommendedWaitTimeHours: number;
  reason: string;
}

interface ClientCommunicationProfile {
  clientId: number | null;
  clientEmail: string;
  totalEmails7d: number;
  totalFollowUps7d: number;
  lastContactAt: Date | null;
  hoursSinceLastContact: number;
  quoteIds: string[];
  saturationScore: number;
}

const SATURATION_LIMITS = {
  maxEmailsPerClient7d: 5,
  maxFollowUpsPerClient7d: 3,
  minHoursBetweenContacts: 48,
  minHoursBetweenFollowUps: 72,
  criticalSaturationScore: 80,
  warningSaturationScore: 50,
};

async function getCommunicationProfiles(userId: string): Promise<Map<string, ClientCommunicationProfile>> {
  const userQuotes = await db
    .select()
    .from(quotes)
    .where(eq(quotes.userId, userId));

  if (userQuotes.length === 0) return new Map();

  const quoteIds = userQuotes.map(q => q.id);
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const quoteClients = new Map<string, { clientId: number | null; clientEmail: string }>();

  for (const q of userQuotes) {
    if (q.clientId) {
      const client = await db
        .select()
        .from(clients)
        .where(eq(clients.id, q.clientId))
        .limit(1);

      if (client.length > 0) {
        quoteClients.set(q.id, {
          clientId: client[0].id,
          clientEmail: client[0].email || q.clientEmail || '',
        });
      }
    } else {
      quoteClients.set(q.id, {
        clientId: null,
        clientEmail: q.clientEmail || '',
      });
    }
  }

  const recentEmailEvents = await db
    .select()
    .from(emailTracking)
    .where(
      and(
        sql`${emailTracking.quoteId} = ANY(${quoteIds})`,
        gte(emailTracking.createdAt, sevenDaysAgo)
      )
    );

  const recentFollowUpEvents = await db
    .select()
    .from(quoteEvents)
    .where(
      and(
        sql`${quoteEvents.quoteId} = ANY(${quoteIds})`,
        eq(quoteEvents.type, QUOTE_EVENT_TYPES.FOLLOWUP_SENT),
        gte(quoteEvents.createdAt, sevenDaysAgo)
      )
    );

  const profiles = new Map<string, ClientCommunicationProfile>();

  const clientEmails = [...new Set([...quoteClients.values()].map(c => c.clientEmail).filter(Boolean))];

  for (const email of clientEmails) {
    const relatedQuotes = [...quoteClients.entries()]
      .filter(([, c]) => c.clientEmail === email)
      .map(([qId]) => qId);

    const emailsToClient = recentEmailEvents.filter(e => relatedQuotes.includes(e.quoteId));
    const followUpsToClient = recentFollowUpEvents.filter(e => relatedQuotes.includes(e.quoteId));

    const allContacts = [...emailsToClient, ...followUpsToClient].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    const lastContactAt = allContacts.length > 0 ? new Date(allContacts[0].createdAt) : null;
    const hoursSinceLastContact = lastContactAt
      ? (Date.now() - lastContactAt.getTime()) / (1000 * 60 * 60)
      : 999;

    const saturationScore = calculateSaturationScore(
      emailsToClient.length,
      followUpsToClient.length,
      hoursSinceLastContact
    );

    profiles.set(email, {
      clientId: quoteClients.get(relatedQuotes[0])?.clientId || null,
      clientEmail: email,
      totalEmails7d: emailsToClient.length,
      totalFollowUps7d: followUpsToClient.length,
      lastContactAt,
      hoursSinceLastContact,
      quoteIds: relatedQuotes,
      saturationScore,
    });
  }

  return profiles;
}

function calculateSaturationScore(
  emails7d: number,
  followUps7d: number,
  hoursSinceLastContact: number
): number {
  let score = 0;

  const emailRatio = emails7d / SATURATION_LIMITS.maxEmailsPerClient7d;
  score += Math.min(emailRatio * 50, 50);

  const followUpRatio = followUps7d / SATURATION_LIMITS.maxFollowUpsPerClient7d;
  score += Math.min(followUpRatio * 30, 30);

  if (hoursSinceLastContact < SATURATION_LIMITS.minHoursBetweenContacts) {
    const timePenalty = (1 - hoursSinceLastContact / SATURATION_LIMITS.minHoursBetweenContacts) * 20;
    score += timePenalty;
  }

  return Math.min(Math.round(score), 100);
}

export async function checkSaturationForClient(
  userId: string,
  clientEmail: string
): Promise<SaturationCheck> {
  const profiles = await getCommunicationProfiles(userId);
  const profile = profiles.get(clientEmail);

  if (!profile) {
    return {
      safeToAct: true,
      recommendedWaitTimeHours: 0,
      reason: 'Sin historial de comunicación con este cliente. Seguro contactar.',
    };
  }

  return evaluateSaturation(profile);
}

export async function checkSaturationForQuote(
  userId: string,
  quoteId: string
): Promise<SaturationCheck> {
  const userQuote = await db
    .select({ clientEmail: quotes.clientEmail })
    .from(quotes)
    .where(eq(quotes.id, quoteId))
    .limit(1);

  if (userQuote.length === 0 || !userQuote[0].clientEmail) {
    return {
      safeToAct: false,
      recommendedWaitTimeHours: 0,
      reason: 'No se pudo determinar el email del cliente.',
    };
  }

  return checkSaturationForClient(userId, userQuote[0].clientEmail);
}

function evaluateSaturation(profile: ClientCommunicationProfile): SaturationCheck {
  const {
    totalEmails7d,
    totalFollowUps7d,
    hoursSinceLastContact,
    saturationScore,
  } = profile;

  if (totalEmails7d >= SATURATION_LIMITS.maxEmailsPerClient7d) {
    const waitHours = Math.max(
      SATURATION_LIMITS.minHoursBetweenContacts - hoursSinceLastContact,
      24
    );

    return {
      safeToAct: false,
      recommendedWaitTimeHours: Math.ceil(waitHours),
      reason: `Límite de emails alcanzado: ${totalEmails7d}/${SATURATION_LIMITS.maxEmailsPerClient7d} en 7 días. Esperar ${Math.ceil(waitHours)}h.`,
    };
  }

  if (totalFollowUps7d >= SATURATION_LIMITS.maxFollowUpsPerClient7d) {
    return {
      safeToAct: false,
      recommendedWaitTimeHours: 72,
      reason: `Límite de follow-ups alcanzado: ${totalFollowUps7d}/${SATURATION_LIMITS.maxFollowUpsPerClient7d} en 7 días. Esperar 72h.`,
    };
  }

  if (hoursSinceLastContact < SATURATION_LIMITS.minHoursBetweenFollowUps) {
    const waitHours = SATURATION_LIMITS.minHoursBetweenFollowUps - hoursSinceLastContact;

    return {
      safeToAct: false,
      recommendedWaitTimeHours: Math.ceil(waitHours),
      reason: `Último contacto hace ${Math.floor(hoursSinceLastContact)}h. Mínimo ${SATURATION_LIMITS.minHoursBetweenFollowUps}h entre contactos. Esperar ${Math.ceil(waitHours)}h.`,
    };
  }

  if (saturationScore >= SATURATION_LIMITS.criticalSaturationScore) {
    return {
      safeToAct: false,
      recommendedWaitTimeHours: 48,
      reason: `Saturación crítica (score: ${saturationScore}/100). El cliente está recibiendo demasiada comunicación. Esperar 48h.`,
    };
  }

  if (saturationScore >= SATURATION_LIMITS.warningSaturationScore) {
    const waitHours = Math.max(24 - hoursSinceLastContact, 0);

    return {
      safeToAct: true,
      recommendedWaitTimeHours: Math.ceil(waitHours),
      reason: `Saturación moderada (score: ${saturationScore}/100). Se puede actuar pero con precaución. ${totalEmails7d} emails y ${totalFollowUps7d} follow-ups en 7 días.`,
    };
  }

  return {
    safeToAct: true,
    recommendedWaitTimeHours: 0,
    reason: `Comunicación segura. Score: ${saturationScore}/100. ${totalEmails7d} emails y ${totalFollowUps7d} follow-ups en 7 días. Último contacto: ${Math.floor(hoursSinceLastContact)}h.`,
  };
}

export async function getSaturationReport(userId: string): Promise<{
  clients: { email: string; saturationScore: number; emails7d: number; followUps7d: number }[];
  totalClients: number;
  saturatedClients: number;
}> {
  const profiles = await getCommunicationProfiles(userId);

  const report = {
    clients: [...profiles.entries()].map(([email, p]) => ({
      email,
      saturationScore: p.saturationScore,
      emails7d: p.totalEmails7d,
      followUps7d: p.totalFollowUps7d,
    })),
    totalClients: profiles.size,
    saturatedClients: [...profiles.values()].filter(
      p => p.saturationScore >= SATURATION_LIMITS.warningSaturationScore
    ).length,
  };

  return report;
}
