'use client';

import { motion } from 'framer-motion';
import { useInView } from 'framer-motion';
import { useRef } from 'react';
import { CheckCircle2, Zap, TrendingUp, Shield } from 'lucide-react';

const features = [
  {
    icon: Zap,
    title: 'Generación en segundos',
    desc: 'Describe tu servicio y la IA crea una propuesta comercial profesional.',
  },
  {
    icon: TrendingUp,
    title: 'Score de conversión',
    desc: 'Analiza la probabilidad de cierre con datos reales, no intuición.',
  },
  {
    icon: Shield,
    title: 'Seguimiento automático',
    desc: 'Emails adaptativos que se envían según el comportamiento del cliente.',
  },
  {
    icon: CheckCircle2,
    title: 'Control total',
    desc: 'Revisa, edita y decide qué enviar. Tú mantienes el control siempre.',
  },
];

export default function SolutionSection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-80px' });

  return (
    <section className="py-24 lg:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-10">
        <div ref={ref} className="mx-auto max-w-2xl text-center mb-16">
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5 }}
            className="text-xs font-bold uppercase tracking-[0.25em] text-brand-600"
          >
            La solución
          </motion.p>

          <motion.h2
            initial={{ opacity: 0, y: 16 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, delay: 0.05 }}
            className="mt-4 text-3xl font-extrabold tracking-tight text-surface-900 sm:text-4xl"
          >
            Tu máquina de ventas
            <br />
            con piloto automático
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="mt-5 text-lg text-slate-600"
          >
            De presupuestos manuales a un sistema completo que genera, analiza y cierra por ti.
          </motion.p>
        </div>

        {/* Before/After visual */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.15 }}
          className="mx-auto mb-16 grid max-w-4xl gap-6 md:grid-cols-2"
        >
          {/* Before */}
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-8">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-slate-200 px-3 py-1 text-xs font-bold text-slate-600">
              <span className="h-2 w-2 rounded-full bg-slate-400" />
              Antes
            </div>
            <ul className="space-y-4">
              {[
                '30 min por presupuesto',
                'Sin estructura comercial',
                'Sin seguimiento',
                'Sin datos ni métricas',
              ].map((item) => (
                <li key={item} className="flex items-start gap-3 text-sm text-slate-500">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-200 text-slate-400">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                      <path d="M18 6L6 18M6 6l12 12" />
                    </svg>
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* After */}
          <div className="rounded-2xl border border-brand-200 bg-brand-50/40 p-8">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-brand-500 px-3 py-1 text-xs font-bold text-white">
              <span className="h-2 w-2 rounded-full bg-white" />
              Con VendeMás
            </div>
            <ul className="space-y-4">
              {[
                '2 minutos con IA',
                'Estructura comercial probada',
                'Seguimiento automático',
                'Dashboard con métricas reales',
              ].map((item) => (
                <li key={item} className="flex items-start gap-3 text-sm text-slate-700">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-500 text-white">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                      <path d="M5 13l4 4L19 7" />
                    </svg>
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </motion.div>

        {/* Feature grid */}
        <div className="mx-auto max-w-4xl grid gap-5 sm:grid-cols-2">
          {features.map((f, i) => (
            <FeatureItem key={f.title} feature={f} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}

function FeatureItem({ feature, index }: { feature: typeof features[0]; index: number }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-50px' });
  const Icon = feature.icon;

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 16 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, delay: index * 0.08 }}
      className="flex gap-4 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm transition-all hover:border-brand-200 hover:shadow-card"
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
        <Icon size={18} />
      </div>
      <div>
        <h3 className="text-sm font-bold text-surface-900">{feature.title}</h3>
        <p className="mt-1 text-sm leading-relaxed text-slate-500">{feature.desc}</p>
      </div>
    </motion.div>
  );
}
