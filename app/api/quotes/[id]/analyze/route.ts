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

    const quoteId = params.id;

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

    const plan = await getUserPlan(session.user.id);
    if (!PLANS[plan].features.ai) {
      return NextResponse.json({ message: 'El análisis de IA requiere un plan PRO o BUSINESS' }, { status: 403 });
    }

    // Lógica robusta para generar el texto para la IA
    const linesDescription = (quote.lines || []).map(l => {
      const q = parseFloat(l.quantity?.toString() || '0');
      const p = parseFloat(l.unitPrice?.toString() || '0');
      const tax = (l.iva || 0) / 100;
      const lineTotal = q * p * (1 + tax);
      return `- ${l.name}: ${q} x ${p}€ (Total con IVA: ${lineTotal.toFixed(2)}€). ${l.description || ''}`;
    }).join('\n');

    const totalValue = (quote.lines || []).reduce((acc, l) => {
      const q = parseFloat(l.quantity?.toString() || '0');
      const p = parseFloat(l.unitPrice?.toString() || '0');
      const tax = (l.iva || 0) / 100;
      return acc + (q * p * (1 + tax));
    }, 0);

    const fullQuoteText = `
      Presupuesto de: ${quote.company?.name || 'Empresa'}
      Para: ${quote.client?.name || quote.clientName || 'Cliente'}
      Conceptos:
      ${linesDescription}
      Total Presupuestado: ${totalValue.toFixed(2)}€
      Observaciones: ${quote.observations || 'Ninguna'}
    `;

    console.log(`🤖 Analizando presupuesto ${quoteId.substring(0, 8)}...`);

    const analysis = await analyzeQuote(fullQuoteText);
    const improved = await improveQuote(fullQuoteText, analysis);

    await db.update(quotes)
      .set({ 
        analysis, 
        improved, 
        score: analysis.score,
        content: fullQuoteText,
        updatedAt: new Date()
      })
      .where(eq(quotes.id, quoteId));

    return NextResponse.json({ 
      message: 'Análisis completado',
      analysis,
      improved
    });

  } catch (error: any) {
    console.error('❌ Error en /analyze:', error.message);
    return NextResponse.json({ message: 'Error interno', error: error.message }, { status: 500 });
  }
}
