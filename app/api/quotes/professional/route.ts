import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { quotes, quoteLines, companies, clients } from '@/lib/db/schema';
import { ProfessionalQuoteSchema } from '@/lib/domain/professionalQuoteSchemas';
import { analyzeQuote, improveQuote } from '@/lib/quoteEngine';
import { getUserPlan, PLANS } from '@/lib/plans';
import { eq } from 'drizzle-orm';

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ message: 'No autorizado' }, { status: 401 });

  try {
    const body = await req.json();
    const validated = ProfessionalQuoteSchema.parse(body);

    const company = await db.query.companies.findFirst({ where: eq(companies.id, validated.companyId) });
    const client = await db.query.clients.findFirst({ where: eq(clients.id, validated.clientId) });

    const clientName = client?.name || 'Cliente';

    // 1. Crear el presupuesto (cabecera)
    const [newQuote] = await db.insert(quotes).values({
      userId: session.user.id,
      companyId: validated.companyId,
      clientId: validated.clientId,
      title: `Presupuesto para ${clientName}`,
      clientName: clientName,
      status: 'draft',
      serviceType: 'Presupuesto Profesional',
      date: new Date(validated.date),
      validUntil: validated.validUntil ? new Date(validated.validUntil) : null,
      paymentMethod: validated.paymentMethod,
      observations: validated.observations,
      context: validated.internalNotes,
    }).returning();

    // 2. Crear las líneas
    let totalValue = 0;
    const linesDescription = validated.lines.map(l => {
      const lineTotal = l.quantity * l.unitPrice * (1 + l.iva / 100);
      totalValue += lineTotal;
      return `- ${l.name}: ${l.quantity} x ${l.unitPrice}€ (Total con IVA: ${lineTotal.toFixed(2)}€). ${l.description || ''}`;
    }).join('\n');

    if (validated.lines.length > 0) {
      const linesToInsert = validated.lines.map(line => {
        const base = line.quantity * line.unitPrice;
        const disc = base * (line.discount / 100);
        const sub = base - disc;
        const tax = sub * (line.iva / 100);
        const total = sub + tax;

        return {
          quoteId: newQuote.id,
          conceptId: line.conceptId,
          name: line.name,
          description: line.description,
          quantity: line.quantity.toString(),
          unitPrice: line.unitPrice.toString(),
          discount: line.discount.toString(),
          iva: line.iva,
          totalAmount: total.toFixed(2),
        };
      });

      await db.insert(quoteLines).values(linesToInsert);
    }

    // 3. Análisis de IA
    const plan = await getUserPlan(session.user.id);
    console.log(`🔍 Plan detectado para el usuario ${session.user.id}: ${plan}`);

    let finalQuote = newQuote;

    if (PLANS[plan].features.ai) {
      const fullQuoteText = `
        Presupuesto de: ${company?.name || 'Empresa'}
        Para: ${clientName}
        Conceptos:
        ${linesDescription}
        Total Presupuestado: ${totalValue.toFixed(2)}€
        Observaciones: ${validated.observations || 'Ninguna'}
      `;

      try {
        console.log('🤖 Iniciando análisis de IA...');
        const analysis = await analyzeQuote(fullQuoteText);
        const improved = await improveQuote(fullQuoteText, analysis);

        const [updatedQuote] = await db.update(quotes)
          .set({ 
            analysis, 
            improved,
            score: analysis.score,
            content: fullQuoteText 
          })
          .where(eq(quotes.id, newQuote.id))
          .returning();
        
        finalQuote = updatedQuote;
        console.log('✅ Análisis de IA completado y guardado');
      } catch (aiError: any) {
        console.error('❌ Error en análisis de IA:', aiError.message);
      }
    } else {
      console.log('⚠️ El plan actual no tiene activada la IA');
    }

    return NextResponse.json(finalQuote);
  } catch (error: any) {
    console.error('❌ Error general en /api/quotes/professional:', error);
    return NextResponse.json({ message: 'Error interno', error: error.message }, { status: 500 });
  }
}
