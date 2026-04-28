// lib/services/summaryService.ts
export interface ExecutiveSummary {
  text: string;
  status: 'positive' | 'neutral' | 'attention';
}

export function generateExecutiveSummary(
  allQuotes: any[],
  quoteAmounts: Map<string, number>
): ExecutiveSummary {
  if (allQuotes.length === 0) {
    return {
      text: "Aún no has generado presupuestos. Empieza creando tu primera propuesta para ver el análisis de tu negocio.",
      status: 'neutral'
    };
  }

  const total = allQuotes.length;
  const sent = allQuotes.filter(q => q.status === 'sent' || q.status === 'accepted' || q.status === 'rejected').length;
  const accepted = allQuotes.filter(q => q.status === 'accepted').length;
  const drafts = allQuotes.filter(q => q.status === 'draft').length;
  const rejected = allQuotes.filter(q => q.status === 'rejected').length;

  const conversionRate = sent > 0 ? (accepted / sent) * 100 : 0;

  const potentialRevenue = allQuotes.reduce((sum, q) => {
    if (q.status === 'rejected') return sum;
    const amount = quoteAmounts.get(q.id) || 0;
    const prob = (q.score || 0) >= 80 ? 0.85 : (q.score || 0) >= 60 ? 0.6 : 0.2;
    return sum + (amount * prob);
  }, 0);

  const formattedRevenue = new Intl.NumberFormat('es-ES', { 
    style: 'currency', 
    currency: 'EUR',
    maximumFractionDigits: 0 
  }).format(potentialRevenue);

  let problem = "";
  let recommendation = "";
  let status: ExecutiveSummary['status'] = 'positive';

  if (sent > 0 && (rejected / sent) > 0.4) {
    problem = "estás experimentando una tasa de rechazo superior a la media";
    recommendation = "revisar si tus precios están alineados con la competencia o si falta claridad en los entregables";
    status = 'attention';
  } else if (drafts > total * 0.5) {
    problem = "tienes un volumen alto de borradores que no han llegado al cliente";
    recommendation = "priorizar el envío de estas propuestas para no perder el interés de los leads";
    status = 'attention';
  } else if (sent > 3 && conversionRate < 20) {
    problem = "tu tasa de conversión actual es baja";
    recommendation = "mejorar el cierre de tus presupuestos añadiendo llamadas a la acción (CTA) más claras";
    status = 'attention';
  } else {
    problem = "tu flujo de trabajo es constante";
    recommendation = "seguir utilizando el análisis de IA para mantener la calidad en cada envío";
    status = 'positive';
  }

  const text = `Hasta hoy has generado **${total} presupuestos** con un valor potencial de **${formattedRevenue}**. ` +
               `Tu tasa de conversión se sitúa en el **${conversionRate.toFixed(1)}%**. ` +
               `Actualmente detectamos que ${problem}, por lo que nuestra recomendación principal es ${recommendation}.`;

  return { text, status };
}
