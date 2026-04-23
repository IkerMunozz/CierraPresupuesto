import Link from 'next/link';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { clients } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';

type Client = typeof clients.$inferSelect;

export default async function ClientsPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect('/login');
  }

  let userClients: Client[] = [];

  try {
    userClients = await db.query.clients.findMany({
      where: eq(clients.userId, session.user.id),
      orderBy: (clients, { desc }) => [desc(clients.createdAt)],
    });
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
              <h1 className="text-3xl font-bold text-slate-900">Mis Clientes</h1>
              <p className="text-slate-500 text-sm mt-1">Gestiona tu cartera de clientes.</p>
            </div>
            <Link
              href="/app/clients/new"
              className="rounded-xl bg-blue-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-blue-200 transition hover:bg-blue-700"
            >
              + Nuevo Cliente
            </Link>
          </div>

          {userClients.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {userClients.map((client) => (
                <div key={client.id} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h3 className="text-lg font-semibold text-slate-900">{client.name}</h3>
                  <p className="text-sm text-slate-600 mt-1">{client.email}</p>
                  {client.phone && <p className="text-sm text-slate-600">{client.phone}</p>}
                  {client.industry && <p className="text-sm text-slate-600">{client.industry}</p>}
                  <div className="mt-4 flex gap-2">
                    <Link
                      href={`/app/clients/${client.id}/edit`}
                      className="text-xs font-semibold text-blue-600 hover:underline"
                    >
                      Editar
                    </Link>
                    <Link
                      href={`/app/quotes?client=${client.id}`}
                      className="text-xs font-semibold text-blue-600 hover:underline"
                    >
                      Ver presupuestos
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center">
              <div className="mx-auto h-12 w-12 text-slate-400">
                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="mt-4 text-lg font-semibold text-slate-900">Aún no has creado clientes</h3>
              <p className="mt-2 text-sm text-slate-600">Comienza añadiendo tu primer cliente para organizar mejor tus presupuestos.</p>
              <Link
                href="/app/clients/new"
                className="mt-6 inline-block rounded-xl bg-blue-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-blue-200 transition hover:bg-blue-700"
              >
                Crear primer cliente
              </Link>
            </div>
          )}
        </div>
      </main>
      <SiteFooter />
    </>
  );
}