import Link from 'next/link';
import LogosMarquee from '@/components/LogosMarquee';
import PricingSection from '@/components/PricingSection';

function Feature({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-soft transition hover:-translate-y-0.5 hover:border-slate-300">
      <h3 className="text-base font-semibold text-slate-900">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
    </div>
  );
}

function Metric({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white/80 p-6 shadow-soft backdrop-blur">
      <p className="text-3xl font-semibold tracking-tight text-slate-900">{value}</p>
      <p className="mt-2 text-sm text-slate-600">{label}</p>
    </div>
  );
}

function LogoPill({ name }: { name: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm">
      {name}
    </div>
  );
}

function FAQItem({ q, a }: { q: string; a: string }) {
  return (
    <details className="group rounded-3xl border border-slate-200 bg-white p-5 shadow-soft">
      <summary className="cursor-pointer list-none text-sm font-semibold text-slate-900">
        <span className="flex items-center justify-between gap-4">
          {q}
          <span className="text-slate-400 transition group-open:rotate-45">+</span>
        </span>
      </summary>
      <p className="mt-3 text-sm leading-6 text-slate-600">{a}</p>
    </details>
  );
}

export default function MarketingSections() {
  return (
    <>
      <section className="py-14">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-10">
          <div className="rounded-[2.25rem] border border-slate-200 bg-white/70 p-8 shadow-soft backdrop-blur sm:p-10">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div className="max-w-2xl">
                <p className="text-sm font-semibold text-slate-900">Una herramienta pensada para profesionales reales</p>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Presupuestar no es un trámite: es el momento donde se gana (o se pierde) la venta. Por eso juntamos propuesta + análisis + mejora.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-xs font-semibold text-slate-500">Inspirado por buenas prácticas de SaaS</span>
                <LogoPill name="Propuesta" />
                <LogoPill name="Análisis" />
                <LogoPill name="Mejora" />
              </div>
            </div>
            <div className="mt-8 grid gap-5 md:grid-cols-4">
              <Metric value="2–3 min" label="De datos a propuesta lista para enviar." />
              <Metric value="0–100" label="Score de conversión para priorizar mejoras." />
              <Metric value="1 clic" label="Copiar presupuesto, análisis o versión mejorada." />
              <Metric value="Sin líos" label="Modo fallback si no hay OpenAI." />
            </div>
          </div>

          <div className="mt-8">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm font-semibold text-slate-900">Confían en nosotros</p>
              <p className="text-sm text-slate-500">Logos demo para look & feel SaaS</p>
            </div>
            <div className="mt-4">
              <LogosMarquee />
            </div>
          </div>
        </div>
      </section>

      <section id="funcionalidades" className="py-14">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-10">
          <div className="max-w-3xl">
            <h2 className="text-2xl font-semibold text-slate-900">Todo lo que necesitas para presupuestar mejor</h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              Genera propuestas profesionales, analiza la probabilidad de cierre y mejora el texto automáticamente para convertir mejor.
            </p>
          </div>
          <div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            <Feature title="Presupuesto profesional" description="Texto listo para enviar, con estructura comercial y foco en valor." />
            <Feature title="Análisis de conversión" description="Score 0–100, feedback y riesgos de perder la venta." />
            <Feature title="Mejora automática" description="Reescritura optimizada para aumentar aceptación sin sonar agresivo." />
            <Feature title="Modo fallback" description="Sin clave de OpenAI, funciona con respuestas mock realistas." />
          </div>

          <div className="mt-10 grid gap-5 lg:grid-cols-2">
            <div className="rounded-[2rem] border border-slate-200 bg-white p-7 shadow-soft">
              <p className="text-sm font-semibold text-slate-900">Con CierraPresupuesto</p>
              <ul className="mt-4 space-y-3 text-sm text-slate-700">
                {[
                  'Propuesta comercial coherente y profesional (siempre).',
                  'Score + feedback + riesgos: sabes qué arreglar.',
                  'Versión mejorada lista para enviar (sin reescribir).',
                  'Copiar por bloques para cerrar más rápido.',
                ].map((x) => (
                  <li key={x} className="flex gap-3">
                    <span className="mt-1 inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                    <span>{x}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-[2rem] border border-slate-200 bg-white p-7 shadow-soft">
              <p className="text-sm font-semibold text-slate-900">Sin una herramienta</p>
              <ul className="mt-4 space-y-3 text-sm text-slate-700">
                {[
                  'Copiar/pegar y “cada presupuesto distinto”.',
                  'No sabes por qué te dicen que no.',
                  'Cierre débil: falta CTA y reducción de riesgo.',
                  'Tiempo perdido reescribiendo y dudando.',
                ].map((x) => (
                  <li key={x} className="flex gap-3">
                    <span className="mt-1 inline-flex h-2 w-2 rounded-full bg-rose-500" />
                    <span>{x}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section id="como-funciona" className="py-14">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-10">
          <div className="grid gap-10 lg:grid-cols-2 lg:items-start">
            <div className="max-w-xl">
              <h2 className="text-2xl font-semibold text-slate-900">Una forma sencilla de trabajar mejor</h2>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                Pensado para el día a día de un autónomo: velocidad, claridad y control. La IA acelera el borrador, pero tú decides lo que se envía.
              </p>
              <div className="mt-6 space-y-4">
                {[
                  { n: '1', t: 'Describe el servicio', d: 'Tipo de cliente, descripción, precio y contexto.' },
                  { n: '2', t: 'Genera + analiza', d: 'Presupuesto profesional + score + riesgos.' },
                  { n: '3', t: 'Mejora y envía', d: 'Versión optimizada lista para copiar y mandar.' },
                ].map((s) => (
                  <div key={s.n} className="flex gap-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-soft">
                    <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-brand-600 text-sm font-semibold text-white">
                      {s.n}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{s.t}</p>
                      <p className="mt-1 text-sm leading-6 text-slate-600">{s.d}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-soft">
              <p className="text-sm font-semibold text-slate-900">Por qué se nota “más profesional”</p>
              <ul className="mt-4 space-y-3 text-sm text-slate-700">
                {[
                  'Estructura comercial (valor → entregables → condiciones → CTA).',
                  'Reducción de riesgo (opciones, claridad, próximos pasos).',
                  'Análisis accionable (feedback y riesgos, no solo texto).',
                  'Copiar por bloques para enviar rápido por email/WhatsApp.',
                ].map((x) => (
                  <li key={x} className="flex gap-3">
                    <span className="mt-1 inline-flex h-2 w-2 rounded-full bg-brand-600" />
                    <span>{x}</span>
                  </li>
                ))}
              </ul>
              
            </div>
          </div>
        </div>
      </section>

      <section className="py-14">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-10">
          <div className="rounded-[2.25rem] border border-slate-200 bg-slate-900 p-8 shadow-soft sm:p-10">
            <div className="grid gap-8 lg:grid-cols-2 lg:items-center">
              <div>
                <h2 className="text-2xl font-semibold text-white">¿Listo para que tu presupuesto suene a “sí”?</h2>
                <p className="mt-3 text-sm leading-6 text-slate-200">
                  Crea tu cuenta y empieza a generar presupuestos profesionales en segundos. Ideal para enviar por email o WhatsApp.
                </p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                <Link
                  href="/register"
                  className="inline-flex items-center justify-center rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-100"
                >
                  Regístrate gratis
                </Link>
                <Link
                  href="/app"
                  className="inline-flex items-center justify-center rounded-2xl bg-brand-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand-700"
                >
                  Probar demo
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="pricing" className="py-14">
        <PricingSection />
      </section>

      <section id="faq" className="py-14">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-10">
          <div className="max-w-3xl">
            <h2 className="text-2xl font-semibold text-slate-900">Preguntas frecuentes</h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              Resolvemos dudas típicas sobre cómo funciona la generación, el análisis y el modo fallback.
            </p>
          </div>
          <div className="mt-8 grid gap-4 lg:grid-cols-2">
            <FAQItem q="¿Qué es Mis presupuestos?" a="Es la sección donde puedes ver todos los presupuestos que has creado, organizados por fecha y cliente para un acceso rápido y gestión eficiente." />
            <FAQItem q="¿Cómo hacer un presupuesto profesional para un cliente?" a="Describe el servicio, precio, tipo de cliente y contexto. La IA genera automáticamente una propuesta comercial estructurada con valor, entregables y condiciones claras." />
            <FAQItem q="¿Puedo descargar los presupuestos en PDF?" a="Sí, en los planes Profesional y Empresa puedes exportar tus presupuestos a PDF con formato profesional listo para enviar." />
            <FAQItem q="¿Cómo me ayuda la IA a crear presupuestos?" a="La IA genera el texto del presupuesto, analiza la probabilidad de conversión con un score 0-100, identifica riesgos y sugiere versiones mejoradas para aumentar la aceptación." />
            <FAQItem q="¿Puedo revisar lo que propone la IA antes de enviarlo?" a="Sí, siempre puedes revisar, editar y decidir qué versión enviar al cliente. Tú mantienes el control total sobre el contenido final." />
            <FAQItem q="¿Puedo guardar notas antes de preparar un presupuesto?" a="Sí, puedes guardar información detallada sobre clientes y empresas para reutilizar en futuros presupuestos y mantener consistencia." />
            <FAQItem q="¿Puedo tener una página para que me pidan presupuestos?" a="Actualmente no ofrecemos páginas públicas, pero puedes compartir un enlace directo a tu formulario de contacto o usar integraciones personalizadas." />
            <FAQItem q="¿Puedo gestionar varias empresas?" a="Sí, puedes configurar múltiples empresas emisoras en tu cuenta para gestionar diferentes negocios o divisiones desde una sola plataforma." />
            <FAQItem q="¿Puedo revisar presupuestos antes de enviarlos al cliente?" a="Sí, todos los presupuestos se guardan como borrador primero, permitiéndote revisarlos, editarlos y aprobarlos antes del envío." />
            <FAQItem q="¿Hay un plan gratuito?" a="Sí, el plan Gratis te permite crear hasta 5 presupuestos al mes con análisis básico y todas las funciones esenciales para probar la herramienta." />
          </div>
        </div>
      </section>
    </>
  );
}
