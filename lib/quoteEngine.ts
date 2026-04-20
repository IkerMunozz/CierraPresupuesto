import { callOpenAI, hasOpenAIKey } from '@/lib/openai';

export type QuoteInput = {
  serviceType: string;
  description: string;
  price: string;
  clientType: string;
  context?: string;
};

export type QuoteAnalysis = {
  score: number; // 0-100
  feedback: string[];
  risks: string[];
  competitiveness: 'baja' | 'media' | 'alta';
};

const clampScore = (value: number) => Math.max(0, Math.min(100, Math.round(value)));

const safeParseJson = <T,>(raw: string): T | null => {
  const trimmed = raw.trim();
  const start = trimmed.indexOf('{');
  const end = trimmed.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) return null;
  const candidate = trimmed.slice(start, end + 1);
  try {
    return JSON.parse(candidate) as T;
  } catch {
    return null;
  }
};

const normalizeBullets = (items: unknown, fallback: string[]): string[] => {
  if (!Array.isArray(items)) return fallback;
  const normalized = items
    .map((x) => (typeof x === 'string' ? x.trim() : ''))
    .filter(Boolean)
    .slice(0, 8);
  return normalized.length ? normalized : fallback;
};

const mockQuote = (input: QuoteInput) => {
  const context = input.context?.trim() ? `\n\nContexto: ${input.context.trim()}` : '';
  return [
    `Asunto: Propuesta para ${input.serviceType} (${input.clientType})`,
    ``,
    `Hola,`,
    ``,
    `Gracias por tu interés. Te propongo ${input.description} por ${input.price}.`,
    `El objetivo es que obtengas resultados visibles rápidamente, con un proceso claro, entregables definidos y comunicación constante.`,
    context,
    ``,
    `Qué incluye:`,
    `- Definición de alcance y objetivos`,
    `- Entrega por fases con revisiones`,
    `- Soporte y seguimiento tras la entrega`,
    ``,
    `Próximo paso: si te encaja, confirmo disponibilidad y te envío el calendario de trabajo para empezar esta semana.`,
  ].join('\n');
};

const mockAnalysis = (_quote: string): QuoteAnalysis => ({
  score: 82,
  feedback: [
    'La propuesta es clara, pero puede abrir más fuerte con un beneficio tangible.',
    'Falta concretar plazos, hitos y condiciones de pago para reducir dudas.',
    'El cierre puede ser más directo (CTA + ventana de decisión).',
  ],
  risks: [
    'El cliente puede comparar solo por precio al no ver métricas/impacto esperado.',
    'Sin garantías/condiciones, aumenta la fricción en la aprobación interna.',
  ],
  competitiveness: 'media',
});

const mockImprovedQuote = (input: QuoteInput) => {
  const context = input.context?.trim() ? `\n\nContexto: ${input.context.trim()}` : '';
  return [
    `Asunto: Propuesta optimizada para ${input.serviceType} (${input.clientType})`,
    ``,
    `Hola,`,
    ``,
    `Mi propuesta para ${input.serviceType} está diseñada para ayudarte a conseguir resultados medibles con un proceso simple y sin sorpresas.`,
    ``,
    `Resumen: ${input.description}`,
    `Inversión: ${input.price}`,
    context,
    ``,
    `Plan de entrega (rápido y claro):`,
    `- Fase 1 (arranque): definición de objetivos, alcance y checklist de requisitos.`,
    `- Fase 2 (ejecución): implementación por hitos con revisiones cortas.`,
    `- Fase 3 (cierre): entrega final + ajustes acordados + handoff.`,
    ``,
    `Para reducir riesgo: si en la primera revisión no ves el enfoque correcto, ajustamos el alcance sin coste de gestión adicional.`,
    ``,
    `Siguiente paso: responde “OK” y te envío el calendario y el acuerdo de inicio hoy mismo.`,
  ].join('\n');
};

