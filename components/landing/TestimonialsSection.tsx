'use client';

import { motion } from 'framer-motion';
import { useInView } from 'framer-motion';
import { useRef } from 'react';
import { Star, MessageSquare, BarChart3, Users, FileText } from 'lucide-react';

const testimonials = [
  {
    name: 'María García',
    role: 'Freelance · Diseñadora',
    text: 'Antes tardaba 20 minutos en cada presupuesto y nunca sabía si estaba bien. Ahora lo genero en 2 minutos y el análisis de IA me dice exactamente qué mejorar. Mi tasa de aceptación subió un 40%.',
    initials: 'MG',
  },
  {
    name: 'Pablo Ruiz',
    role: 'Consultor IT',
    text: 'El seguimiento automático es un game changer. Antes se me olvidaba hacer seguimiento y perdía clientes. Ahora el sistema envía emails por mí y yo solo me preocupo de cerrar.',
    initials: 'PR',
  },
  {
    name: 'Agencia Pixel',
    role: 'Estudio de Marketing',
    text: 'Usamos VendeMás para todos nuestros presupuestos. El dashboard nos da visibilidad total del pipeline y los scores de conversión nos ayudan a priorizar. Imprescindible.',
    initials: 'AP',
  },
];

const metrics = [
  { icon: FileText, value: '1.200+', label: 'Presupuestos generados' },
  { icon: BarChart3, value: '35%', label: 'Conversión media' },
  { icon: Users, value: '150+', label: 'Profesionales activos' },
  { icon: MessageSquare, value: '3.000+', label: 'Seguimientos enviados' },
];

export default function TestimonialsSection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-80px' });

  return (
    <section className="py-24 lg:py-32 bg-slate-50/50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-10">
        {/* Section header */}
        <div ref={ref} className="mx-auto max-w-2xl text-center">
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5 }}
            className="text-xs font-bold uppercase tracking-[0.25em] text-brand-600"
          >
            Testimonios
          </motion.p>

          <motion.h2
            initial={{ opacity: 0, y: 16 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, delay: 0.05 }}
            className="mt-4 text-3xl font-extrabold tracking-tight text-surface-900 sm:text-4xl"
          >
            Lo que dicen nuestros usuarios
          </motion.h2>
        </div>

        {/* Metrics */}
        <div className="mx-auto mt-16 grid max-w-3xl grid-cols-2 lg:grid-cols-4 gap-4 mb-16">
          {metrics.map((metric, i) => {
            const Icon = metric.icon;
            return (
              <motion.div
                key={metric.label}
                initial={{ opacity: 0, y: 16 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.5, delay: i * 0.08 + 0.1 }}
                className="rounded-2xl border border-slate-100 bg-white p-6 text-center shadow-sm"
              >
                <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                  <Icon size={18} />
                </div>
                <p className="text-2xl font-extrabold text-surface-900">{metric.value}</p>
                <p className="mt-1 text-[11px] font-medium text-slate-500">{metric.label}</p>
              </motion.div>
            );
          })}
        </div>

        {/* Testimonials */}
        <div className="mx-auto max-w-5xl grid gap-6 md:grid-cols-3">
          {testimonials.map((t, i) => (
            <TestimonialCard key={t.name} testimonial={t} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}

function TestimonialCard({ testimonial, index }: { testimonial: typeof testimonials[0]; index: number }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-50px' });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, delay: index * 0.1 + 0.2 }}
      className="rounded-2xl border border-slate-100 bg-white p-7 shadow-sm transition-all hover:shadow-card"
    >
      <div className="flex gap-0.5 mb-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Star key={i} size={14} className="fill-amber-400 text-amber-400" />
        ))}
      </div>
      <p className="text-sm leading-relaxed text-slate-600 mb-6">&ldquo;{testimonial.text}&rdquo;</p>
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-violet-600 text-white font-bold text-xs">
          {testimonial.initials}
        </div>
        <div>
          <p className="text-sm font-bold text-surface-900">{testimonial.name}</p>
          <p className="text-xs text-slate-500">{testimonial.role}</p>
        </div>
      </div>
    </motion.div>
  );
}
