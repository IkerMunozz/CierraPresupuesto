import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { quotes, quoteLines, companies } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import PublicQuoteView from '@/components/PublicQuoteView';

interface QuotePageProps {
  params: { locale: string; id: string };
}

export default async function QuotePage({ params }: QuotePageProps) {
  const { id } = params;

  const quote = await db.query.quotes.findFirst({
    where: (q: any, { eq }: any) => eq(q.id, id),
    with: {
      lines: true,
    },
  });

  if (!quote) notFound();

  const company = quote.companyId
    ? await db.query.companies.findFirst({
        where: (c: any, { eq }: any) => eq(c.id, quote.companyId!),
      })
    : null;

  return <PublicQuoteView quote={quote as any} company={company as any} />;
}

export async function generateMetadata({ params }: QuotePageProps) {
  const quote = await db.query.quotes.findFirst({
    where: (q: any, { eq }: any) => eq(q.id, params.id),
    columns: { title: true },
  });

  return {
    title: quote?.title || 'Presupuesto',
  };
}
