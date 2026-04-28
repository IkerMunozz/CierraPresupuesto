import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { clients, quotes } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { calculatePricingRecommendation } from '@/lib/services/pricingService';

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return NextResponse.json({ message: 'No autorizado' }, { status: 401 });
  }

  try {
    const { basePrice, clientId, score = 70 } = await req.json();

    if (!basePrice || !clientId) {
      return NextResponse.json({ message: 'Faltan parámetros' }, { status: 400 });
    }

    // 1. Obtener datos del cliente para el tipo
    const [client] = await db
      .select()
      .from(clients)
      .where(and(eq(clients.id, clientId), eq(clients.userId, session.user.id)))
      .limit(1);

    // 2. Obtener historial de presupuestos para este cliente
    const history = await db
      .select({
        status: quotes.status,
        price: quotes.price,
        score: quotes.score
      })
      .from(quotes)
      .where(and(eq(quotes.clientId, clientId), eq(quotes.userId, session.user.id)))
      .limit(10);

    // Mapear historial al formato del servicio
    const formattedHistory = history.map(h => ({
      status: h.status,
      price: parseFloat(h.price?.replace(/[^0-9.]/g, '') || '0'),
      score: h.score || 0
    }));

    // 3. Calcular recomendación
    // Nota: Como el schema de client no tiene "type" explícito en lib/db/schema.ts (visto antes),
    // usaremos el nombre o algún campo para inferirlo o pasar null
    const recommendation = calculatePricingRecommendation(
      basePrice,
      score,
      client?.name || null,
      formattedHistory
    );

    return NextResponse.json(recommendation);
  } catch (error) {
    console.error('Error in pricing analysis:', error);
    return NextResponse.json({ message: 'Error al analizar precios' }, { status: 500 });
  }
}
