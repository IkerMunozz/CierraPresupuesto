import { db } from '@/lib/db';
import { subscriptions, users } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';
import Stripe from 'stripe';
export { PLANS, type PlanKey } from './plans-config';
import { PLANS, PlanKey } from './plans-config';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2024-12-18.acacia',
});

export async function getUserSubscription(userId: string) {
  const subs = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.userId, userId))
    .orderBy(desc(subscriptions.createdAt))
    .limit(1)
    .then((rows) => rows[0]);

  if (!subs) {
    // Create free subscription
    const [newSub] = await db
      .insert(subscriptions)
      .values({
        id: crypto.randomUUID(),
        userId,
        plan: 'free',
        status: 'active',
      })
      .returning();
    return newSub;
  }

  return subs;
}

export async function getUserPlan(userId: string): Promise<PlanKey> {
  const sub = await getUserSubscription(userId);
  return sub.plan as PlanKey;
}

export function hasAI(userId: string, plan: PlanKey): boolean {
  return PLANS[plan].features.ai;
}

export function canUseAI(userId: string): boolean {
  return true; // Will be checked dynamically
}

export async function createStripeCheckoutSession(
  userId: string,
  priceId: string,
  successUrl: string,
  cancelUrl: string,
) {
  const user = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .then((r) => r[0]);

  if (!user) throw new Error('User not found');

  let customerId = await getUserSubscription(userId).then((s) => s.stripeCustomerId);

  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email || undefined,
      name: user.name || undefined,
      metadata: { userId: user.id },
    });
    customerId = customer.id;
  }

  const separator = successUrl.includes('?') ? '&' : '?';
  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    payment_method_types: ['card'],
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    mode: 'subscription',
    success_url: `${successUrl}${separator}session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: cancelUrl,
    metadata: { userId },
  });

  return session;
}

export async function cancelStripeSubscription(subscriptionId: string) {
  return stripe.subscriptions.update(subscriptionId, {
    cancel_at_period_end: true,
  });
}

export async function handleStripeWebhook(body: string, signature: string) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) throw new Error('Missing webhook secret');

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    throw new Error(`Webhook signature verification failed: ${err}`);
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.userId;
      if (!userId) break;

      const subscriptionId = session.subscription as string;
      const sub = await stripe.subscriptions.retrieve(subscriptionId);
      const priceId = sub.items.data[0]?.price.id;

      let plan: PlanKey = 'pro';
      if (priceId === process.env.STRIPE_BUSINESS_PRICE_ID) plan = 'business';
      else if (priceId === process.env.STRIPE_PRO_PRICE_ID) plan = 'pro';

      await db
        .insert(subscriptions)
        .values({
          id: subscriptionId,
          userId,
          stripeCustomerId: session.customer as string,
          stripeSubscriptionId: subscriptionId,
          plan,
          status: 'active',
          currentPeriodStart: new Date(sub.current_period_start * 1000),
          currentPeriodEnd: new Date(sub.current_period_end * 1000),
        })
        .onConflictDoUpdate({
          target: subscriptions.id,
          set: {
            plan,
            status: 'active',
            currentPeriodStart: new Date(sub.current_period_start * 1000),
            currentPeriodEnd: new Date(sub.current_period_end * 1000),
          },
        });
      break;
    }

    case 'customer.subscription.updated': {
      const sub = event.data.object as Stripe.Subscription;
      await db
        .update(subscriptions)
        .set({
          status: sub.status === 'active' ? 'active' : sub.status === 'past_due' ? 'past_due' : 'canceled',
          currentPeriodStart: new Date(sub.current_period_start * 1000),
          currentPeriodEnd: new Date(sub.current_period_end * 1000),
          cancelAtPeriodEnd: sub.cancel_at_period_end ? 1 : 0,
        })
        .where(eq(subscriptions.stripeSubscriptionId, sub.id));
      break;
    }

    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription;
      await db
        .update(subscriptions)
        .set({ plan: 'free', status: 'canceled' })
        .where(eq(subscriptions.stripeSubscriptionId, sub.id));
      break;
    }
  }

  return { received: true };
}
