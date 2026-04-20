import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';

export default async function ProfilePage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect('/login');
  }

  return (
    <>
      <SiteHeader />
      <main className="min-h-screen bg-slate-50 px-4 py-10 sm:px-6 lg:px-10">
        <div className="mx-auto max-w-3xl">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-slate-900">Mi perfil</h1>
            <p className="text-slate-500 text-sm mt-1">Gestiona tu información personal y plan de suscripción.</p>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">Información personal</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700">Nombre</label>
                  <p className="mt-1 text-sm text-slate-900">{session.user.name || 'No especificado'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">Email</label>
                  <p className="mt-1 text-sm text-slate-900">{session.user.email}</p>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">Plan actual</h2>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xl font-bold text-blue-600">Plan Free</p>
                  <p className="text-sm text-slate-600">Hasta 5 presupuestos al mes</p>
                </div>
                <button className="text-sm font-semibold text-blue-600 hover:underline">
                  Mejorar plan
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}