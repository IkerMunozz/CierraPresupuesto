// lib/services/funnelService.ts
export interface FunnelStage {
  stage: string;
  count: number;
  value: number;
  dropOffRate: number;
  conversionRate: number;
}

export interface FunnelAnalysis {
  chartData: any[];
  maxLeakageStage: string;
  explanation: string;
  stages: FunnelStage[];
}

export function analyzeSalesFunnel(
  allQuotes: any[],
  quoteAmounts: Map<string, number>
): FunnelAnalysis {
  const draftQuotes = allQuotes.filter(q => q.status === 'draft');
  const sentQuotes = allQuotes.filter(q => q.status === 'sent');
  const acceptedQuotes = allQuotes.filter(q => q.status === 'accepted');
  const rejectedQuotes = allQuotes.filter(q => q.status === 'rejected');

  const totalCreated = allQuotes.length;
  const totalSent = sentQuotes.length + acceptedQuotes.length + rejectedQuotes.length;
  const totalWon = acceptedQuotes.length;

  const getValue = (quotes: any[]) => quotes.reduce((sum, q) => sum + (quoteAmounts.get(q.id) || 0), 0);

  const stages: FunnelStage[] = [
    {
      stage: 'Oportunidades',
      count: totalCreated,
      value: getValue(allQuotes),
      dropOffRate: 0,
      conversionRate: totalCreated > 0 ? (totalSent / totalCreated) * 100 : 0
    },
    {
      stage: 'Enviados',
      count: totalSent,
      value: getValue([...sentQuotes, ...acceptedQuotes, ...rejectedQuotes]),
      dropOffRate: totalCreated > 0 ? ((totalCreated - totalSent) / totalCreated) * 100 : 0,
      conversionRate: totalSent > 0 ? (totalWon / totalSent) * 100 : 0
    },
    {
      stage: 'Cerrados',
      count: totalWon,
      value: getValue(acceptedQuotes),
      dropOffRate: totalSent > 0 ? ((totalSent - totalWon) / totalSent) * 100 : 0,
      conversionRate: 100
    }
  ];

  const draftLeakage = stages[1].dropOffRate;
  const salesLeakage = stages[2].dropOffRate;

  let maxLeakageStage = "";
  let explanation = "";

  if (draftLeakage > salesLeakage && draftLeakage > 20) {
    maxLeakageStage = "Borradores";
    explanation = `Tu mayor fuga está en los **borradores (${draftLeakage.toFixed(0)}%)**. Estás creando muchas propuestas que nunca llegan al cliente.`;
  } else if (salesLeakage > 40) {
    const rejectionInfluence = totalSent > 0 ? (rejectedQuotes.length / (totalSent - totalWon)) * 100 : 0;
    maxLeakageStage = "Negociación";
    explanation = `Pierdes el **${salesLeakage.toFixed(0)}% de tus propuestas** tras enviarlas. ${
      rejectionInfluence > 50 
      ? "La mayoría son rechazos explícitos, revisa tu pricing." 
      : "Falta proceso de seguimiento."
    }`;
  } else {
    maxLeakageStage = "Ninguna";
    explanation = "Tu funnel es saludable. La conversión entre etapas es fluida.";
  }

  const chartData = stages.map(s => ({
    name: s.stage,
    valor: s.count,
    dinero: s.value,
    fill: s.stage === 'Cerrados' ? '#10b981' : s.stage === 'Enviados' ? '#3b82f6' : '#94a3b8'
  }));

  return { chartData, maxLeakageStage, explanation, stages };
}
