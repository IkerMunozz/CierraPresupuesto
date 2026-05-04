import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { quotes, quoteLines, companies, clients } from '@/lib/db/schema';
import { ProfessionalQuoteSchema } from '@/lib/domain/professionalQuoteSchemas';
import { generateEnterpriseQuote } from '@/lib/quoteEngine';
import { getUserPlan, PLANS } from '@/lib/plans';
import { emitQuoteCreated } from '@/lib/db/events';
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

    // 1. Crear el presupuesto inicial
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

    // 2. Líneas y preparación de contexto para IA
    let totalValue = 0;
    let itemsDescription = "";
    const linesToInsert = validated.lines.map(line => {
      const lineTotal = line.quantity * line.unitPrice * (1 + line.iva / 100);
      totalValue += lineTotal;
      itemsDescription += `- ${line.name}: ${line.description || ''} (${line.quantity} x ${line.unitPrice}€)\n`;
      
      return {
        quoteId: newQuote.id,
        name: line.name,
        description: line.description,
        quantity: line.quantity.toString(),
        unitPrice: line.unitPrice.toString(),
        iva: line.iva,
        totalAmount: lineTotal.toFixed(2),
      };
    });
    
     if (linesToInsert.length > 0) await db.insert(quoteLines).values(linesToInsert);

    // 2.5. Emitir evento de creación
    await emitQuoteCreated(newQuote.id, {
      clientName: clientName,
      companyId: validated.companyId,
      totalValue: totalValue,
    });

    // 3. IA Enterprise (Solo si el plan lo permite)
    const plan = await getUserPlan(session.user.id);
    const hasAI = PLANS[plan].features.ai;
    const isFree = plan === 'free';
    
    let finalQuote = newQuote;
    
    // Generar contenido básico del presupuesto para mostrar siempre algo
    const basicContent = `Presupuesto para ${clientName}

Servicios:
${itemsDescription}

Total: ${totalValue.toFixed(2)}€
Método de pago: ${validated.paymentMethod}
Observaciones: ${validated.observations || 'Ninguna'}`;

    if (hasAI) {
      console.log(`🚀 Iniciando pipeline Enterprise para Presupuesto Profesional (Plan ${plan})...`);
      
      try {
        // Mapeamos los datos profesionales al formato que entiende el motor de IA
        const aiResult = await generateEnterpriseQuote({
          serviceType: validated.lines.map(l => l.name).join(', '),
          description: itemsDescription,
          price: `${totalValue.toFixed(2)}€`,
          clientType: client?.taxId ? `Empresa — ${client.name}` : `Particular — ${client.name}`,
          context: `Cliente: ${client?.name || 'No especificado'}. Notas: ${validated.observations || 'Sin observaciones'}. Método de pago: ${validated.paymentMethod || 'No definido'}. Empresa emisora: ${company?.name || 'No especificada'}.`
        });

        const [updatedQuote] = await db.update(quotes)
          .set({ 
            analysis: aiResult.analysis, 
            improved: aiResult.improvedQuote, 
            score: aiResult.analysis.score, 
            content: aiResult.quote 
          })
          .where(eq(quotes.id, newQuote.id))
          .returning();
        
        finalQuote = updatedQuote;
        console.log('✅ Pipeline IA finalizado con éxito');
      } catch (e) {
        console.error('❌ Error en pipeline IA:', e);
        // Guardar contenido básico aunque falle la IA
        const [fallbackQuote] = await db.update(quotes)
          .set({ 
            content: basicContent,
            score: 50,
            analysis: {
              score: 50,
              feedback: ['Análisis no disponible debido a un error técnico. Por favor, intenta generar el presupuesto nuevamente.'],
              risks: ['Sin análisis de riesgos disponible'],
              competitiveness: 'media'
            }
          })
          .where(eq(quotes.id, newQuote.id))
          .returning();
        finalQuote = fallbackQuote;
      }
    } else {
      // Para usuarios free, guardar contenido básico
      const [basicQuote] = await db.update(quotes)
        .set({ content: basicContent })
        .where(eq(quotes.id, newQuote.id))
        .returning();
      finalQuote = basicQuote;
    }

    return NextResponse.json({ ...finalQuote, isFree });
  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json({ message: 'Error interno', error: error.message }, { status: 500 });
  }
}
