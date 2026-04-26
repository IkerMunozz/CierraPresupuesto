'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { getProviders, signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';

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
    <div className="min-h-screen flex flex-col bg-slate-50">
      <SiteHeader />
      
      <main className="flex-1 flex items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-[2rem] shadow-xl border border-slate-200 overflow-hidden">
            <div className="px-8 pt-10 pb-8">
              <div className="text-center mb-10">
                <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Iniciar Sesión</h1>
                <p className="mt-2 text-slate-500">Bienvenido de nuevo a VendeMás AI</p>
              </div>

              <form onSubmit={handleEmailLogin} className="space-y-6">
                {hasGoogle && (
                  <>
                    <button
                      type="button"
                      disabled={loading !== null}
                      onClick={handleGoogle}
                      className="flex w-full items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-50"
                    >
                      <GoogleIcon />
                      {loading === 'google' ? 'Conectando…' : 'Continuar con Google'}
                    </button>

                    <div className="relative">
                      <div className="absolute inset-0 flex items-center" aria-hidden="true">
                        <div className="w-full border-t border-slate-100"></div>
                      </div>
                      <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-white px-2 text-slate-400 font-medium tracking-wider">o continuar con email</span>
                      </div>
                    </div>
                  </>
                )}

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-1 ml-1">
                      Email
                    </label>
                    <input
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      type="email"
                      required
                      placeholder="nombre@ejemplo.com"
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/5"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-1 ml-1">
                      Contraseña
                    </label>
                    <input
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      type="password"
                      required
                      placeholder="••••••••"
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/5"
                    />
                  </div>
                </div>

                {error && (
                  <div className="rounded-2xl bg-red-50 p-4 text-xs font-medium text-red-600 border border-red-100 animate-in fade-in slide-in-from-top-1">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={!canSubmit || loading !== null}
                  className="w-full rounded-2xl bg-slate-900 px-4 py-4 text-sm font-bold text-white transition hover:bg-slate-800 shadow-lg shadow-slate-200 disabled:bg-slate-400 disabled:shadow-none"
                >
                  {loading === 'credentials' ? 'Verificando…' : 'Entrar en mi cuenta'}
                </button>
              </form>
            </div>
            
            <div className="px-8 py-6 bg-slate-50 border-t border-slate-100 text-center">
              <p className="text-sm text-slate-600">
                ¿Aún no tienes cuenta?{' '}
                <Link className="font-bold text-blue-600 hover:text-blue-700" href="/register">
                  Regístrate gratis
                </Link>
              </p>
            </div>
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
