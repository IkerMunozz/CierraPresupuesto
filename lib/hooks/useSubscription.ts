'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';
import { PLANS, type PlanKey } from '@/lib/plans-config';

export type SubscriptionInfo = {
  plan: PlanKey;
  status: string;
};

type SubscriptionResponse = SubscriptionInfo | { error: string };

export function formatPlanLabel(plan: PlanKey) {
  return PLANS[plan]?.name ?? 'Free';
}

export function getPlanTone(plan: PlanKey): 'slate' | 'blue' | 'purple' {
  if (plan === 'business') return 'purple';
  if (plan === 'pro') return 'blue';
  return 'slate';
}

export function useSubscription() {
  const { data: session, status: sessionStatus } = useSession();
  const enabled = sessionStatus === 'authenticated' && !!session?.user?.id;

  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
  const [loading, setLoading] = useState<boolean>(enabled);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!enabled) {
      setSubscription(null);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/stripe/subscription', { cache: 'no-store' });
      const data = (await res.json().catch(() => null)) as SubscriptionResponse | null;

      if (!res.ok) {
        setSubscription(null);
        setError('No se pudo cargar la suscripción');
        return;
      }

      if (!data || 'error' in data) {
        setSubscription(null);
        setError('No se pudo cargar la suscripción');
        return;
      }

      const planKey = data.plan;
      if (!planKey || !(planKey in PLANS)) {
        setSubscription(null);
        setError('Suscripción inválida');
        return;
      }

      setSubscription({ plan: planKey, status: data.status });
    } catch {
      setSubscription(null);
      setError('No se pudo cargar la suscripción');
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const plan = subscription?.plan ?? 'free';
  const label = useMemo(() => formatPlanLabel(plan), [plan]);
  const tone = useMemo(() => getPlanTone(plan), [plan]);

  return { subscription, plan, label, tone, loading, error, refresh, enabled };
}

