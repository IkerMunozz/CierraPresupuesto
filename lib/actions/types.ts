export type ActionPriority = 'HIGH' | 'MEDIUM' | 'LOW';

export type ActionKind =
  | 'FOLLOW_UP'
  | 'OPTIMIZE_QUOTE'
  | 'PRIORITIZE'
  | 'RISK_ALERT'
  | 'REVENUE_OPPORTUNITY';

export interface Action {
  id: string;
  kind: ActionKind;
  title: string;
  reason: string;
  impact: number;
  priority: ActionPriority;
  entity: {
    type: 'client' | 'quote' | 'pipeline';
    id: string;
    name: string;
  };
  cta: string;
  actionUrl?: string;
  meta?: Record<string, unknown>;
  createdAt: Date;
}

export interface ActionScore {
  recency: number;
  value: number;
  urgency: number;
  probability: number;
  total: number;
}

export interface ActionState {
  actions: Action[];
  dismissed: Set<string>;
  completed: Set<string>;
  totalImpact: number;
  loading: boolean;
}
