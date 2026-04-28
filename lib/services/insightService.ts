// lib/services/insightService.ts
export type InsightType = 'pattern' | 'recommendation' | 'warning' | 'opportunity';

export interface AIInsight {
  type: InsightType;
  title: string;
  description: string;
  impact?: string;
}

export function generateAdvancedInsights(
  allQuotes: any[], 
  quoteAmounts: Map<string, number>
): AIInsight[] {
  const insights: AIInsight[] = [];
  const drafts = allQuotes.filter(q => q.status === 'draft');
  const sent = allQuotes.filter(q => q.status === 'sent');
  const accepted = allQuotes.filter(q => q.status === 'accepted');
  const rejected = allQuotes.filter(q => q.status === 'rejected');
  
  const totalSent = sent.length + accepted.length + rejected.length;
  const globalConversionRate = totalSent > 0 ? (accepted.length / totalSent) * 100 : 0;

  if (totalSent > 3) {
    insights.push({
      type: 'pattern',
      title: 'Tasa de conversión global',
      description: `Tu efectividad actual es del ${globalConversionRate.toFixed(1)}%. ${
        globalConversionRate > 50 ? 'Estás por encima de la media del sector.' : 'Hay margen para mejorar la persuasión en tus propuestas.'
      }`,
      impact: globalConversionRate > 50 ? 'Excelente rendimiento' : 'Mejora sugerida'
    });

    const highMatch = allQuotes.filter(q => (q.score || 0) >= 80 && q.status === 'accepted').length;
    const highSent = allQuotes.filter(q => (q.score || 0) >= 80 && (q.status === 'sent' || q.status === 'accepted' || q.status === 'rejected')).length;
    const highConversion = highSent > 0 ? (highMatch / highSent) * 100 : 0;

    if (highSent > 0 && highConversion > globalConversionRate) {
      insights.push({
        type: 'opportunity',
        title: 'La IA predice tus éxitos',
        description: `Los presupuestos con score >80 tienen un ${highConversion.toFixed(0)}% de éxito, superior a tu media.`,
        impact: 'Prioriza estos leads'
      });
    }
  }

  if (drafts.length > 0) {
    const potentialLoss = drafts.reduce((sum, q) => sum + (quoteAmounts.get(q.id) || 0), 0);
    if (potentialLoss > 0) {
      insights.push({
        type: 'warning',
        title: 'Dinero estancado en borradores',
        description: `Tienes ${drafts.length} presupuestos sin enviar. Algunos clientes podrían estar esperando.`,
        impact: `Pérdida potencial: ${new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(potentialLoss)}`
      });
    }
  }

  const avgAmount = Array.from(quoteAmounts.values()).reduce((a, b) => a + b, 0) / (quoteAmounts.size || 1);
  const underpricedHighScore = accepted.filter(q => 
    (q.score || 0) > 85 && (quoteAmounts.get(q.id) || 0) < avgAmount * 0.7
  );

  if (underpricedHighScore.length > 0) {
    insights.push({
      type: 'recommendation',
      title: 'Oportunidad de Up-selling',
      description: 'Detectamos clientes con alta satisfacción y tickets bajos. Podrías subir tus tarifas en este perfil.',
      impact: 'Aumento de ticket medio'
    });
  }

  return insights.slice(0, 6);
}
