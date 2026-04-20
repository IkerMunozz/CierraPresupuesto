'use client';

import Link from 'next/link';
import { signOut, useSession } from 'next-auth/react';
import { useState } from 'react';

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

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/70 bg-white/95 backdrop-blur-lg shadow-sm">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-4 py-4 sm:px-6 lg:px-10">
        <Link href="/" className="flex items-center gap-3 font-bold text-slate-900">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-purple-600 text-white shadow-lg">
            <span className="text-lg font-bold">CP</span>
          </div>
          <span className="hidden text-xl tracking-tight sm:block">CierraPresupuesto</span>
        </Link>

        {session?.user ? (
          <nav className="hidden items-center gap-8 text-sm font-medium text-slate-600 md:flex">
            <Link className="transition-colors hover:text-slate-900" href="/">
              Panel
            </Link>
            <Link className="transition-colors hover:text-slate-900" href="/app">
              Nuevo Presupuesto
            </Link>
            <Link className="transition-colors hover:text-slate-900" href="/app/history">
              Mis Presupuestos
            </Link>
            <Link className="transition-colors hover:text-slate-900" href="/app/clients">
              Clientes
            </Link>
          </nav>
        ) : (
          <nav className="hidden items-center gap-8 text-sm font-medium text-slate-600 md:flex">
            <a className="transition-colors hover:text-slate-900" href="#features">
              Funcionalidades
            </a>
            <a className="transition-colors hover:text-slate-900" href="#how-it-works">
              Cómo funciona
            </a>
            <a className="transition-colors hover:text-slate-900" href="#pricing">
              Precios
            </a>
            <a className="transition-colors hover:text-slate-900" href="#faq">
              FAQ
            </a>
          </nav>
        )}

        <div className="flex items-center gap-3">
          {loading ? (
            <div className="h-10 w-32 animate-pulse rounded-xl bg-slate-200/70" />
          ) : session?.user ? (
            <div className="relative">
              <button
                onClick={() => setProfileOpen(!profileOpen)}
                className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 shadow-sm transition hover:bg-slate-50"
              >
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-slate-600">
                  <UserIcon />
                </div>
                <span className="hidden sm:block">{session.user.name || session.user.email}</span>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className={`transition-transform ${profileOpen ? 'rotate-180' : ''}`}>
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </button>

              {profileOpen && (
                <div className="absolute right-0 mt-2 w-56 origin-top-right rounded-2xl border border-slate-100 bg-white p-2 shadow-xl ring-1 ring-black ring-opacity-5 focus:outline-none">
                  <div className="px-4 py-3 border-b border-slate-50">
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Plan actual</p>
                    <p className="mt-1 flex items-center gap-2 text-sm font-bold text-blue-600">
                      <span className="h-2 w-2 rounded-full bg-blue-600" />
                      Plan Free
                    </p>
                  </div>
                  <div className="py-1">
                    <Link
                      href="/profile"
                      className="flex items-center px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 rounded-xl transition"
                    >
                      Mi perfil
                    </Link>
                    <Link
                      href="/subscription"
                      className="flex items-center px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 rounded-xl transition"
                    >
                      Suscripción
                    </Link>
                    <button
                      onClick={() => signOut({ callbackUrl: '/' })}
                      className="flex w-full items-center px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-xl transition"
                    >
                      Cerrar sesión
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <>
              <Link
                href="/register"
                className="hidden rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 shadow-sm transition hover:bg-slate-50 hover:shadow-md sm:inline-flex"
              >
                Regístrate
              </Link>
              <Link
                href="/login"
                className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 hover:shadow-md"
              >
                Inicia sesión
              </Link>
            </>
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
                <Link href="/" onClick={() => setMobileMenuOpen(false)}>Panel</Link>
                <Link href="/app" onClick={() => setMobileMenuOpen(false)}>Nuevo Presupuesto</Link>
                <Link href="/app/history" onClick={() => setMobileMenuOpen(false)}>Mis Presupuestos</Link>
                <Link href="/app/clients" onClick={() => setMobileMenuOpen(false)}>Clientes</Link>
                <div className="my-2 h-px bg-slate-100" />
                <button
                  onClick={() => signOut({ callbackUrl: '/' })}
                  className="text-left text-red-600 font-bold"
                >
                  Cerrar sesión
                </button>
              </>
            ) : (
              <>
                <a className="transition-colors hover:text-slate-900" href="#features" onClick={() => setMobileMenuOpen(false)}>
                  Funcionalidades
                </a>
                <a className="transition-colors hover:text-slate-900" href="#how-it-works" onClick={() => setMobileMenuOpen(false)}>
                  Cómo funciona
                </a>
                <a className="transition-colors hover:text-slate-900" href="#pricing" onClick={() => setMobileMenuOpen(false)}>
                  Precios
                </a>
                <a className="transition-colors hover:text-slate-900" href="#faq" onClick={() => setMobileMenuOpen(false)}>
                  FAQ
                </a>
                <div className="my-2 h-px bg-slate-200" />
                <Link
                  href="/register"
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-center font-semibold text-slate-800 shadow-sm transition hover:bg-slate-50"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Regístrate
                </Link>
                <Link
                  href="/login"
                  className="rounded-xl bg-slate-900 px-4 py-2.5 text-center font-semibold text-white transition hover:bg-slate-800"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Inicia sesión
                </Link>
              </>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
