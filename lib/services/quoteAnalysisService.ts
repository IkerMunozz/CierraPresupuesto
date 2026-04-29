// lib/services/quoteAnalysisService.ts
import { google } from '@ai-sdk/google';
import { generateText } from 'ai';
import { db } from '@/lib/db';
import { quotes } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { getQuoteStatusFromEvents } from '@/lib/db/events';

const apiKey = process.env.GOOGLE_AI_API_KEY;
const model = apiKey ? google('gemini-1.5-flash', { apiKey }) : null;

export interface QuoteAnalysis {
  probability: number; // 0-100
  recommendation: 'raise_price' | 'lower_price' | 'improve_message' | 'add_urgency';
  suggestedActions: string[];
  reasoning: string;
  generatedAt: string; // ISO date
}

export interface AnalysisResult {
  success: boolean;
  analysis?: QuoteAnalysis;
  error?: string;
}

/**
 * Analiza un presupuesto individual con IA y guarda el resultado
 */
export async function analyzeQuoteWithAI(quoteId: string): Promise<AnalysisResult> {
  try {
    if (!model) {
      return { success: false, error: 'Google AI API key not configured' };
    }

    // 1. Obtener datos del presupuesto
    const quote = await db
      .select({
        id: quotes.id,
        title: quotes.title,
        clientName: quotes.clientName,
        content: quotes.content,
        amount: quotes.price, // assuming there's a price field, otherwise calculate from lines
      })
      .from(quotes)
      .where(eq(quotes.id, quoteId))
      .limit(1);

    if (!quote[0]) {
      return { success: false, error: 'Quote not found' };
    }

    const quoteData = quote[0];

    // 2. Obtener estado actual desde eventos
    const currentStatus = await getQuoteStatusFromEvents(quoteId);

    // 3. Construir prompt para IA
    const prompt = `You are an expert sales analyst. Analyze the following quote and return a JSON object with the following fields:
- probability: number between 0 and 100 (probability of closure)
- recommendation: one of "raise_price", "lower_price", "improve_message", "add_urgency"
- suggestedActions: array of 2-3 strings, each string is a specific action the salesperson can take
- reasoning: string explaining your analysis

Quote details:
- Client: ${quoteData.clientName}
- Title: ${quoteData.title}
- Content: ${quoteData.content ? quoteData.content.substring(0, 500) : 'No content available'}
- Current status: ${currentStatus}
- Amount: ${quoteData.amount || 'Not specified'}

Return ONLY the JSON object, no markdown or additional text. Make sure the JSON is valid.`;

    // 4. Generar análisis con IA
    const { text } = await generateText({
      model,
      prompt,
      maxTokens: 500,
    });

    // 5. Parsear respuesta (intentar extraer JSON)
    let analysis: QuoteAnalysis;
    try {
      // Buscar JSON en el texto (puede venir con markdown ```json ... ```)
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      const jsonString = jsonMatch ? jsonMatch[0] : text;
      analysis = JSON.parse(jsonString);
    } catch (parseError) {
      console.error('Error parsing AI response:', parseError);
      return { success: false, error: 'Failed to parse AI response' };
    }

    // Validar estructura mínima
    if (typeof analysis.probability !== 'number' || !analysis.recommendation) {
      return { success: false, error: 'Invalid analysis structure from AI' };
    }

    // Añadir timestamp
    analysis.generatedAt = new Date().toISOString();

    // 6. Guardar en base de datos (campo analysis de quotes)
    await db
      .update(quotes)
      .set({ analysis: analysis as any })
      .where(eq(quotes.id, quoteId));

    return { success: true, analysis };
  } catch (error) {
    console.error('Error analyzing quote:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Obtener el último análisis de un presupuesto
 */
export async function getQuoteAnalysis(quoteId: string): Promise<QuoteAnalysis | null> {
  try {
    const quote = await db
      .select({ analysis: quotes.analysis })
      .from(quotes)
      .where(eq(quotes.id, quoteId))
      .limit(1);

    if (!quote[0]?.analysis) return null;

    return quote[0].analysis as unknown as QuoteAnalysis;
  } catch (error) {
    console.error('Error fetching quote analysis:', error);
    return null;
  }
}
