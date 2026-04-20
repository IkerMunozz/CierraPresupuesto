import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { quotes, quoteLines } from '@/lib/db/schema';
import { ProfessionalQuoteSchema } from '@/lib/domain/professionalQuoteSchemas';

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ message: 'No autorizado' }, { status: 401 });

  try {
    const body = await req.json();
    console.log('📦 Recibiendo datos de presupuesto:', JSON.stringify(body, null, 2));
    
    const validated = ProfessionalQuoteSchema.parse(body);

    // 1. Crear el presupuesto (cabecera)
    console.log('🚀 Insertando cabecera de presupuesto...');
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

    console.log('✅ Cabecera creada con ID:', newQuote.id);

    // 2. Crear las líneas
    if (validated.lines.length > 0) {
      console.log(`📝 Insertando ${validated.lines.length} líneas...`);
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
      console.log('✅ Líneas insertadas con éxito.');
    }

    return NextResponse.json(newQuote);
  } catch (error: any) {
    console.error('❌ Error al crear presupuesto profesional:', error);
    if (error.name === 'ZodError') {
      console.error('⚠️ Detalles de validación Zod:', error.errors);
      return NextResponse.json({ message: 'Error de validación', details: error.errors }, { status: 400 });
    }
    return NextResponse.json({ message: 'Error interno al guardar', error: error.message }, { status: 500 });
  }
}
