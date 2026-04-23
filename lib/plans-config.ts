export const PLANS = {
  free: {
    name: 'Free',
    description: 'Para probar y empezar sin compromiso.',
    price: 0,
    priceId: undefined,
    features: {
      ai: false,
      maxQuotes: 3,
      maxClients: 5,
      proTemplates: false,
      prioritySupport: false,
      exportPdf: true,
      customBranding: false,
    },
    cta: 'Empezar gratis',
  },
  pro: {
    name: 'Pro',
    description: 'El plan ideal para profesionales independientes.',
    price: 499, // cents (4.99 EUR)
    priceId: process.env.STRIPE_PRO_PRICE_ID,
    features: {
      ai: true,
      maxQuotes: 50,
      maxClients: 100,
      proTemplates: true,
      prioritySupport: false,
      exportPdf: true,
      customBranding: true,
    },
    cta: 'Elegir Pro',
    popular: true,
  },
  business: {
    name: 'Business',
    description: 'Sin límites para agencias y grandes volúmenes.',
    price: 999, // cents (9.99 EUR)
    priceId: process.env.STRIPE_BUSINESS_PRICE_ID,
    features: {
      ai: true,
      maxQuotes: -1, // unlimited
      maxClients: -1,
      proTemplates: true,
      prioritySupport: true,
      exportPdf: true,
      customBranding: true,
    },
    cta: 'Elegir Business',
  },
} as const;

export type PlanKey = keyof typeof PLANS;
