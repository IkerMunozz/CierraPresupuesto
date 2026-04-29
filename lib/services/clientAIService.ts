// lib/services/clientAIService.ts
import { google } from '@ai-sdk/google';
import { generateText } from 'ai';
import { db } from '@/lib/db';
import { clients, quotes, quoteEvents } from '@/lib/db/schema';
import { eq, and, desc, count } from 'drizzle-orm';
import { QUOTE_EVENT_TYPES } from '@/lib/db/eventTypes';
import { getClientTimeline } from './clientTimelineService';

const apiKey = process.env.GOOGLE_AI_API_KEY;
const model = apiKey ? google('gemini-1.5-flash', { apiKey }) : null;

export interface ClientAIAnalysis {
  clientId: number;
  clientName: string;
  conversionProbability: number; // 0-100
  expectedValue: number;
  recommendedAction: string;
  reasoning: string;
  riskLevel: 'low' | 'medium' | 'high';
  nextBestAction: string;
  generatedAt: string;
}

export interface ClientAIAnalysisResult {
  success: boolean;
  analysis?: ClientAIAnalysis;
  error?: string;
}

/**
 * Analiza un cliente individual con IA basado en su historial
 */
export async function analyzeClientWithAI(
  clientId: number,
  userId: string
): Promise<ClientAIAnalysisResult> {
  try {
    if (!model) {
      return { success: false, error: 'Google AI API key not configured' };
    }

    // 1. Obtener datos básicos del cliente
    const client = await db
      .select({
        id: clients.id,
        name: clients.name,
        company: clients.company,
        sector: clients.sector,
        potentialValue: clients.potentialValue,
        pipelineStage: clients.pipelineStage,
        status: clients.status,
      })
      .from(clients)
      .where(
        and(
          eq(clients.id, clientId),
          eq(clients.userId, userId)
        )
      )
      .limit(1);

    if (!client[0]) {
      return { success: false, error: 'Client not found' };
    }

    const clientData = client[0];

    // 2. Obtener historial de presupuestos
    const clientQuotes = await db
      .select({
        id: quotes.id,
        title: quotes.title,
        score: quotes.score,
        createdAt: quotes.createdAt,
      })
      .from(quotes)
      .where(eq(quotes.clientId, clientId))
      .orderBy(desc(quotes.createdAt));

    // 3. Obtener estadísticas de eventos
    const timelineResult = await getClientTimeline(clientId, userId);
    const events = timelineResult.success ? timelineResult.interactions || [] : [];

    const acceptedEvents = events.filter(e => e.eventType === QUOTE_EVENT_TYPES.ACCEPTED);
    const rejectedEvents = events.filter(e => e.eventType === QUOTE_EVENT_TYPES.REJECTED);
    const sentEvents = events.filter(e => e.eventType === QUOTE_EVENT_TYPES.SENT);
    const viewedEvents = events.filter(e => e.eventType === QUOTE_EVENT_TYPES.VIEWED);

    // 4. Calcular métricas básicas
    const totalQuotes = clientQuotes.length;
    const acceptanceRate = sentEvents.length > 0 
      ? (acceptedEvents.length / sentEvents.length) * 100 
      : 0;

    // 5. Construir prompt para IA (SOLO TEXTO, no imágenes)
    const clientInfo = `
Client data:
- Name: ${clientData.name}
- Company: ${clientData.company || 'N/A'}
- Sector: ${clientData.sector || 'N/A'}
- Pipeline stage: ${clientData.pipelineStage}
- Status: ${clientData.status}
- Potential value: ${clientData.potentialValue || 0}

Quote history:
- Total quotes: ${totalQuotes}
- Sent: ${sentEvents.length}
- Viewed: ${viewedEvents.length}
- Accepted: ${acceptedEvents.length}
- Rejected: ${rejectedEvents.length}
- Acceptance rate: ${acceptanceRate.toFixed(1)}%

Recent events: ${events.slice(0, 5).map(e => e.type).join(', ')}
`;

    const prompt = `You are an expert CRM analyst. Analyze this client and return a JSON object.

${clientInfo}

Return ONLY a JSON object with these fields (NO images, NO clipboard, text only):
- conversionProbability: number 0-100 (probability this client will accept a quote)
- expectedValue: number (expected revenue from this client)
- recommendedAction: string (one specific action to take, max 100 chars)
- reasoning: string (explanation, max 200 chars)
- riskLevel: "low" | "medium" | "high" (risk of losing this client)
- nextBestAction: string (specific next step, max 100 chars)

Return ONLY the JSON, no markdown, no images.`;

    // 6. Generar análisis con IA
    const { text } = await generateText({
      model,
      prompt,
      maxTokens: 500,
    });

    // 7. Parsear respuesta
    let analysisData: any;
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      const jsonString = jsonMatch ? jsonMatch[0] : text;
      analysisData = JSON.parse(jsonString);
    } catch (parseError) {
      console.error('Error parsing AI response:', parseError);
      return { success: false, error: 'Failed to parse AI response' };
    }

    // Validar estructura
    if (typeof analysisData.conversionProbability !== 'number') {
      return { success: false, error: 'Invalid analysis structure from AI' };
    }

    const analysis: ClientAIAnalysis = {
      clientId: clientData.id,
      clientName: clientData.name,
      conversionProbability: Math.min(100, Math.max(0, analysisData.conversionProbability)),
      expectedValue: analysisData.expectedValue || Number(clientData.potentialValue) || 0,
      recommendedAction: analysisData.recommendedAction || 'Contact client',
      reasoning: analysisData.reasoning || 'Based on historical data',
      riskLevel: analysisData.riskLevel || 'medium',
      nextBestAction: analysisData.nextBestAction || 'Send follow-up',
      generatedAt: new Date().toISOString(),
    };

    // 8. Guardar análisis en una nota interna
    const { createNote } from './noteService';
    await createNote({
      userId,
      clientId,
      title: `AI Analysis - ${new Date().toLocaleDateString()}`,
      content: JSON.stringify(analysis, null, 2),
    });

    return { success: true, analysis };
  } catch (error) {
    console.error('Error analyzing client with AI:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Obtener el último análisis de un cliente
 */
export async function getLatestClientAnalysis(
  clientId: number,
  userId: string
): Promise<ClientAIAnalysis | null> {
  try {
    const { getNotes } from './noteService';
    const notes = await getNotes({ userId, clientId, limit: 50 });
    
    const analysisNotes = notes
      .filter(n => n.title.startsWith('AI Analysis'))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    if (analysisNotes.length === 0) return null;

    return JSON.parse(analysisNotes[0].content) as ClientAIAnalysis;
  } catch (error) {
    console.error('Error fetching client analysis:', error);
    return null;
  }
}

/**
 * Analizar todos los clientes activos y generar resumen
 */
export async function analyzeAllActiveClients(
  userId: string
): Promise<{
  analyzed: number;
  highPriority: ClientAIAnalysis[];
  error?: string;
}> {
  try {
    const activeClients = await db
      .select({ id: clients.id })
      .from(clients)
      .where(
        and(
          eq(clients.userId, userId),
          eq(clients.status, 'active')
        )
      );

    const analyzed: ClientAIAnalysis[] = [];
    let errors = 0;

    for (const client of activeClients) {
      const result = await analyzeClientWithAI(client.id, userId);
      if (result.success && result.analysis) {
        analyzed.push(result.analysis);
      } else {
        errors++;
      }
    }

    // Filtrar high priority (alta probabilidad de conversión)
    const highPriority = analyzed
      .filter(a => a.conversionProbability >= 70)
      .sort((a, b) => b.conversionProbability - a.conversionProbability);

    return { 
      analyzed: analyzed.length, 
      highPriority, 
      error: errors > 0 ? `${errors} errors` : undefined 
    };
  } catch (error) {
    return {
      analyzed: 0,
      highPriority: [],
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