export async function generateQuote(input: QuoteInput): Promise<string> {
  if (!hasOpenAIKey()) return mockQuote(input);

  const prompt = [
    `Eres un experto en ventas B2B/B2C para autónomos. Genera un presupuesto/propuesta comercial en español, profesional, orientada a cierre.`,
    `Debe ser concreto, persuasivo y fácil de copiar/pegar en un email o PDF.`,
    ``,
    `Datos:`,
    `- Tipo de servicio: ${input.serviceType}`,
    `- Descripción: ${input.description}`,
    `- Precio: ${input.price}`,
    `- Tipo de cliente: ${input.clientType}`,
    `- Contexto: ${input.context?.trim() ? input.context.trim() : 'Sin contexto adicional'}`,
    ``,
    `Incluye: asunto, breve intro, valor/beneficios, entregables (lista), condiciones (muy breves) y CTA final con urgencia suave.`,
  ].join('\n');

  const text = await callOpenAI(prompt);
  return text || mockQuote(input);
}

export async function analyzeQuote(quote: string): Promise<QuoteAnalysis> {
  if (!hasOpenAIKey()) return mockAnalysis(quote);

  const prompt = [
    `Actúa como un director comercial. Analiza el presupuesto y devuelve SOLO JSON válido.`,
    `Estructura EXACTA:`,
    `{`,
    `  "score": number,`,
    `  "feedback": string[],`,
    `  "risks": string[],`,
    `  "competitiveness": "baja"|"media"|"alta"`,
    `}`,
    ``,
    `Criterios: claridad, propuesta de valor, especificidad, reducción de riesgo, CTA, competitividad percibida.`,
    `- score: 0 a 100`,
    `- feedback: problemas y mejoras concretas (máx 6)`,
    `- risks: razones por las que se puede perder la venta (máx 5)`,
    `- competitiveness: baja/media/alta`,
    ``,
    `PRESUPUESTO:`,
    quote,
  ].join('\n');

  const raw = await callOpenAI(prompt);
  const parsed = safeParseJson<QuoteAnalysis>(raw);
  if (!parsed) return mockAnalysis(quote);

  const competitiveness =
    parsed.competitiveness === 'alta' || parsed.competitiveness === 'media' || parsed.competitiveness === 'baja'
      ? parsed.competitiveness
      : 'media';

  return {
    score: clampScore(typeof parsed.score === 'number' ? parsed.score : 75),
    feedback: normalizeBullets(parsed.feedback, mockAnalysis(quote).feedback),
    risks: normalizeBullets(parsed.risks, mockAnalysis(quote).risks),
    competitiveness,
  };
}

export async function improveQuote(quote: string, analysis?: QuoteAnalysis): Promise<string> {
  if (!hasOpenAIKey()) {
    // Best-effort: if we don't have the original input, we still deliver a strong rewrite.
    return [
      `Versión optimizada (orientada a cierre):`,
      ``,
      quote,
      ``,
      `Cierre sugerido: Si te encaja, dime “OK” y preparo el calendario y el acuerdo de inicio hoy mismo.`,
    ].join('\n');
  }

  const guidance = analysis
    ? [
        `Prioriza corregir esto:`,
        ...analysis.feedback.map((x) => `- ${x}`),
        ``,
        `Evita estos riesgos:`,
        ...analysis.risks.map((x) => `- ${x}`),
      ].join('\n')
    : 'Optimiza para claridad, valor, reducción de riesgo y CTA.';

  const prompt = [
    `Reescribe el presupuesto para maximizar conversión sin sonar agresivo. Español neutro.`,
    `Mantén estructura profesional (asunto, valor, entregables, condiciones breves, CTA).`,
    `No inventes datos no proporcionados (si faltan plazos o condiciones, ofrece opciones).`,
    ``,
    guidance,
    ``,
    `PRESUPUESTO ORIGINAL:`,
    quote,
  ].join('\n');

  const text = await callOpenAI(prompt);
  return text || quote;
}

export function buildMockImprovedFromInput(input: QuoteInput): string {
  return mockImprovedQuote(input);
}

