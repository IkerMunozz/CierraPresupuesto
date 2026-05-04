'use client';

import { motion } from 'framer-motion';
import { useInView } from 'framer-motion';
import { useRef } from 'react';
import { FileText, Send, CheckCircle } from 'lucide-react';

const steps = [
  {
    number: '01',
    icon: FileText,
    title: 'Describe tu servicio',
    desc: 'Escribe el servicio, precio, tipo de cliente y contexto. La IA genera una propuesta comercial profesional en segundos.',
  },
  {
    number: '02',
    icon: Send,
    title: 'Envía y automatiza',
    desc: 'Envía el presupuesto y el sistema hace seguimiento automático. Emails adaptados al comportamiento de cada cliente.',
  },
  {
    number: '03',
    icon: CheckCircle,
    title: 'Cierra con datos',
    desc: 'Score de conversión, análisis de riesgos y funnel visual. Sabes exactamente dónde está cada presupuesto.',
  },
];

export default function HowItWorksSection() {
  return (
    <section id="como-funciona" className="py-24 lg:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-10">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-brand-600">
            Cómo funciona
          </p>
          <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-surface-900 sm:text-4xl">
            Tres pasos. Cero complicación.
          </h2>
          <p className="mt-5 text-lg text-slate-600">
            Sin configuración. Sin curva de aprendizaje. Empieza a cerrar en minutos.
          </p>
        </div>

        <div className="relative mx-auto mt-20 max-w-5xl">
          {/* Connecting line (desktop) */}
          <div className="absolute left-[16.67%] right-[16.67%] top-8 hidden h-px bg-gradient-to-r from-slate-200 via-brand-300 to-slate-200 md:block" />

          <div className="grid gap-12 md:grid-cols-3 md:gap-8">
            {steps.map((step, i) => (
              <StepCard key={step.number} step={step} index={i} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function StepCard({ step, index }: { step: typeof steps[0]; index: number }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-50px' });
  const Icon = step.icon;

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 24 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, delay: index * 0.15 }}
      className="relative text-center"
    >
      {/* Number circle */}
      <div className="relative mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-white shadow-card ring-1 ring-slate-100">
        <Icon size={24} className="text-brand-600" />
      </div>

      <div className="mb-2 text-xs font-extrabold tracking-[0.15em] text-brand-500">
        {step.number}
      </div>

      <h3 className="text-lg font-bold text-surface-900">{step.title}</h3>
      <p className="mt-3 text-sm leading-relaxed text-slate-500">{step.desc}</p>
    </motion.div>
  );
}
