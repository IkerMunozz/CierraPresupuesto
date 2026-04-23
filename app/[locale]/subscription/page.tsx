'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { redirect } from 'next/navigation';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import { PLANS, PlanKey } from '@/lib/plans-config';

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

function PlanCard({
  planKey,
  currentPlan,
  onUpgrade,
  loading,
}: {
  planKey: PlanKey;
  currentPlan: PlanKey;
  onUpgrade: (plan: PlanKey) => void;
  loading: boolean;
}) {
  const plan = PLANS[planKey];
  const isCurrent = currentPlan === planKey;
  const isPopular = planKey === 'pro';

  return (
    <div
      className={`relative flex flex-col rounded-3xl border p-8 transition-all duration-300 ${
        isPopular
          ? 'border-blue-600 bg-white shadow-xl shadow-blue-100 ring-1 ring-blue-600'
          : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-lg'
      }`}
    >
      {isPopular && (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2 rounded-full bg-blue-600 px-4 py-1 text-xs font-bold uppercase tracking-wider text-white">
          Más Popular
        </div>
      )}

      <div className="mb-8">
        <h3 className="text-xl font-bold text-slate-900">{plan.name}</h3>
        <p className="mt-2 text-sm text-slate-500 min-h-[40px]">{plan.description}</p>
        <div className="mt-6 flex items-baseline gap-1">
          <span className="text-4xl font-extrabold tracking-tight text-slate-900">{PRICES_DISPLAY[planKey]}€</span>
          <span className="text-sm font-semibold text-slate-500">/mes</span>
        </div>
      </div>

      <ul className="mb-8 space-y-4 flex-1">
        <li className="flex items-start gap-3">
          <CheckIcon className={`h-5 w-5 shrink-0 ${plan.features.ai ? 'text-green-500' : 'text-slate-300'}`} />
          <span className={`text-sm ${plan.features.ai ? 'text-slate-700 font-medium' : 'text-slate-400'}`}>
            IA para generación y análisis
          </span>
        </li>
        <li className="flex items-start gap-3 text-slate-700">
          <CheckIcon className="h-5 w-5 shrink-0 text-green-500" />
          <span className="text-sm">
            {plan.features.maxQuotes === -1 ? (
              <span className="font-semibold text-slate-900">Presupuestos ilimitados</span>
            ) : (
              `Hasta ${plan.features.maxQuotes} presupuestos / mes`
            )}
          </span>
        </li>
        <li className="flex items-start gap-3 text-slate-700">
          <CheckIcon className="h-5 w-5 shrink-0 text-green-500" />
          <span className="text-sm">
            {plan.features.maxClients === -1 ? (
              <span className="font-semibold text-slate-900">Clientes ilimitados</span>
            ) : (
              `Hasta ${plan.features.maxClients} clientes`
            )}
          </span>
        </li>
        <li className="flex items-start gap-3">
          <CheckIcon className={`h-5 w-5 shrink-0 ${plan.features.proTemplates ? 'text-green-500' : 'text-slate-300'}`} />
          <span className={`text-sm ${plan.features.proTemplates ? 'text-slate-700' : 'text-slate-400'}`}>
            Plantillas profesionales
          </span>
        </li>
        <li className="flex items-start gap-3">
          <CheckIcon className={`h-5 w-5 shrink-0 ${plan.features.prioritySupport ? 'text-green-500' : 'text-slate-300'}`} />
          <span className={`text-sm ${plan.features.prioritySupport ? 'text-slate-700' : 'text-slate-400'}`}>
            Soporte prioritario
          </span>
        </li>
      </ul>

      {isCurrent ? (
        <div className="w-full rounded-2xl bg-slate-100 py-3 text-center text-sm font-bold text-slate-600">
          Tu plan actual
        </div>
      ) : (
        <button
          onClick={() => onUpgrade(planKey)}
          disabled={loading || planKey === 'free'}
          className={`w-full rounded-2xl py-3 text-sm font-bold transition-all active:scale-[0.98] disabled:opacity-50 ${
            isPopular
              ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-md shadow-blue-200'
              : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
          }`}
        >
          {loading ? 'Procesando...' : planKey === 'free' ? 'Plan Inicial' : `Mejorar a ${plan.name}`}
        </button>
      )}
    </div>
  );
}

export default function SubscriptionPage() {
  const { data: session, status } = useSession();
  const [upgradingPlan, setUpgradingPlan] = useState<PlanKey | null>(null);
  const [currentPlan, setCurrentPlan] = useState<PlanKey>('free');

  useEffect(() => {
    if (session?.user) {
      fetch('/api/stripe/subscription')
        .then((res) => res.json())
        .then((data) => {
          if (data.plan) {
            setCurrentPlan(data.plan as PlanKey);
          }
        })
        .catch(() => {});
    }
  }, [session]);

  if (status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  if (status === 'unauthenticated') {
    redirect('/login');
  }

  const handleUpgrade = async (plan: PlanKey) => {
    if (!plan || plan === 'free') return;
    setUpgradingPlan(plan);

    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan }),
      });

      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert(data.error || 'Error al procesar el pago');
      }
    } catch (e) {
      alert('Error al conectar con la pasarela de pago');
    } finally {
      setUpgradingPlan(null);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <SiteHeader />
      
      <main className="flex-grow px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-16 text-center">
            <h2 className="text-sm font-bold uppercase tracking-widest text-blue-600">Precios</h2>
            <h1 className="mt-3 text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl">
              Haz crecer tu negocio
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-600">
              Escoge el plan que mejor se adapte a tu volumen de trabajo. Todos los planes incluyen actualizaciones gratuitas.
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-3">
            <PlanCard 
              planKey="free" 
              currentPlan={currentPlan} 
              onUpgrade={handleUpgrade} 
              loading={upgradingPlan !== null}
            />
            <PlanCard 
              planKey="pro" 
              currentPlan={currentPlan} 
              onUpgrade={handleUpgrade} 
              loading={upgradingPlan === 'pro'}
            />
            <PlanCard 
              planKey="business" 
              currentPlan={currentPlan} 
              onUpgrade={handleUpgrade} 
              loading={upgradingPlan === 'business'}
            />
          </div>

          <div className="mt-16 rounded-[2.5rem] border border-slate-200 bg-white p-8 text-center sm:p-12">
            <h3 className="text-xl font-bold text-slate-900">¿Necesitas algo a medida?</h3>
            <p className="mt-2 text-slate-600">
              Para equipos de más de 10 personas o necesidades específicas de integración.
            </p>
            <a
              href="mailto:ventas@cierrapresupuesto.com"
              className="mt-6 inline-flex items-center font-semibold text-blue-600 hover:text-blue-700"
            >
              Contactar con ventas <span className="ml-1 text-xl">→</span>
            </a>
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
