import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

export async function POST(req: Request) {
  try {
    const { name, email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    const [existingUser] = await db.select().from(users).where(eq(users.email, email.toLowerCase()));

    if (existingUser) {
      return NextResponse.json({ error: 'User already exists' }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    try {
      const [newUser] = await db.insert(users).values({
        id: uuidv4(),
        name,
        email: email.toLowerCase(),
        password: hashedPassword,
      }).returning();

      console.log('✅ Usuario registrado con éxito:', newUser.email);
      return NextResponse.json({ user: { id: newUser.id, email: newUser.email, name: newUser.name } });
    } catch (dbError) {
      console.error('❌ Error insertando usuario en la DB:', dbError);
      return NextResponse.json({ error: 'Error al guardar el usuario en la base de datos.' }, { status: 500 });
    }
  } catch (error) {
    console.error('❌ Registration error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
