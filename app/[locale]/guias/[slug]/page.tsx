import Link from 'next/link';
import { notFound } from 'next/navigation';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import { getGuideBySlug } from '@/lib/guides';

export default async function GuidePage({ params }: { params: { slug: string } }) {
  const { slug } = params;
  const guide = getGuideBySlug(slug);
  if (!guide) return notFound();

  return (
    <>
      <SiteHeader />
      <main className="min-h-screen px-4 py-12 sm:px-6 lg:px-10">
        <div className="mx-auto max-w-3xl">
          <Link href="/guias" className="text-sm font-semibold text-slate-700 hover:text-slate-900">
            ← Volver a guías
          </Link>

          <header className="mt-6">
            <p className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-700">Guía</p>
            <h1 className="mt-5 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">{guide.title}</h1>
            <p className="mt-3 text-sm leading-6 text-slate-600 sm:text-base">{guide.description}</p>
          </header>

          <section className="mt-10 space-y-5">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-soft">
              <h2 className="text-base font-semibold text-slate-900">Checklist rápida</h2>
              <ul className="mt-4 space-y-3 text-sm text-slate-700">
                {guide.bullets.map((b) => (
                  <li key={b} className="flex gap-3">
                    <span className="mt-1 inline-flex h-2 w-2 rounded-full bg-brand-600" />
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-soft">
              <h2 className="text-base font-semibold text-slate-900">Plantilla de texto (copiable)</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Usa esta estructura como base y luego genera/análisis/mejora dentro de la app.
              </p>
              <pre className="mt-4 whitespace-pre-wrap rounded-3xl border border-slate-100 bg-slate-50 p-5 text-sm leading-7 text-slate-700">
{`Asunto: Propuesta para [SERVICIO]

Hola [NOMBRE],

Resumen: [1 frase de valor + resultado]

Qué incluye:
- [Entregable 1]
- [Entregable 2]
- [Entregable 3]

Inversión: [PRECIO] (incluye [condición breve])

Plazos: [hitos o rango] · Próximo paso: responde "OK" y te envío calendario y acuerdo de inicio hoy.`}
              </pre>
            </div>
          </section>

          <section className="mt-12 rounded-[2.25rem] border border-slate-200 bg-slate-900 p-8 shadow-soft sm:p-10">
            <div className="grid gap-8 sm:grid-cols-2 sm:items-center">
              <div>
                <h2 className="text-2xl font-semibold text-white">Pruébalo con tu caso real</h2>
                <p className="mt-3 text-sm leading-6 text-slate-200">
                  Mete tu servicio, genera el borrador y deja que el análisis te diga qué mejorar.
                </p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                <Link
                  href="/app"
                  className="inline-flex items-center justify-center rounded-2xl bg-brand-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand-700"
                >
                  Abrir app
                </Link>
                <Link
                  href="/register"
                  className="inline-flex items-center justify-center rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-100"
                >
                  Regístrate
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