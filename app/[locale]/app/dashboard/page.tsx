import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { quotes, quoteLines } from '@/lib/db/schema';
import { eq, desc, sql, inArray } from 'drizzle-orm';
import { EnterpriseDashboard } from '@/components/dashboard/EnterpriseDashboard';
import { startOfDay, subDays } from 'date-fns';
import SiteHeader from '@/components/SiteHeader';

// Import services
import { getUnifiedDiagnostics } from '@/lib/services/diagnosticsService';

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect('/login');

  // 1. Fetch data
  const allQuotes = await db
    .select()
    .from(quotes)
    .where(eq(quotes.userId, session.user.id))
    .orderBy(desc(quotes.createdAt));

  const quoteIds = allQuotes.map(q => q.id);
  let lines = [];
  if (quoteIds.length > 0) {
    lines = await db
      .select()
      .from(quoteLines)
      .where(inArray(quoteLines.quoteId, quoteIds));
  }

  // 2. Process amounts
  const quoteAmounts = new Map<string, number>();
  lines.forEach(line => {
    const current = quoteAmounts.get(line.quoteId) || 0;
    quoteAmounts.set(line.quoteId, current + Number(line.totalAmount));
  });

  // 3. Generate Unified Analytics using the Orquestrador
  const diagnostics = getUnifiedDiagnostics(allQuotes, quoteAmounts);

  // 4. Calculate KPIs and variations
  const thirtyDaysAgo = startOfDay(subDays(new Date(), 30));
  const recentQuotes = allQuotes.filter(q => new Date(q.createdAt) >= thirtyDaysAgo);
  const olderQuotes = allQuotes.filter(q => new Date(q.createdAt) < thirtyDaysAgo);

  const getConversion = (qs: any[]) => {
    const sent = qs.filter(q => ['sent', 'accepted', 'rejected'].includes(q.status)).length;
    const accepted = qs.filter(q => q.status === 'accepted').length;
    return sent > 0 ? (accepted / sent) * 100 : 0;
  };

  const currentConversion = getConversion(recentQuotes);
  const oldConversion = getConversion(olderQuotes);

  // 5. Activity Feed
  const activities = allQuotes.slice(0, 8).map(q => ({
    id: q.id,
    type: q.status === 'draft' ? 'created' : q.status as any,
    quoteTitle: q.title,
    clientName: q.clientName,
    timestamp: q.createdAt,
    amount: quoteAmounts.get(q.id) || 0
  }));

  // 6. Table Data
  const tableQuotes = allQuotes.slice(0, 5).map(q => ({
    id: q.id,
    clientName: q.clientName,
    amount: quoteAmounts.get(q.id) || 0,
    status: q.status,
    score: q.score || 0,
    date: q.createdAt
  }));

  const dashboardData = {
    kpis: {
      potentialRevenue: Array.from(quoteAmounts.values()).reduce((a, b) => a + b, 0) * (diagnostics.funnel.stages[2].conversionRate / 100 || 0.3),
      potentialRevenueChange: 12.5,
      conversionRate: Math.round(currentConversion),
      conversionRateChange: Math.round(currentConversion - oldConversion),
      sent: allQuotes.filter(q => q.status === 'sent').length,
      sentChange: 8,
      accepted: allQuotes.filter(q => q.status === 'accepted').length,
      acceptedChange: 5
    },
    ...diagnostics,
    activities,
    quotes: tableQuotes
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
