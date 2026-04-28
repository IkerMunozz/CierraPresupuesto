import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import MarketingSections from '@/components/MarketingSections';
import { redirect } from 'next/navigation';
import Link from 'next/link';

export default async function HomePage() {
  const session = await getServerSession(authOptions);

  if (session?.user) {
    redirect('/app/dashboard');
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <SiteHeader />
      <main>
        {/* Hero Section */}
        <section className="relative overflow-hidden pt-16 pb-20 lg:pt-24 lg:pb-28">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-10">
            <div className="text-center">
              <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl md:text-6xl">
                <span className="block">Cierra más presupuestos</span>
                <span className="block text-brand-600">con el poder de la IA</span>
              </h1>
              <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-600 sm:text-xl">
                La herramienta definitiva para autónomos y profesionales. Genera propuestas profesionales en segundos, analiza riesgos y mejora tu tasa de conversión.
              </p>
              <div className="mx-auto mt-10 max-w-sm sm:flex sm:max-w-none sm:justify-center">
                <div className="space-y-4 sm:mx-auto sm:inline-grid sm:grid-cols-2 sm:gap-5 sm:space-y-0">
                  <Link
                    href="/register"
                    className="flex items-center justify-center rounded-2xl bg-slate-900 px-8 py-4 text-base font-bold text-white shadow-xl transition hover:bg-slate-800"
                  >
                    Empezar ahora — Es gratis
                  </Link>
                  <Link
                    href="/login"
                    className="flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-8 py-4 text-base font-bold text-slate-700 shadow-sm transition hover:bg-slate-50"
                  >
                    Iniciar sesión
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        <MarketingSections />
      </main>
      <SiteFooter />
    </div>
  );
}
