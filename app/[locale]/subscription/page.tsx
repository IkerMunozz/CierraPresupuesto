'use client';

import { useEffect, useMemo, useState, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { redirect, useRouter } from 'next/navigation';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import { PLANS, PlanKey } from '@/lib/plans-config';
import { useSubscription } from '@/lib/hooks/useSubscription';
import { useSearchParams } from 'next/navigation';
import PlanComparisonTable from '@/components/PlanComparisonTable';

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

  // Jerarquía de planes para comparaciones
  const planHierarchy: Record<PlanKey, number> = {
    free: 0,
    pro: 1,
    business: 2,
  };

  const isLowerPlan = planHierarchy[currentPlan] > planHierarchy[planKey];
  const isDisabled = loading || isCurrent || isLowerPlan;

  const buttonText = useMemo(() => {
    if (loading) return 'Procesando...';
    if (isCurrent) return 'Tu plan actual';
    if (isLowerPlan) return 'Incluido con tu plan';
    if (planKey === 'business' && currentPlan === 'pro') return 'Actualizar plan';
    return `Mejorar a ${plan.name}`;
  }, [loading, isCurrent, isLowerPlan, planKey, currentPlan, plan.name]);

  return (
    <div
      className={`relative flex flex-col rounded-3xl border p-8 transition-all duration-300 ${
        isCurrent ? 'ring-2 ring-blue-600 border-blue-600' : ''
      } ${
        isPopular && !isCurrent && !isLowerPlan
          ? 'border-blue-600 bg-white shadow-xl shadow-blue-100 ring-1 ring-blue-600'
          : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-lg'
      }`}
    >
      {isCurrent && (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2 rounded-full bg-blue-600 px-4 py-1 text-xs font-bold uppercase tracking-wider text-white shadow-lg">
          Plan Contratado
        </div>
      )}
      {isPopular && !isCurrent && !isLowerPlan && (
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

      <button
        onClick={() => onUpgrade(planKey)}
        disabled={isDisabled}
        className={`w-full rounded-2xl py-3 text-sm font-bold transition-all active:scale-[0.98] disabled:opacity-50 ${
          isCurrent || isLowerPlan
            ? 'bg-slate-100 text-slate-600 cursor-default'
            : isPopular || planKey === 'business'
              ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-md shadow-blue-200'
              : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
        }`}
      >
        {buttonText}
      </button>
    </div>
  );
}

export default function SubscriptionPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [upgradingPlan, setUpgradingPlan] = useState<PlanKey | null>(null);
  const [openingPortal, setOpeningPortal] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const { plan: currentPlan, label: currentPlanLabel, subscription, refresh } = useSubscription();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const hasVerified = useRef(false);

  const statusLabel = useMemo(() => {
    if (!subscription?.status) return null;
    if (subscription.status === 'active') return { text: 'Activa', tone: 'green' as const };
    if (subscription.status === 'past_due') return { text: 'Pago pendiente', tone: 'amber' as const };
    if (subscription.status === 'trialing') return { text: 'En prueba', tone: 'blue' as const };
    if (subscription.status === 'canceled') return { text: 'Cancelada', tone: 'slate' as const };
    return { text: subscription.status, tone: 'slate' as const };
  }, [subscription?.status]);

  useEffect(() => {
    if (sessionId && !verifying && !hasVerified.current) {
      const verify = async () => {
        setVerifying(true);
        hasVerified.current = true;
        try {
          const res = await fetch(`/api/stripe/verify-session?session_id=${sessionId}`);
          if (res.ok) {
            await refresh();
            setShowSuccessMessage(true);
            // Limpiar la URL para evitar re-ejecución
            router.replace('/subscription');
            setTimeout(() => setShowSuccessMessage(false), 5000);
          }
        } catch (e) {
          console.error('Error verifying session:', e);
        } finally {
          setVerifying(false);
        }
      };
      verify();
    }
  }, [sessionId, refresh, verifying, router]);

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

  const handleOpenBillingPortal = async () => {
    setOpeningPortal(true);
    try {
      const res = await fetch('/api/stripe/portal', { method: 'POST' });
      const data = await res.json().catch(() => null);
      if (data?.url) window.location.href = data.url;
      else alert(data?.error || 'No se pudo abrir el portal de facturación');
    } catch {
      alert('No se pudo abrir el portal de facturación');
    } finally {
      setOpeningPortal(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <SiteHeader />
      
      <main className="flex-grow px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl relative">
          
          {/* Success Message Toast */}
          {showSuccessMessage && (
            <div className="fixed top-24 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-top-4 duration-300">
              <div className="rounded-2xl bg-green-600 px-6 py-3 text-white shadow-2xl flex items-center gap-3 border border-green-500/50 backdrop-blur-sm">
                <div className="rounded-full bg-white/20 p-1">
                  <CheckIcon className="h-5 w-5" />
                </div>
                <p className="font-bold">¡Plan actualizado con éxito!</p>
              </div>
            </div>
          )}

          <div className="mb-16 text-center">
            <h2 className="text-sm font-bold uppercase tracking-widest text-blue-600">Suscripción</h2>
            <h1 className="mt-3 text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl">
              Haz crecer tu negocio
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-600">
              Escoge el plan que mejor se adapte a tu volumen de trabajo.
            </p>
            
            <div className="mx-auto mt-8 flex flex-col items-center justify-center gap-4">
              <div className="inline-flex flex-wrap items-center justify-center gap-3 rounded-full border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-700 shadow-sm">
                <span className="text-slate-500">Plan actual:</span>
                <span className="font-extrabold text-slate-900 text-lg">{currentPlanLabel}</span>
                {statusLabel && (
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-extrabold uppercase tracking-wider ${
                      statusLabel.tone === 'green'
                        ? 'bg-green-100 text-green-700'
                        : statusLabel.tone === 'amber'
                          ? 'bg-amber-100 text-amber-700'
                          : statusLabel.tone === 'blue'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {statusLabel.text}
                  </span>
                )}
              </div>

              <button
                onClick={handleOpenBillingPortal}
                disabled={openingPortal}
                className="text-sm font-bold text-blue-600 hover:text-blue-700 underline underline-offset-4 decoration-2 transition-colors disabled:opacity-50"
              >
                {openingPortal ? 'Cargando...' : 'Gestionar facturación y facturas'}
              </button>
            </div>
          </div>

          <div className="grid gap-8 md:grid-cols-3">
            <PlanCard 
              planKey="free" 
              currentPlan={currentPlan} 
              onUpgrade={handleUpgrade} 
              loading={upgradingPlan !== null && upgradingPlan === 'free'}
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

          <PlanComparisonTable currentPlan={currentPlan} />

          <div className="mt-16 rounded-[2.5rem] border border-slate-200 bg-white p-8 text-center sm:p-12">
            <h3 className="text-xl font-bold text-slate-900">¿Necesitas algo a medida?</h3>
            <p className="mt-2 text-slate-600">
              Para equipos grandes o necesidades específicas de integración empresarial.
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
