import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { subscriptions, users } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2026-03-25.dahlia',
});

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';

  try {
    const userId = session.user.id;

    const user = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .then((r) => r[0]);

    if (!user) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    const latestSub = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.userId, userId))
      .orderBy(desc(subscriptions.createdAt))
      .limit(1)
      .then((rows) => rows[0]);

    let customerId = latestSub?.stripeCustomerId ?? null;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email || undefined,
        name: user.name || undefined,
        metadata: { userId },
      });

      customerId = customer.id;

      if (latestSub) {
        await db
          .update(subscriptions)
          .set({ stripeCustomerId: customerId })
          .where(eq(subscriptions.id, latestSub.id));
      } else {
        await db.insert(subscriptions).values({
          id: crypto.randomUUID(),
          userId,
          plan: 'free',
          status: 'active',
          stripeCustomerId: customerId,
        });
      }
    }

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${baseUrl}/subscription`,
    });

    return NextResponse.json({ url: portalSession.url });
  } catch (error) {
    console.error('Stripe portal error:', error);
    return NextResponse.json({ error: 'Error al abrir el portal de facturación' }, { status: 500 });
  }
}

