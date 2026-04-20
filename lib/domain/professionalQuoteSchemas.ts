import { z } from 'zod';

export const CompanySchema = z.object({
  name: z.string().min(1, 'El nombre es obligatorio'),
  phone: z.string().optional(),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  address: z.string().optional(),
  footerInfo: z.string().optional(),
});

export const ClientSchema = z.object({
  name: z.string().min(1, 'El nombre es obligatorio'),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  phone: z.string().optional(),
  address: z.string().optional(),
  taxId: z.string().optional(),
});

export const ConceptSchema = z.object({
  name: z.string().min(1, 'El nombre es obligatorio'),
  description: z.string().optional(),
  defaultPrice: z.string().default('0.00'),
  defaultIva: z.number().default(21),
});

export const QuoteLineSchema = z.object({
  conceptId: z.number().optional().nullable(),
  name: z.string().min(1, 'Concepto obligatorio'),
  description: z.string().optional(),
  quantity: z.number().min(0.01, 'Mínimo 0.01'),
  unitPrice: z.number().min(0),
  discount: z.number().min(0).max(100).default(0),
  iva: z.number().default(21),
});

export const ProfessionalQuoteSchema = z.object({
  companyId: z.number().or(z.string()).transform(v => Number(v)),
  clientId: z.number().or(z.string()).transform(v => Number(v)),
  date: z.string().or(z.date()),
  validUntil: z.string().or(z.date()).optional().nullable().or(z.literal('')),
  paymentMethod: z.string().optional(),
  internalNotes: z.string().optional(),
  observations: z.string().optional(),
  lines: z.array(QuoteLineSchema).min(1, 'Añade al menos una línea'),
});

export type CompanyInput = z.infer<typeof CompanySchema>;
export type ClientInput = z.infer<typeof ClientSchema>;
export type ConceptInput = z.infer<typeof ConceptSchema>;
export type QuoteLineInput = z.infer<typeof QuoteLineSchema>;
export type ProfessionalQuoteInput = z.infer<typeof ProfessionalQuoteSchema>;
