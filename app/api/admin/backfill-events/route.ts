import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { quotes, quoteEvents } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { QUOTE_EVENT_TYPES } from '@/lib/db/eventTypes';

/**
 * POST /api/admin/backfill-events
 * Crea eventos históricos para presupuestos que no los tienen
 * Basado en el campo status y createdAt de cada presupuesto
 */
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ message: 'No autorizado' }, { status: 401 });
  }

  // Solo admin puede ejecutar esto (opcional: verificar rol)
  // Por ahora, cualquier usuario autenticado puede backfill sus propios datos

  try {
    // 1. Obtener todos los presupuestos del usuario
    const userQuotes = await db
      .select({
        id: quotes.id,
        status: quotes.status,
        createdAt: quotes.createdAt,
        sentAt: quotes.sentAt,
      })
      .from(quotes)
      .where(eq(quotes.userId, session.user.id));

    // 2. Para cada presupuesto, verificar si tiene eventos
    let created = 0;
    let skipped = 0;

    for (const quote of userQuotes) {
      // Verificar si ya tiene evento QUOTE_CREATED
      const existingEvent = await db
        .select({ id: quoteEvents.id })
        .from(quoteEvents)
        .where(eq(quoteEvents.quoteId, quote.id))
        .limit(1);

      if (existingEvent.length > 0) {
        skipped++;
        continue; // Ya tiene eventos, saltar
      }

      // Crear evento QUOTE_CREATED basado en createdAt
      await db.insert(quoteEvents).values({
        quoteId: quote.id,
        type: QUOTE_EVENT_TYPES.CREATED,
        createdAt: quote.createdAt,
        metadata: { backfilled: true, originalStatus: quote.status },
      });

      created++;

      // Si el status es 'sent', crear evento QUOTE_SENT
      if (quote.status === 'sent' || quote.status === 'viewed' || quote.status === 'accepted' || quote.status === 'rejected') {
        await db.insert(quoteEvents).values({
          quoteId: quote.id,
          type: QUOTE_EVENT_TYPES.SENT,
          createdAt: quote.sentAt || new Date(quote.createdAt.getTime() + 24 * 60 * 60 * 1000), // +1 día si no hay sentAt
          metadata: { backfilled: true, derivedFromStatus: quote.status },
        });
      }

      // Si el status es 'accepted', crear evento QUOTE_ACCEPTED
      if (quote.status === 'accepted') {
        await db.insert(quoteEvents).values({
          quoteId: quote.id,
          type: QUOTE_EVENT_TYPES.ACCEPTED,
          createdAt: new Date(quote.createdAt.getTime() + 2 * 24 * 60 * 60 * 1000), // +2 días
          metadata: { backfilled: true },
        });
      }

      // Si el status es 'rejected', crear evento QUOTE_REJECTED
      if (quote.status === 'rejected') {
        await db.insert(quoteEvents).values({
          quoteId: quote.id,
          type: QUOTE_EVENT_TYPES.REJECTED,
          createdAt: new Date(quote.createdAt.getTime() + 2 * 24 * 60 * 60 * 1000), // +2 días
          metadata: { backfilled: true },
        });
      }
    }

    return NextResponse.json({
      message: 'Backfill completado',
      totalQuotes: userQuotes.length,
      eventsCreated: created,
      skipped,
    });
  } catch (error: any) {
    console.error('Error en backfill:', error);
    return NextResponse.json(
      { message: 'Error en backfill', error: error.message },
      { status: 500 }
    );
  }
}
