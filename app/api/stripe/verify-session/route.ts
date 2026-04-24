import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import Stripe from 'stripe';
import { db } from '@/lib/db';
import { subscriptions } from '@/lib/db/schema';
import { PLANS, PlanKey } from '@/lib/plans-config';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2026-03-25.dahlia',
});

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const sessionId = searchParams.get('session_id');

  if (!sessionId) {
    return NextResponse.json({ error: 'Falta session_id' }, { status: 400 });
  }

  try {
    const checkoutSession = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['subscription'],
    });

    console.log('Verify Session - Status:', checkoutSession.status);

    if (checkoutSession.status === 'complete' && checkoutSession.metadata?.userId === session.user.id) {
      const sub = checkoutSession.subscription as Stripe.Subscription;
      
      // Logs para depuración de fechas
      console.log('Stripe Sub Dates:', {
        start: sub.current_period_start,
        end: sub.current_period_end
      });

      const priceId = sub.items.data[0]?.price.id;

      let plan: PlanKey = 'pro';
      if (priceId === process.env.STRIPE_BUSINESS_PRICE_ID) plan = 'business';
      else if (priceId === process.env.STRIPE_PRO_PRICE_ID) plan = 'pro';

      // Conversión segura de fechas
      const safeDate = (ts: number | null | undefined) => {
        if (!ts || isNaN(ts)) return null;
        const d = new Date(ts * 1000);
        return isNaN(d.getTime()) ? null : d;
      };

      const startDate = safeDate(sub.current_period_start);
      const endDate = safeDate(sub.current_period_end);

      const data = {
        plan,
        status: 'active' as const,
        currentPeriodStart: startDate,
        currentPeriodEnd: endDate,
        stripeCustomerId: checkoutSession.customer as string,
        stripeSubscriptionId: sub.id,
      };

      // Sincronizar inmediatamente
      await db
        .insert(subscriptions)
        .values({
          id: sub.id,
          userId: session.user.id,
          ...data
        })
        .onConflictDoUpdate({
          target: subscriptions.id,
          set: data,
        });

      console.log('✅ Subscription synced manually for user:', session.user.id);
      return NextResponse.json({ success: true, plan });
    }

    return NextResponse.json({ success: false, message: 'Session incomplete' });
  } catch (error) {
    console.error('Verify session error:', error);
    return NextResponse.json({ 
      error: 'Error al verificar la sesión',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
