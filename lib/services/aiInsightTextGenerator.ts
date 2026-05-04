// lib/services/aiInsightTextGenerator.ts
import { callGemini } from '@/lib/gemini';

export interface InsightContext {
  conversionRate: number;
  totalQuotes: number;
  drafts: number;
  sent: number;
  accepted: number;
  rejected: number;
  potentialRevenue: number;
  expectedRevenue: number;
  rejectionRate: number;
  bottleneck: 'DRAFTS_STUCK' | 'LOW_CONVERSION' | 'HIGH_REJECTION' | 'LOW_VOLUME' | 'HEALTHY';
  draftLeakage: number;
  salesLeakage: number;
  avgQuoteAmount: number;
  highScoreConversion?: number;
  underpricedCount?: number;
}

export interface GeneratedInsightText {
  summary: string;
  funnelExplanation: string;
  status: 'positive' | 'neutral' | 'attention';
}

const SYSTEM_PROMPT = `Eres un consultor de negocio que analiza datos de ventas y genera resúmenes ejecutivos.

REGLAS ESTRICTAS:
- NO inventes datos
- NO repitas números innecesariamente
- Usa SOLO la información proporcionada
- Sé claro, directo y accionable`;

function buildPrompt(ctx: InsightContext): string {
  const bottleneckLabels: Record<string, string> = {
    DRAFTS_STUCK: 'La mayoría de presupuestos no salen de borradores',
    LOW_CONVERSION: 'Los presupuestos llegan al cliente pero pocos se cierran',
    HIGH_REJECTION: 'Tasa de rechazo superior a la media del sector',
    LOW_VOLUME: 'Falta volumen de datos para análisis preciso',
    HEALTHY: 'El embudo funciona de forma equilibrada',
  };

  const formattedRevenue = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(ctx.potentialRevenue);

  return `Genera un resumen ejecutivo para un dashboard de ventas.

Datos:
- tasa de conversión: ${ctx.conversionRate.toFixed(1)}%
- presupuestos creados: ${ctx.totalQuotes}
- enviados: ${ctx.sent}
- aceptados: ${ctx.accepted}
- borradores: ${ctx.drafts}
- ingresos potenciales: ${formattedRevenue}
- cuello de botella: ${bottleneckLabels[ctx.bottleneck]}

Genera:
1. Un resumen en lenguaje natural
2. Tono profesional (tipo consultor de negocio)
3. Máximo 5 líneas
4. Enfocado en:
   - qué está pasando
   - dónde está el problema
   - qué hacer

Importante:
- NO inventar datos
- NO repetir números innecesariamente
- Ser claro y accionable

Devuelve SOLO un JSON con este formato:
{"summary": "texto del resumen ejecutivo", "status": "attention" | "neutral" | "positive"}`;
}

function parseAIResponse(text: string, ctx: InsightContext): GeneratedInsightText {
  let cleaned = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();

  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  if (jsonMatch) cleaned = jsonMatch[0];

  try {
    const parsed = JSON.parse(cleaned);
    let summary = parsed.summary || '';
    let status: GeneratedInsightText['status'] = parsed.status || 'neutral';

    if (!['positive', 'neutral', 'attention'].includes(status)) status = 'neutral';

    if (!summary || summary.length < 10) summary = generateFallbackSummary(ctx);

    return { summary, funnelExplanation: generateFunnelExplanation(ctx), status };
  } catch {
    console.error('AI response was not valid JSON:', text);
    return {
      summary: generateFallbackSummary(ctx),
      funnelExplanation: generateFunnelExplanation(ctx),
      status: ctx.bottleneck === 'HEALTHY' ? 'positive' : ctx.bottleneck === 'LOW_VOLUME' ? 'neutral' : 'attention',
    };
  }
}

function generateFallbackSummary(ctx: InsightContext): string {
  if (ctx.bottleneck === 'DRAFTS_STUCK') {
    return `Tienes **${ctx.drafts} borradores sin enviar** de ${ctx.totalQuotes} presupuestos. El problema está en la fase de creación: produces propuestas pero no las envías. **Prioriza enviar las más antiguas esta semana** — cada día que pasa reduce la probabilidad de cierre.`;
  }
  if (ctx.bottleneck === 'LOW_CONVERSION') {
    return `Tu tasa de conversión está en **${ctx.conversionRate.toFixed(1)}%** con ${ctx.sent} presupuestos enviados. El embudo funciona hasta el envío, pero el cierre falla. **Revisa tu propuesta de valor y añade CTAs con fecha límite** para generar urgencia en el cliente.`;
  }
  if (ctx.bottleneck === 'HIGH_REJECTION') {
    return `Tu tasa de rechazo alcanza el **${ctx.rejectionRate.toFixed(0)}%**, lo que indica un desajuste entre tu oferta y las expectativas del cliente. **Revisa tus precios y la claridad de los entregables** — la mayoría de rechazos vienen de falta de alineación o de competencia más agresiva.`;
  }
  if (ctx.bottleneck === 'LOW_VOLUME') {
    return `Solo tienes **${ctx.totalQuotes} presupuestos** registrados. Con este volumen es difícil identificar patrones fiables. **Genera al menos 5 presupuestos más** para que el sistema pueda darte insights accionables con base estadística.`;
  }
  return `Has generado **${ctx.totalQuotes} presupuestos** con una conversión del **${ctx.conversionRate.toFixed(1)}%**. Tu embudo funciona de forma equilibrada y no detectamos cuellos de botella críticos. **Mantén el ritmo de envío** y sigue usando el análisis de IA para optimizar cada propuesta.`;
}

function generateFunnelExplanation(ctx: InsightContext): string {
  if (ctx.draftLeakage > ctx.salesLeakage) {
    return `La mayor fuga está en **borradores (${ctx.draftLeakage.toFixed(0)}%)**. El 100% de propuestas no enviadas se pierden. Envía primero, perfecciona después.`;
  }
  if (ctx.salesLeakage > 40) {
    return `Pierdes **${ctx.salesLeakage.toFixed(0)}%** tras enviar. Implementa seguimiento a los 3 días con email o llamada.`;
  }
  return `Tu funnel es saludable. Conversión del **${ctx.conversionRate.toFixed(1)}%** entre envío y cierre.`;
}

export async function generateInsightTextWithAI(ctx: InsightContext): Promise<GeneratedInsightText> {
  try {
    const prompt = buildPrompt(ctx);
    const response = await callGemini(prompt, SYSTEM_PROMPT, true);
    return parseAIResponse(response, ctx);
  } catch (error) {
    console.error('Error generating AI insight text:', error);
    return {
      summary: generateFallbackSummary(ctx),
      funnelExplanation: generateFunnelExplanation(ctx),
      status: ctx.bottleneck === 'HEALTHY' ? 'positive' : ctx.bottleneck === 'LOW_VOLUME' ? 'neutral' : 'attention',
    };
  }
}
