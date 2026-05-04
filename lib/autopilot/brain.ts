import { db } from '@/lib/db';
import { eq } from 'drizzle-orm';
import { quotes } from '@/lib/db/schema';
import { findCriticalOpportunity, type CriticalOpportunity } from './criticalOpportunity';
import { makeAutonomousDecision, type DecisionOutput } from './autonomousDecision';
import { prioritizeRevenue, type PrioritizedAction } from './revenuePrioritizer';
import { evaluatePoliciesWrapper, type PolicyCheck } from './policyEngine';
import { checkMemoryBeforeAction, type MemoryCheck } from './actionMemory';
import { checkSaturationForQuote, type SaturationCheck } from './communicationSaturation';
import { executeDecision, type ExecutionResult } from './actionExecutor';
import { db } from '@/lib/db';
import { eq } from 'drizzle-orm';
import { quotes } from '@/lib/db/schema';

export type BrainAction = 'EXECUTE' | 'ALERT' | 'SKIP';

export interface BrainOutput {
  action: BrainAction;
  decision: DecisionOutput | CriticalOpportunity | PrioritizedAction | null;
  reason: string;
  expectedRevenueImpact: number;
  checks: {
    memory: MemoryCheck;
    policy: PolicyCheck | null;
    saturation: SaturationCheck | null;
  };
  execution?: ExecutionResult;
}

interface BrainConfig {
  minImpactThreshold: number;
  minConfidenceThreshold: number;
  maxCriticalActionsPerCycle: number;
  skipLowImpactBelow: number;
  alertRiskAbove: number;
}

const DEFAULT_CONFIG: BrainConfig = {
  minImpactThreshold: 100,
  minConfidenceThreshold: 30,
  maxCriticalActionsPerCycle: 1,
  skipLowImpactBelow: 200,
  alertRiskAbove: 5000,
};

function computeImpactScore(
  decision: DecisionOutput,
  critical: CriticalOpportunity | null,
  top3: PrioritizedAction[]
): { impact: number; source: string } {
  const decisionImpact = decision.expectedImpact || 0;

  if (critical && critical.value > decisionImpact) {
    return { impact: critical.value * 0.5, source: 'critical_opportunity' };
  }

  if (top3.length > 0 && top3[0].impact > decisionImpact) {
    return { impact: top3[0].impact, source: 'revenue_prioritizer' };
  }

  return { impact: decisionImpact, source: 'autonomous_decision' };
}

