'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { getProviders, signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';

type Provider = { id: string; name: string };

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path
        fill="#FFC107"
        d="M43.611 20.083H42V20H24v8h11.303C33.66 32.657 29.194 36 24 36c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"
      />
      <path
        fill="#FF3D00"
        d="M6.306 14.691l6.571 4.819C14.655 16.108 19.001 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4c-7.682 0-14.356 4.33-17.694 10.691z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.166 0 9.86-1.977 13.409-5.197l-6.19-5.238C29.163 35.091 26.715 36 24 36c-5.167 0-9.62-3.317-11.283-7.946l-6.52 5.02C9.505 39.556 16.227 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.611 20.083H42V20H24v8h11.303c-.792 2.219-2.273 4.107-4.284 5.565l.003-.002 6.19 5.238C36.773 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"
      />
    </svg>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = useMemo(() => email.trim().includes('@') && password.length >= 6, [email, password]);

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading('credentials');
    try {
      const res = await signIn('credentials', { 
        email: email.toLowerCase(), 
        password, 
        callbackUrl: '/app', 
        redirect: false 
      });
      
      if (res?.error) {
        setError('Credenciales incorrectas o el usuario no existe.');
        setLoading(null);
      } else {
        router.push('/app');
      }
    } catch (e) {
      setError('Ocurrió un error inesperado.');
      setLoading(null);
    }
  };

  const handleGoogle = async () => {
    setError(null);
    setLoading('google');
    await signIn('google', { callbackUrl: '/app' });
  };

  const [providers, setProviders] = useState<Record<string, Provider> | null>(null);
  useEffect(() => {
    let alive = true;
    getProviders()
      .then((p) => {
        if (alive) setProviders((p ?? {}) as any);
      })
      .catch(() => {
        if (alive) setProviders({});
      });
    return () => {
      alive = false;
    };
  }, []);

  const hasGoogle = Boolean(providers?.google);

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 px-4 py-12 sm:px-6 lg:px-10">
      <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-2 lg:items-center">
        <section className="hidden lg:block">
          <div className="space-y-8">
            <div className="inline-flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-purple-600 text-white shadow-lg">
                <span className="text-lg font-bold">CP</span>
              </div>
              <span className="text-2xl font-bold text-slate-900">CierraPresupuesto</span>
            </div>

            <div>
              <h2 className="text-3xl font-bold tracking-tight text-slate-900">
                Vuelve a cerrar con confianza
              </h2>
              <p className="mt-4 text-lg text-slate-600">
                Accede para guardar propuestas, reutilizar estructura y mejorar la tasa de aceptación con análisis inteligente.
              </p>
            </div>

            <div className="grid gap-4">
              {[
                { icon: '⚡', title: 'Presupuestos profesionales', desc: 'Listos para enviar en minutos.' },
                { icon: '📊', title: 'Score + riesgos', desc: 'Sabrás qué mejorar antes de enviarlo.' },
                { icon: '🚀', title: 'Versión mejorada', desc: 'Copia y envía la optimizada para convertir.' },
              ].map((item, index) => (
                <div key={index} className="flex items-start gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="text-2xl">{item.icon}</div>
                  <div>
                    <h3 className="font-semibold text-slate-900">{item.title}</h3>
                    <p className="mt-1 text-sm text-slate-600">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-xl">
          <Link href="/" className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition">
            ← Volver a la página principal
          </Link>

          <div className="mt-8">
            <h1 className="text-3xl font-bold text-slate-900">Iniciar sesión</h1>
            <p className="mt-2 text-slate-600">Accede para usar la app y guardar tu trabajo.</p>
          </div>

          <form onSubmit={handleEmailLogin} className="mt-8 space-y-6">
            {hasGoogle ? (
              <button
                type="button"
                disabled={loading !== null}
                onClick={handleGoogle}
                className="flex w-full items-center justify-center gap-3 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-900 shadow-sm transition hover:bg-slate-50 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60"
              >
                <GoogleIcon />
                {loading === 'google' ? 'Conectando…' : 'Continuar con Google'}
              </button>
            ) : null}

            {hasGoogle ? (
              <div className="flex items-center gap-4">
                <div className="h-px flex-1 bg-slate-200" />
                <span className="text-xs text-slate-500">o</span>
                <div className="h-px flex-1 bg-slate-200" />
              </div>
            ) : null}

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-700">
                  Correo electrónico
                </label>
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  type="email"
                  required
                  placeholder="tu@email.com"
                  className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-700">
                  Contraseña
                </label>
                <input
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  type="password"
                  required
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
            </div>

            {error ? (
              <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                {error}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={!canSubmit || loading !== null}
              className="w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 hover:shadow-lg disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              {loading === 'credentials' ? 'Entrando…' : 'Iniciar sesión'}
            </button>

            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-600">
                ¿No tienes cuenta?{' '}
                <Link className="font-semibold text-blue-600 hover:text-blue-700" href="/register">
                  Regístrate
                </Link>
              </p>
              <Link className="text-sm font-semibold text-slate-600 hover:text-slate-900" href="/app">
                Ver demo →
              </Link>
            </div>
          </form>
        </section>
      </div>
    </main>
  );
}
