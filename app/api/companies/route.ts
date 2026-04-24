import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { companies } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { CompanySchema } from '@/lib/domain/professionalQuoteSchemas';
import { z } from 'zod';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ message: 'No autorizado' }, { status: 401 });

  try {
    const data = await db.select().from(companies).where(eq(companies.userId, session.user.id));
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching companies:', error);
    return NextResponse.json({ message: 'Error al obtener empresas' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ message: 'No autorizado' }, { status: 401 });

  try {
    const body = await req.json();
    console.log('POST /api/companies - Body:', body);
    const validated = CompanySchema.parse(body);

    const [newCompany] = await db.insert(companies).values({
      ...validated,
      userId: session.user.id,
    }).returning();

    return NextResponse.json(newCompany);
  } catch (error) {
    console.error('Error creating company:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: 'Error de validación', errors: error.errors }, { status: 400 });
    }
    if (error instanceof Error) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }
    return NextResponse.json({ message: 'Error al crear empresa' }, { status: 400 });
  }
}
