import { checkMemoryBeforeAction } from './actionMemory';
import { evaluatePoliciesWrapper } from './policyEngine';
import { calculateRevenueImpact } from './revenuePrioritizer';
import { db } from '@/lib/db';
import { eq } from 'drizzle-orm';
import { quotes } from '@/lib/db/schema';

export interface FinalOrchestratorInput {
  userId: string;
  quoteId: string;
  proposedAction: 'SEND_EMAIL' | 'FOLLOW_UP' | 'ALERT_USER' | 'DO_NOTHING';
  dryRun?: boolean;
}

export interface FinalOrchestratorOutput {
  finalAction: 'EXECUTE' | 'BLOCK' | 'DEFER';
  reason: string;
  quoteId: string;
  expectedImpact: number;
  confidence: number;
}

interface SafetyChecks {
  memory: {
    safe: boolean;
    reason: string;
    hoursUntilAvailable: number;
  };
  policy: {
    safe: boolean;
    reason: string;
    riskLevel: 'low' | 'medium' | 'high';
  };
  impact: {
    value: number;
    confidence: number;
    requiresHumanReview: boolean;
  };
}

async function runSafetyChecks(
  userId: string,
  quoteId: string,
  action: string
): Promise<SafetyChecks> {
  const memoryResult = await checkMemoryBeforeAction(userId, [
    { quoteId, action: action as any },
  ]);

  const blockedAction = memoryResult.blockedActions.find(
    (b) => b.quoteId === quoteId && (b.action === action || b.action === action)
  );

  const policyResult = await evaluatePoliciesWrapper(
    userId,
    quoteId,
    action as 'SEND_EMAIL' | 'FOLLOW_UP' | 'ALERT_USER'
  );

  const impactResult = await calculateRevenueImpact(userId, [quoteId]);
  const quoteImpact = impactResult.find((i) => i.quoteId === quoteId);

  return {
    memory: {
      safe: !blockedAction,
      reason: blockedAction?.reason || '',
      hoursUntilAvailable: blockedAction?.hoursUntilAvailable || 0,
    },
    policy: {
      safe: policyResult.allowed,
      reason: policyResult.reason || '',
      riskLevel: policyResult.overrideRisk || 'low',
    },
    impact: {
      value: quoteImpact?.expectedImpact || 0,
      confidence: quoteImpact?.confidence || 50,
      requiresHumanReview: (quoteImpact?.expectedImpact || 0) > 2000,
    },
  };
}

export async function orchestrateFinalDecision(
  input: FinalOrchestratorInput
): Promise<FinalOrchestratorOutput> {
  const { userId, quoteId, proposedAction, dryRun = false } = input;

  if (proposedAction === 'DO_NOTHING') {
    return {
      finalAction: 'BLOCK',
      reason: 'No hay acción propuesta para ejecutar.',
      quoteId,
      expectedImpact: 0,
      confidence: 0,
    };
  }

  const quote = await db
    .select()
    .from(quotes)
    .where(eq(quotes.id, quoteId))
    .limit(1);

  if (quote.length === 0) {
    return {
      finalAction: 'BLOCK',
      reason: 'El presupuesto no existe.',
      quoteId,
      expectedImpact: 0,
      confidence: 0,
    };
  }

  const checks = await runSafetyChecks(userId, quoteId, proposedAction);

  if (checks.policy.riskLevel === 'high') {
    return {
      finalAction: 'BLOCK',
      reason: `Política de seguridad bloqueó: ${checks.policy.reason}`,
      quoteId,
      expectedImpact: checks.impact.value,
      confidence: checks.impact.confidence,
    };
  }

  if (!checks.policy.safe) {
    return {
      finalAction: 'BLOCK',
      reason: `Política bloqueó: ${checks.policy.reason}`,
      quoteId,
      expectedImpact: 0,
      confidence: checks.impact.confidence,
    };
  }

  if (!checks.memory.safe) {
    const deferTime = checks.memory.hoursUntilAvailable;
    return {
      finalAction: deferTime > 24 ? 'BLOCK' : 'DEFER',
      reason: `Acción reciente detectada: ${checks.memory.reason}. Disponible en ${deferTime}h.`,
      quoteId,
      expectedImpact: checks.impact.value,
      confidence: checks.impact.confidence,
    };
  }

  if (checks.impact.requiresHumanReview) {
    return {
      finalAction: 'DEFER',
      reason: `Impacto alto (${checks.impact.value}€) requiere revisión humana antes de ejecutar.`,
      quoteId,
      expectedImpact: checks.impact.value,
      confidence: checks.impact.confidence,
    };
  }

  if (checks.impact.value < 50 && checks.impact.confidence < 30) {
    return {
      finalAction: 'BLOCK',
      reason: `Impacto y confianza demasiado bajos para justificar la acción.`,
      quoteId,
      expectedImpact: 0,
      confidence: checks.impact.confidence,
    };
  }

  if (dryRun) {
    return {
      finalAction: 'EXECUTE',
      reason: `Aprobado para ejecución (dry run): ${proposedAction}. Impacto: ${checks.impact.value}€.`,
      quoteId,
      expectedImpact: checks.impact.value,
      confidence: checks.impact.confidence,
    };
  }

  return {
    finalAction: 'EXECUTE',
    reason: `Todas las verificaciones pasaron. Ejecutar ${proposedAction}.`,
    quoteId,
    expectedImpact: checks.impact.value,
    confidence: checks.impact.confidence,
  };
}

export async function orchestrateBatchDecisions(
  userId: string,
  proposals: Array<{
    quoteId: string;
    proposedAction: 'SEND_EMAIL' | 'FOLLOW_UP' | 'ALERT_USER' | 'DO_NOTHING';
  }>,
  dryRun = false
): Promise<FinalOrchestratorOutput[]> {
  const decisions: FinalOrchestratorOutput[] = [];

  for (const proposal of proposals) {
    const decision = await orchestrateFinalDecision({
      userId,
      quoteId: proposal.quoteId,
      proposedAction: proposal.proposedAction,
      dryRun,
    });
    decisions.push(decision);
  }

  return decisions.sort((a, b) => b.expectedImpact - a.expectedImpact);
}
