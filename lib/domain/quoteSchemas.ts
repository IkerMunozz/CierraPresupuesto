import { z } from 'zod';

export const QuoteInputSchema = z.object({
  serviceType: z.string().trim().min(1, 'serviceType es obligatorio.'),
  description: z.string().trim().min(1, 'description es obligatorio.'),
  price: z.string().trim().min(1, 'price es obligatorio.'),
  clientType: z.string().trim().min(1, 'clientType es obligatorio.'),
  context: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v && v.length ? v : undefined)),
});

export const QuoteAnalysisSchema = z.object({
  score: z.number().min(0).max(100),
  feedback: z.array(z.string()),
  risks: z.array(z.string()),
  competitiveness: z.enum(['baja', 'media', 'alta']),
});

export const GenerateResponseSchema = z.object({
  quote: z.string(),
  analysis: QuoteAnalysisSchema,
  improvedQuote: z.string(),
});

export type QuoteInput = z.infer<typeof QuoteInputSchema>;
export type QuoteAnalysis = z.infer<typeof QuoteAnalysisSchema>;
export type GenerateResponse = z.infer<typeof GenerateResponseSchema>;

