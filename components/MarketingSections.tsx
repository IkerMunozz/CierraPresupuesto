import LogosMarquee from '@/components/LogosMarquee';
import PricingSection from '@/components/PricingSection';
import {
  HeroSection,
  ProblemSection,
  SolutionSection,
  HowItWorksSection,
  DashboardPreview,
  BenefitsSection,
  TestimonialsSection,
  FinalCtaSection,
} from '@/components/landing';

function FAQItem({ q, a }: { q: string; a: string }) {
  return (
    <details className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <summary className="cursor-pointer list-none text-sm font-semibold text-surface-900">
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
      <HeroSection />

      <section className="py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-10">
          <p className="text-center text-xs font-semibold uppercase tracking-[0.2em] text-slate-400 mb-4">
            Confían en nosotros
          </p>
          <LogosMarquee />
        </div>
      </section>

      <ProblemSection />

      <SolutionSection />

      <HowItWorksSection />

      <DashboardPreview />

      <BenefitsSection />

      <TestimonialsSection />

      <section id="pricing" className="py-24 lg:py-32">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-10">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-brand-600">
              Precios
            </p>
            <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-surface-900 sm:text-4xl">
              Elige tu plan
            </h2>
            <p className="mt-5 text-lg text-slate-600">
              Empieza gratis. Mejora cuando lo necesites.
            </p>
          </div>
        </div>
        <div className="mt-16">
          <PricingSection />
        </div>
      </section>

      <FinalCtaSection />

      <section id="faq" className="py-24 lg:py-32">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-10">
          <div className="mx-auto max-w-2xl text-center mb-12">
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-brand-600">
              FAQ
            </p>
            <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-surface-900 sm:text-4xl">
              Preguntas frecuentes
            </h2>
          </div>
          <div className="mx-auto max-w-3xl grid gap-4 md:grid-cols-2">
            <FAQItem q="¿Qué es VendeMás?" a="Es una herramienta con IA que genera presupuestos profesionales, analiza la probabilidad de cierre y hace seguimiento automático para que cierres más ventas." />
            <FAQItem q="¿Cómo hacer un presupuesto profesional?" a="Describe el servicio, precio, tipo de cliente y contexto. La IA genera automáticamente una propuesta comercial estructurada con valor, entregables y condiciones claras." />
            <FAQItem q="¿Puedo descargar los presupuestos en PDF?" a="Sí, en los planes Pro y Business puedes exportar tus presupuestos a PDF con formato profesional listo para enviar." />
            <FAQItem q="¿Cómo me ayuda la IA?" a="La IA genera el texto del presupuesto, analiza la probabilidad de conversión con un score 0-100, identifica riesgos y sugiere versiones mejoradas para aumentar la aceptación." />
            <FAQItem q="¿Puedo revisar lo que propone la IA?" a="Sí, siempre puedes revisar, editar y decidir qué versión enviar al cliente. Tú mantienes el control total sobre el contenido final." />
            <FAQItem q="¿Hay un plan gratuito?" a="Sí, el plan Gratis te permite crear hasta 5 presupuestos al mes con análisis básico y todas las funciones esenciales para probar la herramienta." />
            <FAQItem q="¿Cómo funciona el seguimiento automático?" a="Cuando envías un presupuesto, el sistema detecta si el cliente lo ha visto y envía emails de seguimiento a los 3, 7 y 10 días. Cada email se adapta al comportamiento del cliente." />
            <FAQItem q="¿Puedo gestionar varias empresas?" a="Sí, puedes configurar múltiples empresas emisoras en tu cuenta para gestionar diferentes negocios o divisiones desde una sola plataforma." />
          </div>
        </div>
      </section>
    </>
  );
}
