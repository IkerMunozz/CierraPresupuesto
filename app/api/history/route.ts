import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { quotes } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ message: 'No autorizado.' }, { status: 401 });
    }

    const userQuotes = await db
      .select({
        id: quotes.id,
        serviceType: quotes.serviceType,
        description: quotes.description,
        price: quotes.price,
        clientType: quotes.clientType,
        context: quotes.context,
        quote: quotes.quote,
        analysis: quotes.analysis,
        improvedQuote: quotes.improvedQuote,
        createdAt: quotes.createdAt,
      })
      .from(quotes)
      .where(eq(quotes.userId, session.user.id))
      .orderBy(desc(quotes.createdAt))
      .limit(10);

    return NextResponse.json(userQuotes);
  } catch (error) {
    return NextResponse.json({ message: 'Error al cargar historial.' }, { status: 500 });
  }
}