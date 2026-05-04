// lib/services/diagnosticsService.ts - VERSIÓN BASADA EN EVENTOS CON IA PARA TEXTO
import { generateAdvancedInsights, AIInsight } from './insightService';
import { generateRecommendedActions, RecommendedAction } from './actionService';
import { generateExecutiveSummary, ExecutiveSummary } from './summaryService';
import { analyzeSalesFunnel, FunnelAnalysis } from './funnelService';
import { getQuotesStatusesFromEvents, QuoteStatusFromEvents } from '@/lib/db/events';
import { generateInsightTextWithAI, InsightContext } from './aiInsightTextGenerator';

export type BottleneckType = 'DRAFTS_STUCK' | 'LOW_CONVERSION' | 'HIGH_REJECTION' | 'LOW_VOLUME' | 'HEALTHY';

export interface UnifiedDashboardData {
  summary: ExecutiveSummary;
  funnel: FunnelAnalysis;
  actions: RecommendedAction[];
  insights: AIInsight[];
  mainBottleneck: BottleneckType;
}

export interface QuoteWithEventStatus {
  id: string;
  title: string;
  clientName: string;
  score: number | null;
  createdAt: Date;
  status: QuoteStatusFromEvents;
  totalAmount: number;
}

export async function getUnifiedDiagnosticsFromEvents(
  allQuotes: any[],
  quoteAmounts: Map<string, number>
): Promise<UnifiedDashboardData> {
  // Obtener estados desde eventos
  const quoteIds = allQuotes.map(q => q.id);
  const statusMap = await getQuotesStatusesFromEvents(quoteIds);

  // Adjuntar estado basado en eventos a cada presupuesto
  const quotesWithStatus: QuoteWithEventStatus[] = allQuotes.map(q => ({
    id: q.id,
    title: q.title,
    clientName: q.clientName,
    score: q.score || 0,
    createdAt: new Date(q.createdAt),
    status: statusMap.get(q.id) || 'draft',
    totalAmount: quoteAmounts.get(q.id) || 0,
  }));

  // Filtrar por estado derivado de eventos
  const drafts = quotesWithStatus.filter(q => q.status === 'draft');
  const sent = quotesWithStatus.filter(q => q.status === 'sent' || q.status === 'viewed');
  const accepted = quotesWithStatus.filter(q => q.status === 'accepted');
  const rejected = quotesWithStatus.filter(q => q.status === 'rejected');

  const total = quotesWithStatus.length;
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
  const funnel = analyzeSalesFunnel(quotesWithStatus, quoteAmounts);
  const insights = generateAdvancedInsights(quotesWithStatus, quoteAmounts);
  const actions = generateRecommendedActions(quotesWithStatus, quoteAmounts);
  const summary = generateExecutiveSummary(quotesWithStatus, quoteAmounts);

  // 3. GENERAR TEXTO CON IA (mantiene toda la lógica matemática intacta)
  const totalAmounts = Array.from(quoteAmounts.values()).reduce((a, b) => a + b, 0);
  const expectedRevenue = totalAmounts * (conversionRate / 100 || 0.3);
  const avgQuoteAmount = quoteAmounts.size > 0 ? totalAmounts / quoteAmounts.size : 0;

  const draftLeakage = total > 0 ? ((total - quotesWithStatus.filter(q => q.status !== 'draft').length) / total) * 100 : 0;
  const totalNonDraft = sent.length + accepted.length + rejected.length;
  const salesLeakage = totalNonDraft > 0 ? ((totalNonDraft - accepted.length) / totalNonDraft) * 100 : 0;

  const highSent = quotesWithStatus.filter(q => (q.score || 0) >= 80 && (q.status === 'sent' || q.status === 'viewed' || q.status === 'accepted' || q.status === 'rejected')).length;
  const highAccepted = quotesWithStatus.filter(q => (q.score || 0) >= 80 && q.status === 'accepted').length;
  const highScoreConversion = highSent > 0 ? (highAccepted / highSent) * 100 : undefined;

  const underpricedAccepted = accepted.filter(q => (q.score || 0) > 85 && (quoteAmounts.get(q.id) || 0) < avgQuoteAmount * 0.7).length;

  const aiContext: InsightContext = {
    conversionRate,
    totalQuotes: total,
    drafts: drafts.length,
    sent: sent.length + accepted.length + rejected.length,
    accepted: accepted.length,
    rejected: rejected.length,
    potentialRevenue: totalAmounts,
    expectedRevenue,
    rejectionRate,
    bottleneck,
    draftLeakage,
    salesLeakage,
    avgQuoteAmount,
    highScoreConversion,
    underpricedCount: underpricedAccepted,
  };

  const aiText = await generateInsightTextWithAI(aiContext);

  summary.text = aiText.summary;
  summary.status = aiText.status;
  funnel.explanation = aiText.funnelExplanation;

  return {
    summary,
    funnel,
    actions,
    insights,
    mainBottleneck: bottleneck,
  };
}
