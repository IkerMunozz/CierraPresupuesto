import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { clients } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { ClientSchema } from '@/lib/domain/professionalQuoteSchemas';
import { z } from 'zod';

export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return NextResponse.json({ message: 'No autorizado' }, { status: 401 });
  }

  const clientId = parseInt(params.id);
  if (isNaN(clientId)) {
    return NextResponse.json({ message: 'ID de cliente inválido' }, { status: 400 });
  }

  try {
    const body = await req.json();
    const validated = ClientSchema.parse(body);

    const [updatedClient] = await db
      .update(clients)
      .set({
        ...validated,
      })
      .where(and(eq(clients.id, clientId), eq(clients.userId, session.user.id)))
      .returning();

    if (!updatedClient) {
      return NextResponse.json({ message: 'Cliente no encontrado' }, { status: 404 });
    }

    return NextResponse.json(updatedClient);
  } catch (error) {
    console.error('Error updating client:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: 'Error de validación', errors: error.errors }, { status: 400 });
    }
    return NextResponse.json({ message: 'Error al actualizar cliente' }, { status: 400 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return NextResponse.json({ message: 'No autorizado' }, { status: 401 });
  }

  const clientId = parseInt(params.id);
  if (isNaN(clientId)) {
    return NextResponse.json({ message: 'ID de cliente inválido' }, { status: 400 });
  }

  try {
    const [deletedClient] = await db
      .delete(clients)
      .where(and(eq(clients.id, clientId), eq(clients.userId, session.user.id)))
      .returning();

    if (!deletedClient) {
      return NextResponse.json({ message: 'Cliente no encontrado' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Cliente eliminado correctamente' });
  } catch (error) {
    console.error('Error deleting client:', error);
    return NextResponse.json({ message: 'Error al eliminar cliente' }, { status: 400 });
  }
}
