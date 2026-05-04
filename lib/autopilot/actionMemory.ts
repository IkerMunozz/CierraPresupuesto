import { db } from '@/lib/db';
import { eq, and, gte, sql, desc } from 'drizzle-orm';
import { quoteEvents, emailTracking } from '@/lib/db/schema';
import { QUOTE_EVENT_TYPES } from '@/lib/db/events';

export interface MemoryCheck {
  canProceed: boolean;
  reason: string;
  riskLevel: 'low' | 'medium' | 'high';
  blockedActions: BlockedAction[];
}

export interface BlockedAction {
  quoteId: string;
  action: string;
  blocked: boolean;
  reason: string;
  hoursUntilAvailable: number;
}

export interface ActionHistory {
  quoteId: string;
  action: string;
  executedAt: Date;
  metadata: Record<string, unknown> | null;
}

const COOLDOWN_72H = 72 * 60 * 60 * 1000;
const RECENT_WINDOW_DAYS = 7;
const MAX_ACTIONS_PER_QUOTE_7D = 5;
const MAX_ACTIONS_PER_DAY = 8;
const SPAM_THRESHOLD_PER_QUOTE = 3;

async function getRecentActions(userId: string): Promise<ActionHistory[]> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - RECENT_WINDOW_DAYS);

  const userQuotes = await db
    .select({ id: quoteEvents.quoteId })
    .from(quoteEvents)
    .where(eq(quoteEvents.quoteId, sql`ANY(SELECT id FROM quotes WHERE user_id = ${userId})`));

  if (userQuotes.length === 0) return [];

  const quoteIds = [...new Set(userQuotes.map(q => q.id))];

  const events = await db
    .select({
      quoteId: quoteEvents.quoteId,
      type: quoteEvents.type,
      metadata: quoteEvents.metadata,
      createdAt: quoteEvents.createdAt,
    })
    .from(quoteEvents)
    .where(
      and(
        sql`${quoteEvents.quoteId} = ANY(${quoteIds})`,
        gte(quoteEvents.createdAt, cutoffDate)
      )
    )
    .orderBy(desc(quoteEvents.createdAt));

  const emailEvents = await db
    .select({
      quoteId: emailTracking.quoteId,
      eventType: emailTracking.eventType,
      createdAt: emailTracking.createdAt,
    })
    .from(emailTracking)
    .where(
      and(
        sql`${emailTracking.quoteId} = ANY(${quoteIds})`,
        gte(emailTracking.createdAt, cutoffDate)
      )
    );

  const actions: ActionHistory[] = events.map(e => ({
    quoteId: e.quoteId,
    action: e.type,
    executedAt: new Date(e.createdAt),
    metadata: e.metadata as Record<string, unknown> | null,
  }));

  emailEvents.forEach(e => {
    actions.push({
      quoteId: e.quoteId,
      action: `EMAIL_${e.eventType}`,
      executedAt: new Date(e.createdAt),
      metadata: null,
    });
  });

  return actions.sort((a, b) => b.executedAt.getTime() - a.executedAt.getTime());
}

function checkCooldown(
  quoteId: string,
  action: string,
  actions: ActionHistory[]
): BlockedAction {
  const recentForQuote = actions.filter(
    a => a.quoteId === quoteId && actionMatches(a.action, action)
  );

  const mostRecent = recentForQuote[0];

  if (!mostRecent) {
    return {
      quoteId,
      action,
      blocked: false,
      reason: '',
      hoursUntilAvailable: 0,
    };
  }

  const hoursSince = (Date.now() - mostRecent.executedAt.getTime()) / (1000 * 60 * 60);

  if (hoursSince < 72) {
    return {
      quoteId,
      action,
      blocked: true,
      reason: `Cooldown: ${action} ejecutada hace ${Math.floor(hoursSince)}h (mínimo 72h). Última: ${mostRecent.executedAt.toISOString()}`,
      hoursUntilAvailable: Math.ceil(72 - hoursSince),
    };
  }

  return {
    quoteId,
    action,
    blocked: false,
    reason: '',
    hoursUntilAvailable: 0,
  };
}

function checkOverActioning(
  actions: ActionHistory[]
): { overActing: boolean; riskLevel: 'low' | 'medium' | 'high'; reason: string } {
  const now = Date.now();
  const last24h = actions.filter(a => now - a.executedAt.getTime() < 24 * 60 * 60 * 1000);
  const last7d = actions.filter(a => now - a.executedAt.getTime() < 7 * 24 * 60 * 60 * 1000);

  const actionsPerQuote7d = new Map<string, number>();
  last7d.forEach(a => {
    actionsPerQuote7d.set(a.quoteId, (actionsPerQuote7d.get(a.quoteId) || 0) + 1);
  });

  const overActiveQuotes: string[] = [];
  actionsPerQuote7d.forEach((count, quoteId) => {
    if (count > MAX_ACTIONS_PER_QUOTE_7D) {
      overActiveQuotes.push(quoteId);
    }
  });

  if (overActiveQuotes.length > 3) {
    return {
      overActing: true,
      riskLevel: 'high',
      reason: `Sistema sobre-actuando: ${overActiveQuotes.length} quotes con más de ${MAX_ACTIONS_PER_QUOTE_7D} acciones en 7 días. Total acciones 24h: ${last24h.length}. Reduce frecuencia.`,
    };
  }

  if (last24h.length > MAX_ACTIONS_PER_DAY) {
    return {
      overActing: true,
      riskLevel: 'medium',
      reason: `${last24h.length} acciones en las últimas 24h (máximo ${MAX_ACTIONS_PER_DAY}). El sistema está actuando demasiado rápido.`,
    };
  }

  const repeatOffenders = checkRepeatedPatterns(actions);
  if (repeatOffenders.length > 0) {
    return {
      overActing: true,
      riskLevel: repeatOffenders.length > 2 ? 'high' : 'medium',
      reason: `Patrones repetitivos detectados en ${repeatOffenders.length} quotes. Acciones similares ejecutadas múltiples veces sin resultado.`,
    };
  }

  return { overActing: false, riskLevel: 'low', reason: '' };
}

