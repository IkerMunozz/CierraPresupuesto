import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { quotes, quoteLines } from '@/lib/db/schema';
import { eq, desc, inArray } from 'drizzle-orm';
import { EnterpriseDashboard } from '@/components/dashboard/EnterpriseDashboard';
import SiteHeader from '@/components/SiteHeader';
import { getUnifiedDiagnosticsFromEvents } from '@/lib/services/diagnosticsService';
import { getDashboardDataFromEvents } from '@/lib/db/events';
import { runCopilotAnalysis } from '@/lib/services/salesCopilotService';

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect('/login');

  // 1. Obtener todos los presupuestos del usuario
  const allQuotes = await db
    .select()
    .from(quotes)
    .where(eq(quotes.userId, session.user.id))
    .orderBy(desc(quotes.createdAt));

  // 2. Obtener líneas de presupuestos para calcular montos
  const quoteIds = allQuotes.map(q => q.id);
  let lines: any[] = [];
  if (quoteIds.length > 0) {
    lines = await db
      .select()
      .from(quoteLines)
      .where(inArray(quoteLines.quoteId, quoteIds));
  }

  // 3. Procesar montos por presupuesto
  const quoteAmounts = new Map<string, number>();
  lines.forEach(line => {
    const current = quoteAmounts.get(line.quoteId) || 0;
    quoteAmounts.set(line.quoteId, current + Number(line.totalAmount));
  });

  // 4. Obtener datos del dashboard 100% basados en eventos
  const [dashboardDataFromEvents, diagnostics, copilotData] = await Promise.all([
    getDashboardDataFromEvents(session.user.id),
    getUnifiedDiagnosticsFromEvents(allQuotes, quoteAmounts),
    runCopilotAnalysis(session.user.id, 'DAILY_ACTION'),
  ]);

  // 5. Preparar datos para la tabla (usar estados derivados de eventos)
  const { getQuotesStatusesFromEvents } = await import('@/lib/db/events');
  const statusMap = await getQuotesStatusesFromEvents(quoteIds);

  const tableQuotes = allQuotes.slice(0, 5).map(q => ({
    id: q.id,
    clientName: q.clientName,
    amount: quoteAmounts.get(q.id) || 0,
    status: statusMap.get(q.id) || 'draft',
    score: q.score || 0,
    date: q.createdAt,
  }));

  // 6. Construir objeto final para el dashboard
  const dashboardData = {
    kpis: dashboardDataFromEvents.kpis,
    funnel: {
      chartData: [
        { name: 'Creados', valor: dashboardDataFromEvents.funnel.created, fill: '#94a3b8' },
        { name: 'Enviados', valor: dashboardDataFromEvents.funnel.sent, fill: '#3b82f6' },
        { name: 'Vistos', valor: dashboardDataFromEvents.funnel.viewed, fill: '#8b5cf6' },
        { name: 'Aceptados', valor: dashboardDataFromEvents.funnel.accepted, fill: '#10b981' },
        { name: 'Rechazados', valor: dashboardDataFromEvents.funnel.rejected, fill: '#ef4444' },
      ],
      explanation: diagnostics.funnel.explanation,
    },
    summary: diagnostics.summary,
    insights: diagnostics.insights,
    actions: diagnostics.actions,
    activities: dashboardDataFromEvents.recentActivity.map(event => ({
      id: event.id,
      type: event.type.replace('QUOTE_', '').toLowerCase(),
      quoteTitle: event.quoteTitle,
      clientName: event.clientName,
      timestamp: event.timestamp,
      amount: 0,
    })),
    quotes: tableQuotes,
    copilot: copilotData,
  };

  return (
    <>
      <SiteHeader />
      <EnterpriseDashboard
        data={dashboardData as any}
        userName={session.user.name || undefined}
      />
    </>
  );
}
