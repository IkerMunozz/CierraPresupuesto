import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { quotes, quoteLines, companies, clients } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ message: 'No autorizado' }, { status: 401 });

  const quoteId = parseInt(params.id);

  try {
    const quote = await db.query.quotes.findFirst({
      where: eq(quotes.id, quoteId),
      with: {
        company: true,
        client: true,
        lines: true,
      }
    });

    if (!quote || quote.userId !== session.user.id) {
      return NextResponse.json({ message: 'Presupuesto no encontrado' }, { status: 404 });
    }

    return NextResponse.json(quote);
  } catch (error) {
    console.error('Error al obtener presupuesto:', error);
    return NextResponse.json({ message: 'Error interno' }, { status: 500 });
  }
}
