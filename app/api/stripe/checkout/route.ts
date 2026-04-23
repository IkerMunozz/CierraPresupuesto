import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createStripeCheckoutSession, PLANS, PlanKey } from '@/lib/plans';

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const body = await request.json();
  const plan = body.plan as PlanKey;

  if (!plan || !PLANS[plan]) {
    return NextResponse.json({ error: 'Plan inválido' }, { status: 400 });
  }

  const planConfig = PLANS[plan];
  if (!planConfig.priceId) {
    return NextResponse.json({ error: 'Price ID no configurado' }, { status: 500 });
  }

  const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';

  try {
    const checkoutSession = await createStripeCheckoutSession(
      session.user.id,
      planConfig.priceId,
      `${baseUrl}/subscription?success=true`,
      `${baseUrl}/subscription?canceled=true`,
    );

    return NextResponse.json({ url: checkoutSession.url });
  } catch (error) {
    console.error('Stripe checkout error:', error);
    return NextResponse.json({ error: 'Error al crear la sesión de pago' }, { status: 500 });
  }
}
