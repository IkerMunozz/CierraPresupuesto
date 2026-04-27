import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { quotes } from '@/lib/db/schema';
import { analyzeQuote, improveQuote } from '@/lib/quoteEngine';
import { getUserPlan, PLANS } from '@/lib/plans';
import { eq } from 'drizzle-orm';

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ message: 'No autorizado' }, { status: 401 });

    // ID como string (UUID)
    const quoteId = params.id;

    // Obtener el presupuesto con sus relaciones
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

    // Verificar plan del usuario
    const plan = await getUserPlan(session.user.id);
    if (!PLANS[plan].features.ai) {
      return NextResponse.json({ message: 'El análisis de IA requiere un plan PRO o BUSINESS' }, { status: 403 });
    }

    // Generar texto completo del presupuesto para la IA
    const linesDescription = (quote.lines || []).map(l => {
      const lineTotal = parseFloat(l.quantity.toString()) * parseFloat(l.unitPrice.toString()) * (1 + l.iva / 100);
      return `- ${l.name}: ${l.quantity} x ${l.unitPrice}€ (Total con IVA: ${lineTotal.toFixed(2)}€). ${l.description || ''}`;
    }).join('\n');

    const totalValue = (quote.lines || []).reduce((acc, l) => {
      const lineTotal = parseFloat(l.quantity.toString()) * parseFloat(l.unitPrice.toString()) * (1 + l.iva / 100);
      return acc + lineTotal;
    }, 0);

    const fullQuoteText = `
      Presupuesto de: ${quote.company?.name || 'Empresa'}
      Para: ${quote.client?.name || quote.clientName || 'Cliente'}
      Conceptos:
      ${linesDescription}
      Total Presupuestado: ${totalValue.toFixed(2)}€
      Observaciones: ${quote.observations || 'Ninguna'}
    `;

    console.log(`🤖 Generando análisis manual para presupuesto ${quoteShortId(quoteId)}...`);

    // Generar análisis
    const analysis = await analyzeQuote(fullQuoteText);
    const improved = await improveQuote(fullQuoteText, analysis);

    // Actualizar presupuesto con el análisis
    await db.update(quotes)
      .set({ 
        analysis, 
        improved, // Nombre de columna corregido
        score: analysis.score,
        content: fullQuoteText
      })
      .where(eq(quotes.id, quoteId));

    console.log('✅ Análisis manual completado');

    return NextResponse.json({ 
      message: 'Análisis generado correctamente',
      analysis,
      improved
    });

  } catch (error: any) {
    console.error('❌ Error al generar análisis:', error);
    return NextResponse.json({ 
      message: 'Error al generar análisis', 
      error: error.message 
    }, { status: 500 });
  }
}

function quoteShortId(id: string) {
  return id.substring(0, 8);
}
