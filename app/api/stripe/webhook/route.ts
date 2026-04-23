import { NextResponse } from 'next/server';
import { handleStripeWebhook } from '@/lib/plans';

export async function POST(request: Request) {
  const body = await request.text();
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
  }

  try {
    const result = await handleStripeWebhook(body, signature);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Webhook error' }, { status: 400 });
  }
}
