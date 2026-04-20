import Link from 'next/link';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { quotes, clients } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';

export default async function HistoryPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect('/login');
  }

  let userQuotes = [];

  try {
    userQuotes = await db.select().from(quotes).leftJoin(clients, eq(quotes.clientId, clients.id)).where(eq(quotes.userId, session.user.id)).orderBy(desc(quotes.createdAt));
  } catch (error) {
    console.error('Database error:', error);
    // Continue with empty data
  }

  return (
    <>
      <SiteHeader />
      <main className="min-h-screen bg-slate-50 px-4 py-10 sm:px-6 lg:px-10">
        <div className="mx-auto max-w-7xl">
          <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Mis Presupuestos</h1>
              <p className="text-slate-500 text-sm mt-1">Historial completo de tus presupuestos creados.</p>
            </div>
            <Link
              href="/app"
              className="rounded-xl bg-blue-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-blue-200 transition hover:bg-blue-700"
            >
              + Nuevo Presupuesto
            </Link>
          </div>

          {userQuotes.length > 0 ? (
            <div className="rounded-3xl border border-slate-200 bg-white overflow-hidden shadow-sm">
              <div className="divide-y divide-slate-100">
                {userQuotes.map((q) => (
                  <div key={q.quotes.id} className="flex items-center justify-between p-6 hover:bg-slate-50 transition">
                    <div className="flex items-center gap-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-600 font-bold text-sm">
                        #{q.quotes.id}
                      </div>
                      <div>
                        <p className="font-bold text-slate-900">PRE-{q.quotes.id} · {q.clients?.name || 'Cliente'}</p>
                        <p className="text-sm text-slate-500">{new Date(q.quotes.createdAt).toLocaleDateString('es-ES')}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider ${
                        q.quotes.status === 'borrador' ? 'bg-slate-100 text-slate-600' :
                        q.quotes.status === 'enviado' ? 'bg-blue-100 text-blue-700' :
                        q.quotes.status === 'aceptado' ? 'bg-green-100 text-green-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {q.quotes.status}
                      </span>
                      <Link
                        href={`/app/quotes/${q.quotes.id}`}
                        className="text-sm font-semibold text-blue-600 hover:underline"
                      >
                        Ver detalles
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center">
              <div className="mx-auto h-12 w-12 text-slate-400">
                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="mt-4 text-lg font-semibold text-slate-900">Aún no has creado presupuestos</h3>
              <p className="mt-2 text-sm text-slate-600">Comienza creando tu primer presupuesto profesional.</p>
              <Link
                href="/app"
                className="mt-6 inline-block rounded-xl bg-blue-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-blue-200 transition hover:bg-blue-700"
              >
                Crear primer presupuesto
              </Link>
            </div>
          )}
        </div>
      </main>
      <SiteFooter />
    </>
  );
}