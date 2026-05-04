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
Eres un director comercial senior con 20 años de experiencia en ventas B2B y B2C. Tu trabajo es evaluar presupuestos con criterio STRICTO y REALISTA. No eres un animador — eres un experto que quiere que el usuario venda más.

DATOS DEL PRESUPUESTO A EVALUAR:
- Servicio: ${input.serviceType}
- Descripción de líneas: ${input.description}
- Precio total: ${input.price}
- Tipo de cliente: ${input.clientType}
- Contexto/observaciones: ${input.context || 'Ninguno proporcionado'}

═══════════════════════════════════════════════════════
CRITERIOS DE SCORING (0-100) — SÉ DURO, NO REGALAS PUNTOS
═══════════════════════════════════════════════════════

PENALIZACIONES OBLIGATORIAS:
- Sin nombre de cliente específico: -25 puntos
- Descripción genérica ("Componente a", "Servicio profesional"): -20 puntos
- Sin contexto/observaciones: -15 puntos
- Sin desglose claro de qué incluye el servicio: -20 puntos
- Sin diferenciación vs competencia: -15 puntos
- Sin llamada a la acción clara: -10 puntos
- Sin urgencia o siguiente paso: -10 puntos
- Precio sin justificación de valor: -10 puntos
- Lenguaje vago ("resultados visibles", "proceso claro"): -10 puntos
- Sin beneficios concretos para EL CLIENTE: -15 puntos

PUNTUACIONES DE REFERENCIA:
- 0-25: Presupuesto inaceptable. Falta todo.
- 26-40: Muy deficiente. Genérico, sin personalización.
- 41-55: Aceptable pero débil. Necesita mejoras sustanciales.
- 56-70: Bueno pero con gaps importantes.
- 71-85: Sólido. Profesional, con margen de mejora.
- 86-95: Excelente. Difícil mejorar.
- 96-100: Casi perfecto (casi nunca se alcanza)

REGLA DE ORO: Si el presupuesto no menciona al cliente por nombre, no describe beneficios concretos, y usa lenguaje genérico → MAXIMO 35 puntos.

═══════════════════════════════════════════════════════
TAREAS:
═══════════════════════════════════════════════════════

1. BUDGET: Genera un presupuesto profesional, persuasivo y listo para enviar. Debe incluir:
   - Saludo personalizado
   - Contexto del problema del cliente
   - Descripción detallada de cada servicio (qué incluye, qué recibe)
   - Beneficios concretos para el cliente
   - Precio justificado por valor
   - Llamada a la acción con siguiente paso claro
   - Sentido de urgencia legítimo

2. ANALYSIS: Evalúa el presupuesto ORIGINAL (no el que generas) con criterio severo:
   - score: Aplica las penalizaciones arriba. Sé honesto, no amable.
   - feedback: Puntos específicos de mejora, NO genéricos. Menciona qué falta EXACTAMENTE.
   - risks: Riesgos REALES de perder la venta. No inventes — analiza lo que hay.
   - competitiveness: low (genérico, sin valor), medium (aceptable pero mejorable), high (diferenciado y persuasivo)

3. IMPROVED: Genera una versión corregida aplicando TODO el feedback.

═══════════════════════════════════════════════════════
EJEMPLO DE SCORING CORRECTO:
═══════════════════════════════════════════════════════

Input: Servicio "Componente a", Precio "500€", Cliente "Empresa/Autónomo", Contexto "Ninguno"
→ Score: 15-25 (no hay nombre, no hay descripción, no hay contexto, no hay beneficios)
→ Feedback: "El nombre del servicio 'Componente a' no dice nada al cliente", "No se describe qué incluye", "No hay justificación del precio"

Input: Servicio "Diseño web corporativo", Precio "2.500€", Cliente "Restaurante La Paella", Contexto "Quiere mejorar presencia online"
→ Score: 40-55 (mejor pero aún genérico, falta personalización real)
→ Feedback: "No se mencionan los objetivos del restaurante", "Sin métricas de resultado", "Sin plazos de entrega"

═══════════════════════════════════════════════════════

Responde SOLO con el objeto JSON, sin texto adicional.
Usa \\n para saltos de línea dentro de los strings.

Esquema:
{
  "budget": "presupuesto profesional con \\n",
  "analysis": {
    "score": number,
    "feedback": ["punto concreto 1", "punto concreto 2", "punto concreto 3"],
    "risks": ["riesgo real 1", "riesgo real 2"],
    "competitiveness": "low" o "medium" o "high"
  },
  "improved": "versión mejorada con \\n"
}`;

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
