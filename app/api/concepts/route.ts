import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { concepts } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { ConceptSchema } from '@/lib/domain/professionalQuoteSchemas';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ message: 'No autorizado' }, { status: 401 });

  try {
    const data = await db.select().from(concepts).where(eq(concepts.userId, session.user.id));
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ message: 'Error al obtener conceptos' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ message: 'No autorizado' }, { status: 401 });

  try {
    const body = await req.json();
    const validated = ConceptSchema.parse(body);

    const [newConcept] = await db.insert(concepts).values({
      ...validated,
      userId: session.user.id,
    }).returning();

    return NextResponse.json(newConcept);
  } catch (error) {
    return NextResponse.json({ message: 'Error al crear concepto' }, { status: 400 });
  }
}