export async function runBrainLoop(
  userId: string,
  config: BrainConfig = DEFAULT_CONFIG,
  dryRun: boolean = false
): Promise<BrainOutput> {
  const [critical, decision, top3] = await Promise.all([
    findCriticalOpportunity(userId),
    makeAutonomousDecision(userId),
    prioritizeRevenue(userId),
  ]);

  const { impact, source } = computeImpactScore(decision, critical, top3);

  const confidence = decision.confidence || 50;

  if (impact < config.minImpactThreshold) {
    return {
      action: 'SKIP',
      decision: null,
      reason: `Impacto estimado (${impact}€) por debajo del umbral mínimo (${config.minImpactThreshold}€). Sin acción necesaria.`,
      expectedRevenueImpact: 0,
      checks: {
        memory: { canProceed: true, reason: '', riskLevel: 'low', blockedActions: [] },
        policy: null,
        saturation: null,
      },
    };
  }

  if (confidence < config.minConfidenceThreshold) {
    return {
      action: 'SKIP',
      decision,
      reason: `Confianza baja (${confidence}%) para la acción "${decision.action}". Se necesita más información antes de actuar.`,
      expectedRevenueImpact: 0,
      checks: {
        memory: { canProceed: true, reason: '', riskLevel: 'low', blockedActions: [] },
        policy: null,
        saturation: null,
      },
    };
  }

  const targetQuoteId = decision.targetId || critical?.quoteId || top3[0]?.quoteId || '';

  if (!targetQuoteId) {
    return {
      action: 'SKIP',
      decision: null,
      reason: 'No hay presupuesto objetivo para actuar.',
      expectedRevenueImpact: 0,
      checks: {
        memory: { canProceed: true, reason: '', riskLevel: 'low', blockedActions: [] },
        policy: null,
        saturation: null,
      },
    };
  }

  const saturationCheck = await checkSaturationForQuote(userId, targetQuoteId);

  if (!saturationCheck.safeToAct) {
    return {
      action: 'SKIP',
      decision,
      reason: `Saturación de comunicación: ${saturationCheck.reason}. Esperar ${saturationCheck.recommendedWaitTimeHours}h.`,
      expectedRevenueImpact: 0,
      checks: {
        memory: { canProceed: true, reason: '', riskLevel: 'low', blockedActions: [] },
        policy: null,
        saturation: saturationCheck,
      },
    };
  }

  const actionForMemory = decision.action === 'DO_NOTHING' ? 'SEND_EMAIL' : decision.action;

  const memoryCheck = await checkMemoryBeforeAction(userId, [
    { quoteId: targetQuoteId, action: actionForMemory },
  ]);

  const blockedForTarget = memoryCheck.blockedActions.find(
    b => b.quoteId === targetQuoteId && b.blocked
  );

  if (blockedForTarget) {
    return {
      action: 'SKIP',
      decision,
      reason: `Memoria bloqueó: ${blockedForTarget.reason}. Próxima acción disponible en ${blockedForTarget.hoursUntilAvailable}h.`,
      expectedRevenueImpact: 0,
      checks: { memory: memoryCheck, policy: null, saturation: saturationCheck },
    };
  }

  if (memoryCheck.riskLevel === 'high') {
    return {
      action: 'ALERT',
      decision,
      reason: `Riesgo de sobre-actuación detectado: ${memoryCheck.reason}. El sistema está actuando demasiado rápido. Notificar al usuario.`,
      expectedRevenueImpact: impact,
      checks: { memory: memoryCheck, policy: null, saturation: saturationCheck },
    };
  }

  const policyAction = actionForMemory === 'SEND_EMAIL' || actionForMemory === 'FOLLOW_UP'
    ? actionForMemory as 'SEND_EMAIL' | 'FOLLOW_UP'
    : 'ALERT_USER' as 'ALERT_USER';

  const policyCheck = await evaluatePoliciesWrapper(userId, targetQuoteId, policyAction);

  if (!policyCheck.allowed) {
    if (policyCheck.overrideRisk === 'high') {
      return {
        action: 'ALERT',
        decision,
        reason: `Política bloqueó con riesgo alto: ${policyCheck.reason}. Requiere revisión manual del usuario.`,
        expectedRevenueImpact: impact,
        checks: { memory: memoryCheck, policy: policyCheck, saturation: saturationCheck },
      };
    }

    return {
      action: 'SKIP',
      decision,
      reason: `Política bloqueó: ${policyCheck.reason}.`,
      expectedRevenueImpact: 0,
      checks: { memory: memoryCheck, policy: policyCheck, saturation: saturationCheck },
    };
  }

  if (impact > config.alertRiskAbove) {
    return {
      action: 'ALERT',
      decision,
      reason: `Oportunidad de alto valor detectada (${impact}€). Requiere atención personalizada del usuario antes de automatizar.`,
      expectedRevenueImpact: impact,
      checks: { memory: memoryCheck, policy: policyCheck, saturation: saturationCheck },
    };
  }

  if (dryRun) {
    return {
      action: 'EXECUTE',
      decision,
      reason: `Acción aprobada: ${decision.action} para ${targetQuoteId}. Impacto: ${impact}€. Confianza: ${confidence}%. Dry run - no ejecutado.`,
      expectedRevenueImpact: impact,
      checks: { memory: memoryCheck, policy: policyCheck, saturation: saturationCheck },
    };
  }

  const execution = await executeDecision(userId, decision);

  if (!execution.success) {
    return {
      action: 'SKIP',
      decision,
      reason: `Error al ejecutar: ${execution.error || execution.detail}.`,
      expectedRevenueImpact: 0,
      checks: { memory: memoryCheck, policy: policyCheck, saturation: saturationCheck },
      execution,
    };
  }

  return {
    action: 'EXECUTE',
    decision,
    reason: `Acción ejecutada: ${decision.action} para "${decision.targetId}". ${execution.detail}`,
    expectedRevenueImpact: impact,
    checks: { memory: memoryCheck, policy: policyCheck, saturation: saturationCheck },
    execution,
  };
}

export async function runBrainLoopBatch(
  userId: string,
  config: BrainConfig = DEFAULT_CONFIG,
  maxActions: number = 3
): Promise<{
  totalAnalyzed: number;
  executed: number;
  alerted: number;
  skipped: number;
  results: BrainOutput[];
}> {
  const results: BrainOutput[] = [];
  let executedCount = 0;

  const top3 = await prioritizeRevenue(userId);
  const critical = await findCriticalOpportunity(userId);

  const candidates = [
    critical ? { quoteId: critical.quoteId, action: 'FOLLOW_UP' as const } : null,
    ...top3.slice(0, maxActions).map(a => ({ quoteId: a.quoteId, action: 'FOLLOW_UP' as const })),
  ].filter(Boolean) as { quoteId: string; action: 'FOLLOW_UP' | 'SEND_EMAIL' }[];

  for (const candidate of candidates.slice(0, maxActions)) {
    if (executedCount >= config.maxCriticalActionsPerCycle) break;

    const { makeAutonomousDecision } = await import('./autonomousDecision');
    const decision = await makeAutonomousDecision(userId);

    const result = await runBrainLoop(userId, config, false);
    results.push(result);

    if (result.action === 'EXECUTE') {
      executedCount++;
    }
  }

  return {
    totalAnalyzed: candidates.length,
    executed: results.filter(r => r.action === 'EXECUTE').length,
    alerted: results.filter(r => r.action === 'ALERT').length,
    skipped: results.filter(r => r.action === 'SKIP').length,
    results,
  };
}
