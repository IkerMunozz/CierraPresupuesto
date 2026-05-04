'use client';

import { motion } from 'framer-motion';
import { useInView } from 'framer-motion';
import { useRef } from 'react';
import {
  TrendingUp,
  Clock,
  Shield,
  Target,
  Zap,
  BarChart3,
} from 'lucide-react';

const benefits = [
  {
    icon: TrendingUp,
    title: 'Aumenta tus conversiones',
    desc: 'Presupuestos con estructura comercial probada: valor, entregables, condiciones y CTA. Tus clientes entienden por qué deben decir que sí.',
  },
  {
    icon: Clock,
    title: 'Ahorra horas cada semana',
    desc: 'Lo que antes te llevaba 30 minutos ahora tarda 2 minutos. La IA genera el texto, tú revisas y envías.',
  },
  {
    icon: Shield,
    title: 'Profesionaliza tu negocio',
    desc: 'Cada presupuesto con la misma calidad. Sin copiar/pegar, sin errores, sin presupuestos distintos para cada cliente.',
  },
  {
    icon: Target,
    title: 'No pierdas oportunidades',
    desc: 'Seguimiento automático que no olvida a nadie. El 80% de ventas requieren 5+ contactos. El sistema los hace por ti.',
  },
  {
    icon: Zap,
    title: 'Decide con datos',
    desc: 'Score de conversión, análisis de riesgos y diagnóstico de tu funnel. Sabes exactamente dónde mejorar.',
  },
  {
    icon: BarChart3,
    title: 'Control total del pipeline',
    desc: 'Dashboard con ingresos potenciales, tasa de conversión, funnel visual y actividades recientes. Todo en un vistazo.',
  },
];

export default function BenefitsSection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-80px' });

  return (
    <section className="py-24 lg:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-10">
        <div ref={ref} className="mx-auto max-w-2xl text-center">
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5 }}
            className="text-xs font-bold uppercase tracking-[0.25em] text-brand-600"
          >
            Beneficios
          </motion.p>

          <motion.h2
            initial={{ opacity: 0, y: 16 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, delay: 0.05 }}
            className="mt-4 text-3xl font-extrabold tracking-tight text-surface-900 sm:text-4xl"
          >
            Todo lo que necesitas para vender más
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="mt-5 text-lg text-slate-600"
          >
            No es solo generar presupuestos. Es un sistema completo para cerrar más ventas.
          </motion.p>
        </div>

        <div className="mx-auto mt-16 grid max-w-5xl gap-6 md:grid-cols-2">
          {benefits.map((benefit, i) => (
            <BenefitCard key={benefit.title} benefit={benefit} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}

function BenefitCard({ benefit, index }: { benefit: typeof benefits[0]; index: number }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-50px' });
  const Icon = benefit.icon;

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, delay: index * 0.08 }}
      className="group flex gap-5 rounded-2xl border border-slate-100 bg-white p-7 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-brand-200 hover:shadow-card"
    >
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600 transition-colors group-hover:bg-brand-100">
        <Icon size={22} />
      </div>
      <div>
        <h3 className="text-base font-bold text-surface-900">{benefit.title}</h3>
        <p className="mt-2 text-sm leading-relaxed text-slate-500">{benefit.desc}</p>
      </div>
    </motion.div>
  );
}
