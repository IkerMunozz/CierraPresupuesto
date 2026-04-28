import { callGemini, callGeminiStream, hasGeminiKey } from '@/lib/gemini';
import { z } from 'zod';
import JSON5 from 'json5';

// 1. Schema estricto para la IA
const UnifiedQuoteResponseSchema = z.object({
  budget: z.string().min(50),
  analysis: z.object({
    score: z.number().min(0).max(100),
    feedback: z.array(z.string()).max(6),
    risks: z.array(z.string()).max(5),
    competitiveness: z.enum(['low', 'medium', 'high']),
  }),
  improved: z.string().min(50),
});

export type QuoteInput = {
  serviceType: string;
  description: string;
  price: string;
  clientType: string;
  context?: string;
};

// Mapper para compatibilidad con el frontend actual
export type LegacyQuoteResponse = {
  quote: string;
  analysis: {
    score: number;
    feedback: string[];
    risks: string[];
    competitiveness: 'baja' | 'media' | 'alta';
  };
  improvedQuote: string;
};

const COMPETITIVENESS_MAP = {
  low: 'baja' as const,
  medium: 'media' as const,
  high: 'alta' as const,
};

// Función para intentar reparar JSON malformado
function attemptJsonRepair(jsonString: string): string {
  // Estrategia: reemplazar saltos de línea literales DENTRO de strings JSON
  // Procesamos carácter a carácter para saber si estamos dentro de un string
  let result = '';
  let inString = false;
  let escaped = false;

  for (let i = 0; i < jsonString.length; i++) {
    const char = jsonString[i];

    if (escaped) {
      result += char;
      escaped = false;
      continue;
    }

    if (char === '\\') {
      result += char;
      escaped = true;
      continue;
    }

    if (char === '"') {
      inString = !inString;
      result += char;
      continue;
    }

    // Si estamos dentro de un string y encontramos saltos de línea literales, escaparlos
    if (inString) {
      if (char === '\n') {
        result += '\\n';
        continue;
      }
      if (char === '\r') {
        result += '\\r';
        continue;
      }
      if (char === '\t') {
        result += '\\t';
        continue;
      }
    }

    result += char;
  }

  return result;
}

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

/**
 * Genera todo el pipeline en una sola llamada atómica (Para planes PRO)
 */
export async function generateEnterpriseQuote(input: QuoteInput): Promise<LegacyQuoteResponse> {
  if (!hasGeminiKey()) throw new Error('API Key no configurada');

  const masterPrompt = `
    Eres un sistema experto en ventas y análisis comercial. Tu tarea es generar tres componentes basados en los datos del servicio.
    
    DATOS DEL SERVICIO:
    - Servicio: ${input.serviceType}
    - Descripción: ${input.description}
    - Precio: ${input.price}
    - Cliente: ${input.clientType}
    - Contexto: ${input.context || 'Ninguno'}

    TAREAS:
    1. BUDGET: Genera un presupuesto profesional, persuasivo y listo para enviar.
    2. ANALYSIS: Realiza un análisis crítico del presupuesto generado (puntuación, feedback accionable, riesgos reales de pérdida y nivel de competitividad).
    3. IMPROVED: Genera una versión optimizada del presupuesto aplicando el feedback del análisis.

    REGLAS CRÍTICAS:
    - Responde SOLO con el objeto JSON, sin texto adicional
    - Usa \\n para saltos de línea dentro de los strings
    - Escapa comillas dobles dentro de los strings con \\
    - No uses caracteres especiales no escapados
    - El JSON debe ser válido y parseable
    
    Esquema requerido:
    {
      "budget": "string (usa \\n para saltos de línea)",
      "analysis": {
        "score": number (0-100),
        "feedback": ["string", "string"],
        "risks": ["string", "string"],
        "competitiveness": "low" o "medium" o "high"
      },
      "improved": "string (usa \\n para saltos de línea)"
    }
  `;

  const systemInstruction = "Eres un motor de generación de ventas de nivel enterprise. Devuelve SIEMPRE JSON.";

  let attempts = 0;
  const maxAttempts = 2;
  let rawResponse = '';

  while (attempts < maxAttempts) {
    try {
      rawResponse = await callGemini(masterPrompt, systemInstruction, true);
      
      // More robust JSON extraction
      let cleanJson = rawResponse;
      
      // Remove markdown code blocks (in case AI still wraps in markdown)
      cleanJson = cleanJson.replace(/^```json\s*|\s*```$/g, '').trim();
      
      // Try to extract JSON if there's extra text before/after
      const jsonMatch = cleanJson.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        cleanJson = jsonMatch[0];
      }
      
      // Attempt to repair malformed JSON
      cleanJson = attemptJsonRepair(cleanJson);
      
      // Use JSON5 for more lenient parsing (handles newlines, unquoted keys, etc.)
      const parsed = JSON5.parse(cleanJson);
      const validated = UnifiedQuoteResponseSchema.parse(parsed);

      return {
        quote: validated.budget,
        analysis: {
          score: validated.analysis.score,
          feedback: validated.analysis.feedback,
          risks: validated.analysis.risks,
          competitiveness: COMPETITIVENESS_MAP[validated.analysis.competitiveness],
        },
        improvedQuote: validated.improved,
      };
    } catch (error) {
      attempts++;
      if (attempts >= maxAttempts) {
        console.error('Error en pipeline IA:', error);
        console.error('Raw response length:', rawResponse?.length);
        console.error('Raw response preview:', rawResponse?.substring(0, 1000));
        throw error;
      }
    }
  }
  throw new Error('Error fatal en la generación.');
}

/**
 * Generación simple (Para planes FREE o fallback)
 */
export async function generateQuote(input: QuoteInput): Promise<string> {
  if (!hasGeminiKey()) return mockQuote(input);

  const prompt = `Genera un presupuesto profesional para: ${input.serviceType}, descripción: ${input.description}, precio: ${input.price}, tipo de cliente: ${input.clientType}`;
  return await callGemini(prompt, 'Eres un experto en ventas B2B/B2C para autónomos.');
}

/**
 * Streaming de presupuesto (Para UI interactiva)
 */
export async function generateQuoteStream(input: QuoteInput): Promise<ReadableStream<Uint8Array>> {
  if (!hasGeminiKey()) {
    const encoder = new TextEncoder();
    return new ReadableStream({
      async start(controller) {
        const text = mockQuote(input);
        for (const word of text.split(' ')) {
          const sseData = `data: ${JSON.stringify({ choices: [{ delta: { content: word + ' ' } }] })}\n\n`;
          controller.enqueue(encoder.encode(sseData));
          await new Promise(r => setTimeout(r, 30));
        }
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        controller.close();
      }
    });
  }

  const prompt = `Genera un presupuesto profesional para: ${input.serviceType}, descripción: ${input.description}, precio: ${input.price}, tipo de cliente: ${input.clientType}`;
  return await callGeminiStream(prompt, 'Eres un experto en ventas B2B/B2C para autónomos.');
}
