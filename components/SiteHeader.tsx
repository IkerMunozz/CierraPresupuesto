'use client';

import Link from 'next/link';
import Image from 'next/image';
import { signOut, useSession } from 'next-auth/react';
import { useState } from 'react';
import { useSubscription } from '@/lib/hooks/useSubscription';

function MenuIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 12h18M3 6h18M3 18h18" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

export default function SiteHeader() {
  const { data: session, status } = useSession();
  const loading = status === 'loading';
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const { label: currentPlanLabel, tone, loading: planLoading } = useSubscription();

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/70 bg-white/95 backdrop-blur-lg shadow-sm">
      <div className="flex items-center justify-between gap-6 px-4 py-4 sm:px-6 lg:px-10">
        <Link href="/" className="flex items-center">
          <div className="relative h-20 w-80">
            <Image src="/logo.png" alt="VendeMás AI" fill className="object-contain object-left" priority />
          </div>
        </Link>

        {session?.user ? (
          <nav className="hidden items-center gap-8 text-sm font-medium text-slate-600 md:flex">
            <Link href="/" className="hover:text-slate-900">Dashboard</Link>
            <Link href="/app" className="hover:text-slate-900">Nuevo presupuesto</Link>
            <Link href="/app/history" className="hover:text-slate-900">Historial</Link>
            <Link href="/app/clients" className="hover:text-slate-900">Clientes</Link>
          </nav>
        ) : (
          <nav className="hidden items-center gap-8 text-sm font-medium text-slate-600 md:flex">
            <Link href="#funcionalidades" className="hover:text-slate-900">Funcionalidades</Link>
            <Link href="#pricing" className="hover:text-slate-900">Precios</Link>
            <Link href="#faq" className="hover:text-slate-900">FAQ</Link>
          </nav>
        )}

        <div className="flex items-center gap-3">
          {loading ? (
            <div className="h-10 w-32 animate-pulse rounded-xl bg-slate-200/70" />
          ) : session?.user ? (
            <div className="relative">
              <button
                type="button"
                onClick={() => setProfileOpen(!profileOpen)}
                className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
              >
                <UserIcon />
                <span>{session.user.name || 'Usuario'}</span>
                <svg
                  className={`h-4 w-4 text-slate-400 transition-transform ${profileOpen ? 'rotate-180' : ''}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {profileOpen && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setProfileOpen(false)}
                  />
                  <div className="absolute right-0 mt-2 w-56 origin-top-right rounded-xl border border-slate-200 bg-white p-2 shadow-xl ring-1 ring-black ring-opacity-5 focus:outline-none z-20">
                    <div className="px-3 py-2 mb-1 border-b border-slate-100">
                      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Cuenta</p>
                      <p className="text-sm font-medium text-slate-900 truncate">{session.user.email}</p>
                    </div>
                    <Link
                      href="/profile"
                      onClick={() => setProfileOpen(false)}
                      className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors"
                    >
                      <UserIcon />
                      <span>Mi Perfil</span>
                    </Link>
                    <Link
                      href="/subscription"
                      onClick={() => setProfileOpen(false)}
                      className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors"
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                      </svg>
                      <span>Suscripción</span>
                    </Link>
                    <div className="my-1 border-t border-slate-100" />
                    <button
                      onClick={() => {
                        setProfileOpen(false);
                        signOut();
                      }}
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-600 hover:bg-red-50 hover:text-red-700 transition-colors"
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
                      </svg>
                      <span>Cerrar sesión</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <Link href="/login" className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                Iniciar sesión
              </Link>
              <Link href="/register" className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800">
                Registrarse
              </Link>
            </div>
          )}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 hover:text-slate-900 md:hidden"
          >
            {mobileMenuOpen ? <XIcon /> : <MenuIcon />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="border-t border-slate-200 bg-white md:hidden">
          <nav className="flex flex-col gap-4 px-4 py-6 text-sm font-medium text-slate-600">
            {session?.user ? (
              <>
                <div className="px-3 py-2 border-b border-slate-100 mb-2">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Navegación</p>
                </div>
                <Link href="/" onClick={() => setMobileMenuOpen(false)} className="px-3 py-1 hover:text-slate-900">Dashboard</Link>
                <Link href="/app" onClick={() => setMobileMenuOpen(false)} className="px-3 py-1 hover:text-slate-900">Nuevo presupuesto</Link>
                <Link href="/app/history" onClick={() => setMobileMenuOpen(false)} className="px-3 py-1 hover:text-slate-900">Historial</Link>
                <Link href="/app/clients" onClick={() => setMobileMenuOpen(false)} className="px-3 py-1 hover:text-slate-900">Clientes</Link>
                
                <div className="px-3 py-2 border-b border-slate-100 my-2">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Usuario</p>
                </div>
                <Link href="/profile" onClick={() => setMobileMenuOpen(false)} className="px-3 py-1 hover:text-slate-900">Mi Perfil</Link>
                <Link href="/subscription" onClick={() => setMobileMenuOpen(false)} className="px-3 py-1 hover:text-slate-900">Suscripción</Link>
                <button
                  onClick={() => signOut()}
                  className="px-3 py-1 text-left text-red-600 hover:text-red-700 font-semibold mt-2"
                >
                  Cerrar sesión
                </button>
              </>
            ) : (
              <>
                <Link href="#funcionalidades" className="hover:text-slate-900">Funcionalidades</Link>
                <Link href="#pricing" className="hover:text-slate-900">Precios</Link>
                <Link href="#faq" className="hover:text-slate-900">FAQ</Link>
                <Link href="/login" className="hover:text-slate-900">Iniciar sesión</Link>
                <Link href="/register" className="hover:text-slate-900">Registrarse</Link>
              </>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
