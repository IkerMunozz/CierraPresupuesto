// lib/services/actionService.ts
export type ActionPriority = 'alta' | 'media' | 'baja';

export interface RecommendedAction {
  title: string;
  description: string;
  impact: string;
  impactValue?: number;
  priority: ActionPriority;
  cta: string;
  ctaPath: string;
}

export function generateRecommendedActions(
  allQuotes: any[],
  quoteAmounts: Map<string, number>
): RecommendedAction[] {
  const actions: RecommendedAction[] = [];
  const drafts = allQuotes.filter(q => q.status === 'draft');
  const sent = allQuotes.filter(q => q.status === 'sent');
  const accepted = allQuotes.filter(q => q.status === 'accepted');
  const rejected = allQuotes.filter(q => q.status === 'rejected');
  
  const totalSent = sent.length + accepted.length + rejected.length;
  const conversionRate = totalSent > 0 ? (accepted.length / totalSent) * 100 : 0;
  const avgConversion = conversionRate / 100 || 0.3;

  // 1. Acciones para Borradores (Drafts)
  if (drafts.length > 0) {
    const draftValue = drafts.reduce((sum, q) => sum + (quoteAmounts.get(q.id) || 0), 0);
    const estimatedImpact = draftValue * avgConversion;
    
    actions.push({
      title: `Enviar ${drafts.length} ${drafts.length === 1 ? 'presupuesto' : 'presupuestos'}`,
      description: `Tienes propuestas preparadas que no han llegado al cliente. Envíalas hoy para activar tu pipeline.`,
      impact: `+${new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(estimatedImpact)}`,
      impactValue: estimatedImpact,
      priority: drafts.length > 5 ? 'alta' : 'media',
      cta: 'Ir a borradores',
      ctaPath: '/app/history?status=draft'
    });
  }

  // 2. Acciones para Seguimiento (Sent but no response)
  if (sent.length > 0) {
    const sentValue = sent.reduce((sum, q) => sum + (quoteAmounts.get(q.id) || 0), 0);
    const estimatedImpact = sentValue * 0.2; // Estimamos que un buen seguimiento recupera el 20%
    
    actions.push({
      title: `Hacer seguimiento de ${sent.length} clientes`,
      description: `Hay clientes que ya tienen tu propuesta pero no han respondido. Un recordatorio puede cerrar la venta.`,
      impact: `+${new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(estimatedImpact)}`,
      impactValue: estimatedImpact,
      priority: 'alta',
      cta: 'Ver enviados',
      ctaPath: '/app/history?status=sent'
    });
  }

  // 3. Acciones de Mejora de Calidad (Low score)
  const lowScoreQuotes = allQuotes.filter(q => q.status === 'draft' && (q.score || 0) < 60);
  if (lowScoreQuotes.length > 0) {
    actions.push({
      title: 'Mejorar calidad de propuestas',
      description: `${lowScoreQuotes.length} de tus borradores tienen un score bajo. Mejora el texto con IA antes de enviar.`,
      impact: '+15% conversión',
      priority: 'media',
      cta: 'Revisar borradores',
      ctaPath: '/app/history?status=draft'
    });
  }

  // 4. Acciones de Precios (High rejection)
  if (rejected.length > 3 && (rejected.length / (totalSent || 1)) > 0.4) {
    actions.push({
      title: 'Ajustar estrategia de precios',
      description: 'Tu tasa de rechazo es alta. Considera crear versiones más económicas o fraccionar pagos.',
      impact: 'Reducir fugas',
      priority: 'alta',
      cta: 'Analizar rechazados',
      ctaPath: '/app/history?status=rejected'
    });
  }

  return actions.sort((a, b) => {
    const p = { alta: 3, media: 2, baja: 1 };
    return p[b.priority] - p[a.priority];
  });
}
