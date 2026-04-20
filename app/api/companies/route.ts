import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { companies } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { CompanySchema } from '@/lib/domain/professionalQuoteSchemas';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ message: 'No autorizado' }, { status: 401 });

  try {
    const data = await db.select().from(companies).where(eq(companies.userId, session.user.id));
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ message: 'Error al obtener empresas' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ message: 'No autorizado' }, { status: 401 });

  try {
    const body = await req.json();
    const validated = CompanySchema.parse(body);

    const [newCompany] = await db.insert(companies).values({
      ...validated,
      userId: session.user.id,
    }).returning();

    return NextResponse.json(newCompany);
  } catch (error) {
    return NextResponse.json({ message: 'Error al crear empresa' }, { status: 400 });
  }
}
