import Link from 'next/link';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import { GUIDES } from '@/lib/guides';

export default function GuidesIndexPage() {
  return (
    <>
      <SiteHeader />
      <main className="min-h-screen px-4 py-12 sm:px-6 lg:px-10">
        <div className="mx-auto max-w-7xl">
          <header className="max-w-3xl">
            <p className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-700">Recursos</p>
            <h1 className="mt-5 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">Guías por temas</h1>
            <p className="mt-3 text-sm leading-6 text-slate-600 sm:text-base">
              Contenido práctico para hacer mejores presupuestos, defender tu precio y cerrar más ventas.
            </p>
          </header>

          <section className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {GUIDES.map((g) => (
              <Link
                key={g.slug}
                href={`/guias/${g.slug}`}
                className="group rounded-3xl border border-slate-200 bg-white p-6 shadow-soft transition hover:-translate-y-0.5 hover:border-slate-300"
              >
                <p className="text-sm font-semibold text-slate-900">{g.title}</p>
                <p className="mt-2 text-sm leading-6 text-slate-600">{g.description}</p>
                <ul className="mt-4 space-y-2 text-sm text-slate-700">
                  {g.bullets.slice(0, 3).map((b) => (
                    <li key={b} className="flex gap-2">
                      <span className="mt-1 inline-flex h-2 w-2 rounded-full bg-brand-600" />
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
                <p className="mt-5 text-xs font-semibold text-slate-500 transition group-hover:text-slate-700">Leer guía →</p>
              </Link>
            ))}
          </section>

          <section className="mt-12 rounded-[2.25rem] border border-slate-200 bg-slate-900 p-8 shadow-soft sm:p-10">
            <div className="grid gap-8 lg:grid-cols-2 lg:items-center">
              <div>
                <h2 className="text-2xl font-semibold text-white">¿Quieres probarlo ahora?</h2>
                <p className="mt-3 text-sm leading-6 text-slate-200">
                  Abre la app, genera una propuesta y usa el análisis para mejorarla antes de enviarla.
                </p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                <Link
                  href="/register"
                  className="inline-flex items-center justify-center rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-100"
                >
                  Regístrate
                </Link>
                <Link
                  href="/app"
                  className="inline-flex items-center justify-center rounded-2xl bg-brand-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand-700"
                >
                  Abrir app
                </Link>
              </div>
            </div>
          </section>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}