function checkRepeatedPatterns(actions: ActionHistory[]): string[] {
  const quoteActions = new Map<string, string[]>();

  actions.forEach(a => {
    const existing = quoteActions.get(a.quoteId) || [];
    existing.push(a.action);
    quoteActions.set(a.quoteId, existing);
  });

  const offenders: string[] = [];

  quoteActions.forEach((actionList, quoteId) => {
    const followUpCount = actionList.filter(a =>
      a === 'QUOTE_FOLLOWUP_SENT' || a.startsWith('EMAIL_')
    ).length;

    if (followUpCount >= SPAM_THRESHOLD_PER_QUOTE) {
      offenders.push(quoteId);
    }
  });

  return offenders;
}

function actionMatches(historyAction: string, newAction: string): boolean {
  if (historyAction === newAction) return true;

  const followUpGroup = [
    'QUOTE_FOLLOWUP_SENT',
    'EMAIL_FOLLOWUP',
    'EMAIL_INITIAL',
    'EMAIL_RESEND',
    'SEND_EMAIL',
    'FOLLOW_UP',
  ];

  if (followUpGroup.includes(historyAction) && followUpGroup.includes(newAction)) {
    return true;
  }

  const emailGroup = [
    'EMAIL_',
    'send_followup_email',
    'send_initial_quote',
    'SEND_EMAIL',
  ];

  const isEmail1 = emailGroup.some(g => historyAction.includes(g) || g.includes(historyAction));
  const isEmail2 = emailGroup.some(g => newAction.includes(g) || g.includes(newAction));
  if (isEmail1 && isEmail2) return true;

  return false;
}

function calculateRiskLevel(
  cooldownBlocks: BlockedAction[],
  overActing: { overActing: boolean; riskLevel: string }
): 'low' | 'medium' | 'high' {
  if (overActing.riskLevel === 'high') return 'high';

  const blockedCount = cooldownBlocks.filter(b => b.blocked).length;

  if (blockedCount >= 3) return 'high';
  if (blockedCount >= 1) return 'medium';

  return 'low';
}

export async function checkMemoryBeforeAction(
  userId: string,
  pendingActions: { quoteId: string; action: string }[]
): Promise<MemoryCheck> {
  const history = await getRecentActions(userId);

  if (history.length === 0) {
    return {
      canProceed: true,
      reason: 'Sin historial de acciones. Proceed sin restricciones.',
      riskLevel: 'low',
      blockedActions: [],
    };
  }

  const blockedActions: BlockedAction[] = pendingActions.map(pa =>
    checkCooldown(pa.quoteId, pa.action, history)
  );

  const overActing = checkOverActioning(history);

  const allBlocked = blockedActions.filter(b => b.blocked);
  const canProceed = allBlocked.length < pendingActions.length && !overActing.overActing;

  let reason = '';

  if (overActing.overActing) {
    reason = overActing.reason;
  } else if (allBlocked.length > 0) {
    const blockedQuotes = allBlocked.map(b => b.quoteId.slice(0, 8)).join(', ');
    reason = `${allBlocked.length} acciones bloqueadas por cooldown (quotes: ${blockedQuotes}). Las demás pueden proceder.`;
  } else {
    reason = `Todas las acciones pueden proceder. Historial: ${history.length} acciones en ${RECENT_WINDOW_DAYS} días.`;
  }

  const riskLevel = calculateRiskLevel(blockedActions, overActing);

  return {
    canProceed,
    reason,
    riskLevel,
    blockedActions,
  };
}

export async function getMemorySummary(userId: string): Promise<{
  totalActions7d: number;
  actionsPerQuote: Record<string, number>;
  repeatOffenders: string[];
  overActing: boolean;
  cooldownViolations: number;
}> {
  const history = await getRecentActions(userId);

  const actionsPerQuote: Record<string, number> = {};
  history.forEach(a => {
    actionsPerQuote[a.quoteId] = (actionsPerQuote[a.quoteId] || 0) + 1;
  });

  const repeatOffenders = checkRepeatedPatterns(history);
  const overActingResult = checkOverActioning(history);

  const now = Date.now();
  let cooldownViolations = 0;

  const quoteActionPairs = new Map<string, Date[]>();
  history.forEach(a => {
    const key = `${a.quoteId}-${a.action}`;
    const times = quoteActionPairs.get(key) || [];
    times.push(a.executedAt);
    quoteActionPairs.set(key, times);
  });

  quoteActionPairs.forEach(times => {
    for (let i = 1; i < times.length; i++) {
      const gap = times[i - 1].getTime() - times[i].getTime();
      if (gap < COOLDOWN_72H) {
        cooldownViolations++;
      }
    }
  });

  return {
    totalActions7d: history.length,
    actionsPerQuote,
    repeatOffenders,
    overActing: overActingResult.overActing,
    cooldownViolations,
  };
}
