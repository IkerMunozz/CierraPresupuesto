// lib/services/diagnosticsService.ts
import { generateAdvancedInsights, AIInsight } from './insightService';
import { generateRecommendedActions, RecommendedAction } from './actionService';
import { generateExecutiveSummary, ExecutiveSummary } from './summaryService';
import { analyzeSalesFunnel, FunnelAnalysis } from './funnelService';

export type BottleneckType = 'DRAFTS_STUCK' | 'LOW_CONVERSION' | 'HIGH_REJECTION' | 'LOW_VOLUME' | 'HEALTHY';

export interface UnifiedDashboardData {
  summary: ExecutiveSummary;
  funnel: FunnelAnalysis;
  actions: RecommendedAction[];
  insights: AIInsight[];
  mainBottleneck: BottleneckType;
}

export function getUnifiedDiagnostics(
  allQuotes: any[],
  quoteAmounts: Map<string, number>
): UnifiedDashboardData {
  const drafts = allQuotes.filter(q => q.status === 'draft');
  const sent = allQuotes.filter(q => q.status === 'sent');
  const accepted = allQuotes.filter(q => q.status === 'accepted');
  const rejected = allQuotes.filter(q => q.status === 'rejected');
  
  const total = allQuotes.length;
  const totalSent = sent.length + accepted.length + rejected.length;
  const conversionRate = totalSent > 0 ? (accepted.length / totalSent) * 100 : 0;
  const rejectionRate = totalSent > 0 ? (rejected.length / totalSent) * 100 : 0;

  // 1. DETECCIÓN DEL CUELLO DE BOTELLA PRINCIPAL
  let bottleneck: BottleneckType = 'HEALTHY';
  
  if (total < 3) bottleneck = 'LOW_VOLUME';
  else if (rejectionRate > 35) bottleneck = 'HIGH_REJECTION';
  else if (drafts.length > total * 0.4) bottleneck = 'DRAFTS_STUCK';
  else if (conversionRate < 25) bottleneck = 'LOW_CONVERSION';

  // 2. GENERAR COMPONENTES BASE
  const funnel = analyzeSalesFunnel(allQuotes, quoteAmounts);
  const insights = generateAdvancedInsights(allQuotes, quoteAmounts);
  const actions = generateRecommendedActions(allQuotes, quoteAmounts);
  const summary = generateExecutiveSummary(allQuotes, quoteAmounts);

  // 3. SOBRESCRIBIR/ALINEAR SEGÚN EL CUELLO DE BOTELLA
  const formattedRevenue = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })
    .format(Array.from(quoteAmounts.values()).reduce((a, b) => a + b, 0) * (conversionRate/100 || 0.3));

  switch (bottleneck) {
    case 'LOW_VOLUME':
      summary.text = `Tu negocio está en fase inicial con **${total} presupuestos**. Necesitas generar más volumen para obtener insights precisos.`;
      summary.status = 'neutral';
      funnel.explanation = "El funnel tiene pocos datos, pero el objetivo ahora es **llenar la parte superior** (Oportunidades).";
      break;

    case 'HIGH_REJECTION':
      summary.text = `Atención: tu **tasa de rechazo (${rejectionRate.toFixed(0)}%)** es el factor crítico que frena tus ingresos potenciales de **${formattedRevenue}**.`;
      summary.status = 'attention';
      funnel.explanation = "Detectamos una **fuga masiva en la fase final**. El cliente recibe el presupuesto pero decide no aceptar.";
      break;

    case 'DRAFTS_STUCK':
      summary.text = `Tienes **${drafts.length} borradores estancados**. Estos presupuestos no enviados representan una pérdida potencial de **${formattedRevenue}**.`;
      summary.status = 'attention';
      funnel.explanation = "La mayor fuga ocurre antes del envío. **Pierdes el 100% de los clientes** que nunca reciben tu propuesta.";
      break;

    case 'LOW_CONVERSION':
      summary.text = `Tus presupuestos llegan al cliente, pero solo el **${conversionRate.toFixed(0)}% acepta**. Necesitas reforzar el cierre de ventas.`;
      summary.status = 'attention';
      funnel.explanation = "El funnel se estrecha peligrosamente en el paso de **Enviado a Cerrado**. El cliente duda antes de firmar.";
      break;
  }

  return {
    summary,
    funnel,
    actions,
    insights,
    mainBottleneck: bottleneck
  };
}
