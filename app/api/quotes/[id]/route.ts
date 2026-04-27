import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { quotes } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { getUserPlan } from '@/lib/plans';

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ message: 'No autorizado' }, { status: 401 });
    }

    // IMPORTANTE: No usar parseInt(). El ID ahora es un UUID (string).
    const quoteId = params.id;

    const quote = await db.query.quotes.findFirst({
      where: eq(quotes.id, quoteId),
      with: {
        company: true,
        client: true,
        lines: true,
      }
    });

    if (!quote) {
      return NextResponse.json({ message: 'Presupuesto no encontrado' }, { status: 404 });
    }

    if (quote.userId !== session.user.id) {
      return NextResponse.json({ message: 'No tienes permiso para ver este presupuesto' }, { status: 403 });
    }

    const plan = await getUserPlan(session.user.id);
    const isFree = plan === 'free';

    return NextResponse.json({ ...quote, isFree });
  } catch (error: any) {
    console.error('❌ Error API /api/quotes/[id]:', error);
    return NextResponse.json({ 
      message: 'Error interno del servidor', 
      error: error.message 
    }, { status: 500 });
  }
}
