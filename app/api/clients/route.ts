import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { clients } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { ClientSchema } from '@/lib/domain/professionalQuoteSchemas';
import { z } from 'zod';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ message: 'No autorizado' }, { status: 401 });

  try {
    const data = await db.select().from(clients).where(eq(clients.userId, session.user.id));
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ message: 'Error al obtener clientes' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  console.log('POST /api/clients - Session:', JSON.stringify(session));
  
  if (!session?.user?.id) {
    console.error('POST /api/clients - No user ID in session');
    return NextResponse.json({ message: 'No autorizado' }, { status: 401 });
  }

  try {
    const body = await req.json();
    console.log('POST /api/clients - Body:', body);
    const validated = ClientSchema.parse(body);

    const [newClient] = await db.insert(clients).values({
      ...validated,
      userId: session.user.id,
    }).returning();

    return NextResponse.json(newClient);
  } catch (error) {
    console.error('Error creating client:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: 'Error de validación', errors: error.errors }, { status: 400 });
    }
    if (error instanceof Error) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }
    return NextResponse.json({ message: 'Error al crear cliente' }, { status: 400 });
  }
}
