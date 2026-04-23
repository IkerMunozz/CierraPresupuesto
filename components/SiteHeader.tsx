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
            <Link href="/app" className="hover:text-slate-900">Dashboard</Link>
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
                className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                <UserIcon />
                <span>{session.user.name || 'Usuario'}</span>
              </button>
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
                <Link href="/app" className="hover:text-slate-900">Dashboard</Link>
                <Link href="/app/history" className="hover:text-slate-900">Historial</Link>
                <Link href="/app/clients" className="hover:text-slate-900">Clientes</Link>
                <button
                  onClick={() => signOut()}
                  className="text-left hover:text-slate-900"
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
