import type { Action, ActionPriority, ActionKind, ActionScore } from './types';

const PRIORITY_WEIGHTS: Record<ActionPriority, number> = {
  HIGH: 1.0,
  MEDIUM: 0.6,
  LOW: 0.3,
};

const KIND_WEIGHTS: Record<ActionKind, number> = {
  RISK_ALERT: 1.2,
  REVENUE_OPPORTUNITY: 1.1,
  OPTIMIZE_QUOTE: 1.0,
  FOLLOW_UP: 0.9,
  PRIORITIZE: 0.8,
};

export function scoreAction(action: Action): ActionScore {
  const maxImpact = 10000;
  const hoursSinceCreated = Math.max(
    1,
    (Date.now() - action.createdAt.getTime()) / (1000 * 60 * 60),
  );

  const recency = Math.max(0, 1 - hoursSinceCreated / 168);
  const value = Math.min(action.impact / maxImpact, 1);
  const urgency = action.priority === 'HIGH' ? 1 : action.priority === 'MEDIUM' ? 0.6 : 0.3;
  const probability = KIND_WEIGHTS[action.kind] * 0.8;

  const total =
    recency * 0.15 +
    value * 0.35 +
    urgency * 0.30 +
    probability * 0.20;

  return { recency, value, urgency, probability, total };
}

export function rankActions(actions: Action[]): Action[] {
  return actions
    .map((action) => ({ action, score: scoreAction(action) }))
    .sort((a, b) => b.score.total - a.score.total)
    .map(({ action }) => action);
}

export function pruneActions(actions: Action[], max = 5): Action[] {
  const ranked = rankActions(actions);

  const high = ranked.filter((a) => a.priority === 'HIGH');
  const medium = ranked.filter((a) => a.priority === 'MEDIUM');
  const low = ranked.filter((a) => a.priority === 'LOW');

  const result: Action[] = [];

  result.push(...high.slice(0, 2));
  if (result.length < max) {
    result.push(...medium.slice(0, max - result.length));
  }
  if (result.length < max) {
    result.push(...low.slice(0, max - result.length));
  }

  return result.slice(0, max);
}
