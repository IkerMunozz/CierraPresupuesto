// lib/automations/rules.ts
import { AutomationRule } from './types';
import { QUOTE_EVENT_TYPES } from '@/lib/db/eventTypes';
import { getQuoteStatusFromEvents } from '@/lib/db/events';
import { subDays } from 'date-fns';

export const followUpRule: AutomationRule = {
  id: 'follow-up-after-3-days',
  name: 'Seguimiento tras 3 días sin respuesta',
  description: 'Si un presupuesto se envía y pasan 3 días sin aceptación, envía seguimiento',
  trigger: {
    eventType: QUOTE_EVENT_TYPES.SENT,
    conditions: async (event, context) => {
      const sentDate = new Date(event.createdAt);
      const threeDaysLater = subDays(new Date(), -3);

      if (sentDate > threeDaysLater) return false;

      const status = await getQuoteStatusFromEvents(context.quoteId);
      return status === 'sent' || status === 'viewed';
    },
  },
  deduplicationKey: (event) => `follow-up-${event.quoteId}`,
  actions: [
    {
      type: 'emit_event',
      params: {
        eventType: QUOTE_EVENT_TYPES.FOLLOWUP_SENT,
        metadata: { triggeredBy: 'automation' },
      },
    },
    {
      type: 'send_email',
      params: {
        subject: 'Seguimiento: ¿Qué te parece el presupuesto?',
        body: '<p>Hola, te escribo para hacer seguimiento del presupuesto enviado. ¿Tienes alguna duda?</p>',
      },
    },
    {
      type: 'create_notification',
      params: {
        message: 'Se envió seguimiento automático al cliente',
        type: 'info',
      },
    },
  ],
};

export const suggestActionOnViewRule: AutomationRule = {
  id: 'suggest-action-on-view',
  name: 'Sugerir acción tras visualización',
  description: 'Si el presupuesto fue visto pero no aceptado, sugerir acción',
  trigger: {
    eventType: QUOTE_EVENT_TYPES.VIEWED,
    conditions: async (event, context) => {
      const status = await getQuoteStatusFromEvents(context.quoteId);
      return status === 'viewed';
    },
  },
  actions: [
    {
      type: 'create_notification',
      params: {
        message: 'Presupuesto visto por el cliente. Considera enviar un mensaje personalizado.',
        type: 'opportunity',
      },
    },
  ],
};

export const markAsLostRule: AutomationRule = {
  id: 'mark-as-lost-on-rejection',
  name: 'Marcar como perdido tras rechazo',
  description: 'Si el presupuesto es rechazado, marcar como perdido',
  trigger: {
    eventType: QUOTE_EVENT_TYPES.REJECTED,
  },
  actions: [
    {
      type: 'update_quote',
      params: { status: 'rejected' },
    },
    {
      type: 'create_notification',
      params: {
        message: 'Presupuesto rechazado. Revisa el motivo y mejora tu propuesta.',
        type: 'warning',
      },
    },
  ],
};

export const allRules: AutomationRule[] = [
  followUpRule,
  suggestActionOnViewRule,
  markAsLostRule,
];
