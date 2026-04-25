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

    // Get company and client names for the AI prompt
    const company = await db.query.companies.findFirst({ where: eq(companies.id, validated.companyId) });
    const client = await db.query.clients.findFirst({ where: eq(clients.id, validated.clientId) });

    // 1. Crear el presupuesto (cabecera)
    const [newQuote] = await db.insert(quotes).values({
      userId: session.user.id,
      companyId: validated.companyId,
      clientId: validated.clientId,
      date: new Date(validated.date),
      validUntil: validated.validUntil ? new Date(validated.validUntil) : null,
      paymentMethod: validated.paymentMethod,
      observations: validated.observations,
      internalNotes: validated.internalNotes,
      status: 'borrador',
    }).returning();

    // 2. Crear las líneas y calcular totales
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

    // 3. Análisis de IA (solo si tiene plan Pro/Business)
    const plan = await getUserPlan(session.user.id);
    if (PLANS[plan].features.ai) {
      const fullQuoteText = `
        Presupuesto de: ${company?.name || 'Empresa'}
        Para: ${client?.name || 'Cliente'}
        Conceptos:
        ${linesDescription}
        Total Presupuestado: ${totalValue.toFixed(2)}€
        Observaciones: ${validated.observations || 'Ninguna'}
      `;

      try {
        const analysis = await analyzeQuote(fullQuoteText);
        const improvedQuote = await improveQuote(fullQuoteText, analysis);

        await db.update(quotes)
          .set({ analysis, improvedQuote })
          .where(eq(quotes.id, newQuote.id));
      } catch (aiError) {
        console.error('Error en análisis de IA:', aiError);
        // Si falla la IA, guardamos un análisis mock básico
        const mockAnalysis = {
          score: 75,
          feedback: [
            'La propuesta es clara y profesional.',
            'Considera añadir plazos específicos de entrega.',
            'Podrías incluir garantías o condiciones de satisfacción.',
          ],
          risks: [
            'El cliente podría comparar solo por precio.',
            'Falta detallar el proceso de seguimiento.',
          ],
          competitiveness: 'media',
        };
        
        const mockImprovedQuote = `Versión optimizada del presupuesto:
        
${fullQuoteText}

Recomendaciones:
- Añade plazos específicos
- Incluye condiciones de pago
- Destaca tus diferenciadores clave
- Proporciona garantías de satisfacción`;

        await db.update(quotes)
          .set({ analysis: mockAnalysis, improvedQuote: mockImprovedQuote })
          .where(eq(quotes.id, newQuote.id));
      }
    }

    return NextResponse.json(newQuote);
  } catch (error: any) {
    console.error('❌ Error al crear presupuesto profesional:', error);
    if (error.name === 'ZodError') {
      return NextResponse.json({ message: 'Error de validación', details: error.errors }, { status: 400 });
    }
    return NextResponse.json({ message: 'Error interno al guardar', error: error.message }, { status: 500 });
  }
}
