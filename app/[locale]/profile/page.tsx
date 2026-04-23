'use client';

import { useSession } from 'next-auth/react';
import { redirect } from 'next/navigation';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import PlanBadge from '@/components/PlanBadge';
import Link from 'next/link';

export default function ProfilePage() {
  const { data: session, status } = useSession();

  if (status === 'loading') return null;
  if (status === 'unauthenticated') redirect('/login');

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <SiteHeader />
      <main className="flex-grow px-4 py-10 sm:px-6 lg:px-10">
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
                  <p className="mt-1 text-sm text-slate-900">{session?.user?.name || 'No especificado'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">Email</label>
                  <p className="mt-1 text-sm text-slate-900">{session?.user?.email}</p>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">Suscripción</h2>
              <div className="flex items-center justify-between">
                <div>
                  <PlanBadge />
                </div>
                <Link href="/subscription" className="text-sm font-semibold text-blue-600 hover:underline">
                  Gestionar planes
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
