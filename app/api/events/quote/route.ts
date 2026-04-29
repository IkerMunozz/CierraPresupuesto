import { NextResponse } from 'next/server';
import { emitEvent, QuoteEventType } from '@/lib/db/events';
import { QUOTE_EVENT_TYPES } from '@/lib/db/eventTypes';
import { z } from 'zod';

const validEventTypes = [
  QUOTE_EVENT_TYPES.CREATED,
  QUOTE_EVENT_TYPES.SENT,
  QUOTE_EVENT_TYPES.VIEWED,
  QUOTE_EVENT_TYPES.ACCEPTED,
  QUOTE_EVENT_TYPES.REJECTED,
] as const;

const emitEventSchema = z.object({
  type: z.enum(validEventTypes, {
    errorMap: () => ({ message: 'Tipo de evento inválido. Use: QUOTE_CREATED, QUOTE_SENT, QUOTE_VIEWED, QUOTE_ACCEPTED, QUOTE_REJECTED' }),
  }),
  quoteId: z.string().min(1, 'quoteId es requerido'),
  metadata: z.record(z.unknown()).optional(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validation = emitEventSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { message: 'Datos inválidos.', errors: validation.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { type, quoteId, metadata } = validation.data;

    // Log para debug
    console.log('Emitiendo evento:', { type, quoteId, metadata });

    try {
      await emitEvent(type as QuoteEventType, quoteId, metadata);
    } catch (emitError) {
      console.error('Error en emitEvent:', emitError);
      return NextResponse.json(
        { message: 'Error al emitir evento', error: String(emitError) },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { message: 'Evento registrado correctamente.' },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error al registrar evento:', error);
    return NextResponse.json(
      { message: 'Error interno del servidor.', error: String(error) },
      { status: 500 }
    );
  }
}
