'use client';

import { motion } from 'framer-motion';
import { useInView } from 'framer-motion';
import { useRef } from 'react';
import { Clock, XCircle, AlertTriangle, FileQuestion } from 'lucide-react';

const problems = [
  {
    icon: Clock,
    title: 'Pierdes horas en cada presupuesto',
    desc: 'Escribir, formatear, revisar... y al final el cliente ni responde.',
  },
  {
    icon: XCircle,
    title: 'No sabes por qué te rechazan',
    desc: 'Envías y esperas. Sin feedback, sin datos, sin saber qué falló.',
  },
  {
    icon: FileQuestion,
    title: 'Borradores que nunca se envían',
    desc: 'Creas presupuestos y se quedan en el cajón. El cliente se enfría.',
  },
  {
    icon: AlertTriangle,
    title: 'Sin seguimiento = sin ventas',
    desc: 'El 80% de ventas requieren 5+ contactos. ¿Cuántos haces tú?',
  },
];

export default function ProblemSection() {
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
            className="text-xs font-bold uppercase tracking-[0.25em] text-rose-500"
          >
            El problema
          </motion.p>

          <motion.h2
            initial={{ opacity: 0, y: 16 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, delay: 0.05 }}
            className="mt-4 text-3xl font-extrabold tracking-tight text-surface-900 sm:text-4xl"
          >
            Tu proceso de presupuestos
            <br />
            te está costando clientes
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="mt-5 text-lg text-slate-600"
          >
            Si te identificas con alguno de estos problemas, no estás solo.
          </motion.p>
        </div>

        <div className="mx-auto mt-16 grid max-w-4xl gap-5 sm:grid-cols-2">
          {problems.map((item, i) => (
            <ProblemCard key={item.title} item={item} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}

function ProblemCard({ item, index }: { item: typeof problems[0]; index: number }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-60px' });
  const Icon = item.icon;

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, delay: index * 0.08 }}
      className="group rounded-2xl border border-slate-200/80 bg-white p-7 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-rose-200 hover:shadow-card"
    >
      <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-rose-50 text-rose-500 transition-colors group-hover:bg-rose-100">
        <Icon size={20} />
      </div>
      <h3 className="text-base font-bold text-surface-900">{item.title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-slate-500">{item.desc}</p>
    </motion.div>
  );
}
