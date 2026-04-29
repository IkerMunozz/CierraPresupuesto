// lib/db/eventTypes.ts - Constantes de tipos de eventos (sin dependencias circulares)
export const QUOTE_EVENT_TYPES = {
  CREATED: 'QUOTE_CREATED',
  SENT: 'QUOTE_SENT',
  VIEWED: 'QUOTE_VIEWED',
  ACCEPTED: 'QUOTE_ACCEPTED',
  REJECTED: 'QUOTE_REJECTED',
  FOLLOWUP_SENT: 'QUOTE_FOLLOWUP_SENT',
  FOLLOWUP_NEEDED: 'QUOTE_FOLLOWUP_NEEDED',
} as const;

export type QuoteEventType = (typeof QUOTE_EVENT_TYPES)[keyof typeof QUOTE_EVENT_TYPES];
