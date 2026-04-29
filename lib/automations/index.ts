// lib/automations/index.ts - Inicialización del sistema de automatización
import { automationEngine } from './engine';
import { allRules } from './rules';

let initialized = false;

export function initializeAutomations(): void {
  if (initialized) return;

  automationEngine.registerRules(allRules);
  initialized = true;

  console.log(`[Automations] Initialized with ${allRules.length} rules`);
}

export async function processEventWithAutomation(event: {
  id: string;
  type: string;
  quoteId: string;
  metadata?: any;
  createdAt: Date;
}): Promise<void> {
  try {
    const results = await automationEngine.processEvent(event);

    for (const result of results) {
      if (result.success) {
        console.log(`[Automation] Rule "${result.ruleName}" executed ${result.actionsExecuted} actions`);
      } else {
        console.error(`[Automation] Rule "${result.ruleName}" failed:`, result.error);
      }
    }
  } catch (error) {
    console.error('[Automation] Error processing event:', error);
  }
}

// Exportar todo
export { automationEngine } from './engine';
export type { AutomationRule, AutomationAction, RuleContext, AutomationResult } from './types';
