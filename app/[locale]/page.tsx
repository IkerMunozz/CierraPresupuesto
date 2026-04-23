import Link from 'next/link';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import MarketingSections from '@/components/MarketingSections';
import PlanBadge from '@/components/PlanBadge';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { quotes, clients, companies } from '@/lib/db/schema';
import { eq, desc, sql } from 'drizzle-orm';

async function Dashboard({ userId }: { userId: string }) {
  let recentQuotes = [];
  let stats = { total: 0, clients: 0, thisMonth: 0, accepted: 0 };

  try {
    recentQuotes = await db
      .select()
      .from(quotes)
      .leftJoin(clients, eq(quotes.clientId, clients.id))
      .where(eq(quotes.userId, userId))
      .orderBy(desc(quotes.createdAt))
      .limit(5);

    const statsResult = await db
      .select({
        total: sql<number>`count(*)`,
        clients: sql<number>`count(distinct ${quotes.clientId})`,
        thisMonth: sql<number>`count(case when date_trunc('month', ${quotes.createdAt}) = date_trunc('month', now()) then 1 end)`,
        accepted: sql<number>`count(case when ${quotes.status} = 'aceptado' then 1 end)`,
      })
      .from(quotes)
      .where(eq(quotes.userId, userId));

    if (statsResult.length > 0) {
      stats = statsResult[0];
    }
  } catch (error) {
    console.error('Database error:', error);
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-7xl">
        <header className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Bienvenido de nuevo</h1>
            <p className="text-slate-500 text-sm mt-1">Aquí tienes un resumen de tu actividad.</p>
          </div>
          <Link
            href="/app"
            className="rounded-xl bg-blue-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-blue-200 transition hover:bg-blue-700 text-center"
          >
            + Nuevo Presupuesto
          </Link>
        </header>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-10">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Presupuestos</p>
            <p className="mt-2 text-3xl font-bold text-slate-900">{stats?.total || 0}</p>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Clientes activos</p>
            <p className="mt-2 text-3xl font-bold text-slate-900">{stats?.clients || 0}</p>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Este mes</p>
            <p className="mt-2 text-3xl font-bold text-slate-900">{stats?.thisMonth || 0}</p>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Aceptados</p>
            <p className="mt-2 text-3xl font-bold text-green-600">{stats?.accepted || 0}</p>
          </div>
        </div>

        <div className="mb-10">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Plan actual</p>
            <div className="mt-2 flex items-center justify-between">
              <PlanBadge />
              <Link
                href="/subscription"
                className="text-xs font-bold text-slate-500 hover:text-slate-900 transition underline"
              >
                Ver planes
              </Link>
            </div>
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-3">
          <section className="lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-slate-900">Presupuestos recientes</h2>
              <Link href="/app/history" className="text-xs font-bold text-blue-600 hover:underline">
                Ver todos
              </Link>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-white overflow-hidden shadow-sm">
              {recentQuotes.length > 0 ? (
                <div className="divide-y divide-slate-100">
                  {recentQuotes.map((q) => (
                    <Link
                      key={q.quotes.id}
                      href={`/app/quotes/${q.quotes.id}`}
                      className="flex items-center justify-between p-4 hover:bg-slate-50 transition"
                    >
                      <div>
                        <p className="font-bold text-slate-900">
                          #PRE-{q.quotes.id} · {q.clients?.name || 'Cliente'}
                        </p>
                        <p className="text-xs text-slate-500">{new Date(q.quotes.createdAt).toLocaleDateString()}</p>
                      </div>
                      <div className="flex items-center gap-4">
                        <span
                          className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${
                            q.quotes.status === 'borrador'
                              ? 'bg-slate-100 text-slate-600'
                              : 'bg-green-100 text-green-700'
                          }`}
                        >
                          {q.quotes.status}
                        </span>
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          className="text-slate-300"
                        >
                          <path d="M9 18l6-6-6-6" />
                        </svg>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="p-10 text-center">
                  <p className="text-slate-400 text-sm italic">Aún no has creado ningún presupuesto.</p>
                  <Link href="/app" className="mt-4 inline-block text-sm font-bold text-blue-600">
                    Crear el primero →
                  </Link>
                </div>
              )}
            </div>
          </section>

          <section>
            <h2 className="text-lg font-bold text-slate-900 mb-4">Acceso rápido</h2>
            <div className="grid gap-4">
              <Link
                href="/app/history"
                className="group rounded-2xl border border-slate-200 bg-white p-4 shadow-sm hover:border-blue-200 hover:bg-blue-50/30 transition"
              >
                <p className="font-bold text-slate-900 group-hover:text-blue-600">Presupuestos</p>
                <p className="text-xs text-slate-500">Historial completo.</p>
              </Link>
              <Link
                href="/app/clients"
                className="group rounded-2xl border border-slate-200 bg-white p-4 shadow-sm hover:border-blue-200 hover:bg-blue-50/30 transition"
              >
                <p className="font-bold text-slate-900 group-hover:text-blue-600">Mis Clientes</p>
                <p className="text-xs text-slate-500">Gestiona tu cartera de clientes.</p>
              </Link>
              <div className="rounded-2xl border border-dashed border-slate-200 p-4 text-center">
                <p className="text-xs text-slate-400 italic">Nuevas funciones próximamente...</p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

function LandingPage() {
  return (
    <main>
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-50 via-white to-blue-50">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-100/50 via-transparent to-purple-100/30" />
        <div className="relative mx-auto max-w-7xl px-4 pb-20 pt-16 sm:px-6 lg:px-10 lg:pb-24 lg:pt-20">
          <div className="grid gap-12 lg:grid-cols-2 lg:items-center lg:gap-16">
            <div className="text-center lg:text-left">
              <div className="inline-flex items-center rounded-full border border-slate-200 bg-white/80 px-4 py-2 text-sm font-medium text-slate-700 shadow-sm backdrop-blur">
                <span className="mr-2 h-2 w-2 rounded-full bg-green-500"></span>
                Para autónomos y profesionales
              </div>
              <h1 className="mt-8 text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
                Presupuestos que
                <span className="block bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  convierten
                </span>
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600 lg:text-xl">
                Genera propuestas comerciales profesionales con IA. Obtén análisis detallado, score de conversión y
                versiones optimizadas para cerrar más ventas.
              </p>

              <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:justify-center lg:justify-start">
                <Link
                  href="/register"
                  className="rounded-xl bg-slate-900 px-8 py-4 text-lg font-semibold text-white shadow-lg transition hover:bg-slate-800 hover:shadow-xl"
                >
                  Regístrate gratis
                </Link>
                <Link
                  href="/login"
                  className="rounded-xl border border-slate-300 bg-white px-8 py-4 text-lg font-semibold text-slate-900 shadow-sm transition hover:bg-slate-50 hover:shadow-md"
                >
                  Inicia sesión
                </Link>
              </div>
            </div>

            <div className="relative">
              <div className="absolute -inset-4 rounded-3xl bg-gradient-to-r from-blue-500/20 to-purple-500/20 blur-2xl" />
              <div className="relative rounded-2xl border border-slate-200 bg-white/90 shadow-2xl backdrop-blur">
                <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="h-3 w-3 rounded-full bg-red-500"></div>
                    <div className="h-3 w-3 rounded-full bg-yellow-500"></div>
                    <div className="h-3 w-3 rounded-full bg-green-500"></div>
                  </div>
                </div>
                <div className="p-6">
                  <div className="space-y-4">
                    <div className="h-2 bg-slate-200 rounded w-full"></div>
                    <div className="h-2 bg-slate-200 rounded w-3/4"></div>
                    <div className="h-2 bg-slate-200 rounded w-1/2"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      <MarketingSections />
    </main>
  );
}

export default async function HomePage() {
  const session = await getServerSession(authOptions);

  return (
    <>
      <SiteHeader />
      {session?.user ? <Dashboard userId={session.user.id} /> : <LandingPage />}
      <SiteFooter />
    </>
  );
}
