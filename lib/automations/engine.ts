// lib/automations/engine.ts
import { db } from '@/lib/db';
import { quoteEvents } from '@/lib/db/schema';
import { AutomationRule, RuleContext, AutomationResult } from './types';
import { executeAction } from './actions';
import { eq } from 'drizzle-orm';

export class AutomationEngine {
  private rules: AutomationRule[] = [];

  registerRule(rule: AutomationRule): void {
    this.rules.push(rule);
  }

  registerRules(rules: AutomationRule[]): void {
    this.rules.push(...rules);
  }

  async processEvent(event: {
    id: string;
    type: string;
    quoteId: string;
    metadata?: any;
    createdAt: Date;
  }): Promise<AutomationResult[]> {
    const results: AutomationResult[] = [];

    // Obtener userId del presupuesto
    const { quotes } = await import('@/lib/db/schema');

    const quote = await db
      .select({ userId: quotes.userId })
      .from(quotes)
      .where(eq(quotes.id, event.quoteId))
      .limit(1);

    if (!quote[0]) {
      return [{ ruleId: 'system', ruleName: 'Quote not found', actionsExecuted: 0, success: false, error: 'Quote not found' }];
    }

    const context: RuleContext = {
      quoteId: event.quoteId,
      userId: quote[0].userId,
      event,
      db,
    };

    for (const rule of this.rules) {
      try {
        if (rule.trigger.eventType !== event.type) continue;

        let shouldExecute = true;
        if (rule.trigger.conditions) {
          shouldExecute = await rule.trigger.conditions(event, context);
        }

        if (!shouldExecute) continue;

        // Verificar deduplicación
        if (rule.deduplicationKey) {
          const key = rule.deduplicationKey(event);
          const existing = await db
            .select({ id: quoteEvents.id })
            .from(quoteEvents)
            .where(eq(quoteEvents.quoteId, event.quoteId))
            .limit(1);

          if (existing.length > 0) continue;
        }

        let actionsExecuted = 0;
        for (const action of rule.actions) {
          // Inyectar originalEventId en metadata si es necesario
          if (action.type === 'emit_event' && action.params.metadata) {
            action.params.metadata.originalEventId = event.id;
          }

          const success = await executeAction(action, context);
          if (success) actionsExecuted++;
        }

        results.push({
          ruleId: rule.id,
          ruleName: rule.name,
          actionsExecuted,
          success: true,
        });
      } catch (error) {
        results.push({
          ruleId: rule.id,
          ruleName: rule.name,
          actionsExecuted: 0,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return results;
  }
}

// Instancia singleton
export const automationEngine = new AutomationEngine();
