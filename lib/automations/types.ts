// lib/automations/types.ts

export interface AutomationRule {
  id: string;
  name: string;
  description: string;
  // Evento que dispara la regla
  trigger: {
    eventType: string;
    conditions?: (event: any, context: RuleContext) => Promise<boolean> | boolean;
  };
  // Acciones a ejecutar
  actions: AutomationAction[];
  // Evitar ejecuciones duplicadas
  deduplicationKey?: (event: any) => string;
}

export interface AutomationAction {
  type: 'emit_event' | 'send_email' | 'create_notification' | 'update_quote';
  params: Record<string, any>;
}

export interface RuleContext {
  quoteId: string;
  userId: string;
  event: any;
  db: any; // Drizzle db instance
}

export interface AutomationResult {
  ruleId: string;
  ruleName: string;
  actionsExecuted: number;
  success: boolean;
  error?: string;
}
