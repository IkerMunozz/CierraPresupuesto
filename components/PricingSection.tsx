'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';
import { PLANS, type PlanKey } from '@/lib/plans-config';
import { useSubscription } from '@/lib/hooks/useSubscription';


const PRICES_DISPLAY: Record<PlanKey, string> = {
  free: '0',
  pro: '4.99',
  business: '9.99',
};

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
    </svg>
  );
}

function FeatureRow({ enabled, children }: { enabled: boolean; children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-3">
      <CheckIcon className={`h-5 w-5 shrink-0 ${enabled ? 'text-emerald-500' : 'text-slate-300'}`} />
      <span className={`text-sm leading-6 ${enabled ? 'text-slate-700' : 'text-slate-400'}`}>{children}</span>
    </li>
  );
}

function PlanPill({ planKey, isCurrent }: { planKey: PlanKey; isCurrent: boolean }) {
  if (isCurrent) {
    return (
      <span className="inline-flex items-center rounded-full bg-emerald-50 px-3 py-1 text-xs font-extrabold text-emerald-700">
        Plan actual
      </span>
    );
  }

  if (planKey === 'pro') {
    return (
      <span className="inline-flex items-center rounded-full bg-blue-50 px-3 py-1 text-xs font-extrabold text-blue-700">
        Más popular
      </span>
    );
  }

  if (planKey === 'business') {
    return (
      <span className="inline-flex items-center rounded-full bg-purple-50 px-3 py-1 text-xs font-extrabold text-purple-700">
        Equipos
      </span>
    );
  }

  return null;
}

export default function PricingSection() {
  const { data: session, status } = useSession();
  const { plan: currentPlan, label: currentPlanLabel, loading: subLoading } = useSubscription();
  const [billing, setBilling] = useState<'monthly' | 'yearly'>('monthly');

  const isAuthed = status === 'authenticated' && !!session?.user;

  const yearlyMeta = useMemo(() => {
    const discount = 0.2;
    const yearly = (p: PlanKey) => {
      if (p === 'free') return { price: '0', note: 'Gratis' };
      const monthly = Number(PRICES_DISPLAY[p]);
      const annual = monthly * 12 * (1 - discount);
      return { price: annual.toFixed(0), note: 'Facturado anual' };
    };
    return { discount, yearly };
  }, []);

  const priceFor = (p: PlanKey) => {
    if (billing === 'monthly') return { amount: PRICES_DISPLAY[p], suffix: '/mes', note: 'Sin permanencia' };
    if (p === 'free') return { amount: '0', suffix: '', note: 'Gratis' };
    return { amount: yearlyMeta.yearly(p).price, suffix: '/año', note: `${Math.round(yearlyMeta.discount * 100)}% dto.` };
  };

  const plans: PlanKey[] = ['free', 'pro', 'business'];

  return (
    <section id="pricing" className="py-14">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-10">
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-slate-900 sm:text-3xl">Precios simples. Valor real.</h2>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-slate-600">
            Empieza gratis y sube de nivel cuando notes que conviertes más. Cambia o cancela cuando quieras.
          </p>

          <div className="mx-auto mt-6 inline-flex flex-wrap items-center justify-center gap-3 rounded-full border border-slate-200 bg-white px-5 py-2 text-sm font-semibold text-slate-700 shadow-soft">
            <span className="text-slate-500">Facturación</span>
            <button
              type="button"
              onClick={() => setBilling('monthly')}
              className={`rounded-full px-3 py-1 text-xs font-extrabold ${
                billing === 'monthly' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Mensual
            </button>
            <button
              type="button"
              onClick={() => setBilling('yearly')}
              className={`rounded-full px-3 py-1 text-xs font-extrabold ${
                billing === 'yearly' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Anual
            </button>
            {isAuthed && (
              <>
                <span className="mx-1 h-4 w-px bg-slate-200" />
                <span className="text-slate-500">Tu plan</span>
                <span className="font-extrabold text-slate-900">{subLoading ? 'Cargando…' : currentPlanLabel}</span>
              </>
            )}
          </div>
        </div>

        <div className="mt-10 grid gap-6 lg:grid-cols-3">
          {plans.map((planKey) => {
            const plan = PLANS[planKey];
            const isCurrent = isAuthed && currentPlan === planKey;
            const isPopular = planKey === 'pro';
            const price = priceFor(planKey);

            const primaryCtaHref = isAuthed ? '/subscription' : '/register';
            const primaryCtaLabel = isAuthed ? (isCurrent ? 'Gestionar plan' : `Elegir ${plan.name}`) : 'Crear cuenta gratis';

            return (
              <div
                key={planKey}
                className={`relative flex flex-col rounded-[2rem] border bg-white p-8 shadow-soft transition-all duration-300 ${
                  isPopular
                    ? 'border-blue-600 ring-1 ring-blue-600 shadow-xl shadow-blue-100'
                    : 'border-slate-200 hover:-translate-y-0.5 hover:border-slate-300'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-xl font-bold text-slate-900">{plan.name}</h3>
                    <p className="mt-2 text-sm text-slate-600 min-h-[40px]">{plan.description}</p>
                  </div>
                  <PlanPill planKey={planKey} isCurrent={isCurrent} />
                </div>

                <div className="mt-6 flex items-baseline gap-2">
                  <span className="text-4xl font-extrabold tracking-tight text-slate-900">{price.amount}€</span>
                  <span className="text-sm font-semibold text-slate-500">{price.suffix}</span>
                </div>
                <p className="mt-2 text-xs font-semibold text-slate-500">{price.note}</p>

                <ul className="mt-8 space-y-3">
                  <FeatureRow enabled={plan.features.ai}>IA para generación, análisis y mejora</FeatureRow>
                  <FeatureRow enabled={true}>
                    {plan.features.maxQuotes === -1 ? (
                      <span className="font-semibold text-slate-900">Presupuestos ilimitados</span>
                    ) : (
                      <>Hasta {plan.features.maxQuotes} presupuestos / mes</>
                    )}
                  </FeatureRow>
                  <FeatureRow enabled={true}>
                    {plan.features.maxClients === -1 ? (
                      <span className="font-semibold text-slate-900">Clientes ilimitados</span>
                    ) : (
                      <>Hasta {plan.features.maxClients} clientes</>
                    )}
                  </FeatureRow>
                  <FeatureRow enabled={plan.features.proTemplates}>Plantillas profesionales</FeatureRow>
                  <FeatureRow enabled={plan.features.customBranding}>Branding personalizable</FeatureRow>
                  <FeatureRow enabled={plan.features.prioritySupport}>Soporte prioritario</FeatureRow>
                </ul>

                <div className="mt-8 grid gap-3">
                  <Link
                    href={primaryCtaHref}
                    className={`inline-flex w-full items-center justify-center rounded-2xl px-5 py-3 text-sm font-bold transition active:scale-[0.98] ${
                      isPopular ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-md shadow-blue-200' : 'bg-slate-900 text-white hover:bg-slate-800'
                    }`}
                  >
                    {primaryCtaLabel}
                  </Link>

                  <div className="text-center text-xs text-slate-500">
                    {isAuthed ? (
                      <span>Checkout seguro con Stripe</span>
                    ) : (
                      <span>Sin tarjeta para empezar</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        

        <div className="mt-10 text-center">
          <p className="text-xs text-slate-500">
            {isAuthed ? (
              <>Gestiona tu suscripción desde la página de Suscripción.</>
            ) : (
              <>Crea tu cuenta gratis y decide después si quieres subir de plan.</>
            )}
          </p>
        </div>

        
      </div>
    </section>
  );
}

