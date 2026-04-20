import Link from 'next/link';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';

export default async function SubscriptionPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect('/login');
  }

  // For now, assume Free plan
  const currentPlan = 'free';

  const plans = [
    {
      name: 'Profesional',
      price: '19€',
      period: 'al mes',
      features: [
        'Presupuestos ilimitados',
        'IA completa con OpenAI',
        'Análisis detallado y score',
        'Versión mejorada automática',
        'Exportar a PDF',
        'Historial completo',
        'Soporte prioritario'
      ],
      cta: 'Actualizar a Profesional'
    },
    {
      name: 'Empresa',
      price: '49€',
      period: 'al mes',
      features: [
        'Todo lo del plan Profesional',
        'Hasta 5 usuarios',
        'Plantillas personalizadas',
        'API para integraciones',
        'Soporte VIP 24/7',
        'Onboarding dedicado'
      ],
      cta: 'Actualizar a Empresa'
    }
  ];

  return (
    <>
      <SiteHeader />
      <main className="min-h-screen bg-slate-50 px-4 py-10 sm:px-6 lg:px-10">
        <div className="mx-auto max-w-4xl">
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold text-slate-900">Suscripción</h1>
            <p className="text-slate-500 text-sm mt-1">Tu plan actual: <span className="font-semibold text-blue-600">Free</span></p>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {plans.map((plan, i) => (
              <div key={i} className="rounded-3xl border border-slate-200 bg-white p-8 shadow-soft">
                <div className="text-center mb-6">
                  <h3 className="text-xl font-semibold text-slate-900">{plan.name}</h3>
                  <div className="mt-4">
                    <span className="text-4xl font-bold text-slate-900">{plan.price}</span>
                    <span className="text-sm text-slate-600">/{plan.period}</span>
                  </div>
                </div>
                <ul className="space-y-3 mb-8">
                  {plan.features.map((f, j) => (
                    <li key={j} className="flex items-start gap-3 text-sm text-slate-700">
                      <span className="mt-0.5 inline-flex h-2 w-2 rounded-full bg-emerald-500 flex-shrink-0" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  href="/register" // Placeholder, should link to payment
                  className="block w-full rounded-2xl bg-brand-600 py-3 text-center text-sm font-semibold text-white transition hover:bg-brand-700"
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>

          <div className="mt-12 text-center">
            <p className="text-sm text-slate-600">
              Todos los planes incluyen 14 días de prueba gratuita. Sin compromiso, cancela cuando quieras.
            </p>
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}