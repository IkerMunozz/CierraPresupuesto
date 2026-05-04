'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { useInView } from 'framer-motion';
import { useRef } from 'react';
import { ArrowRight, Clock } from 'lucide-react';

export default function FinalCtaSection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });

  return (
    <section className="py-24 lg:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-10">
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-slate-900 via-brand-950 to-slate-900 p-10 lg:p-16"
        >
          {/* Glow accents - more controlled */}
          <div className="absolute top-0 right-0 h-96 w-96 rounded-full bg-brand-500/20 blur-[140px]" />
          <div className="absolute bottom-0 left-0 h-96 w-96 rounded-full bg-violet-600/15 blur-[140px]" />

          <div className="relative z-10 mx-auto max-w-2xl text-center">
            <motion.div
              initial={{ opacity: 0 }}
              animate={isInView ? { opacity: 1 } : {}}
              transition={{ delay: 0.2 }}
              className="mb-8 inline-flex items-center gap-2 rounded-full bg-white/10 px-5 py-2 text-xs font-bold text-white backdrop-blur-sm"
            >
              <Clock size={14} />
              <span>Empieza gratis en menos de 1 minuto</span>
            </motion.div>

            <h2 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl lg:text-5xl">
              Tu pr&oacute;ximo cliente est&aacute; esperando
              <br />
              <span className="bg-gradient-to-r from-white to-brand-200 bg-clip-text text-transparent">
                un presupuesto profesional
              </span>
            </h2>

            <p className="mx-auto mt-6 max-w-xl text-lg text-slate-300">
              Cada d&iacute;a que pasa sin enviar un presupuesto es una venta que podr&iacute;as haber cerrado. Empieza ahora, es gratis.
            </p>

            <div className="mx-auto mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <Link
                href="/register"
                className="group inline-flex items-center gap-2 rounded-xl bg-white px-8 py-4 text-sm font-bold text-slate-900 shadow-xl transition-all hover:bg-slate-50 hover:shadow-2xl active:scale-[0.98]"
              >
                Empezar gratis
                <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />
              </Link>
            </div>

            <div className="mt-10 flex flex-wrap items-center justify-center gap-6 text-sm font-medium text-slate-300">
              <span className="inline-flex items-center gap-1.5">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-brand-300">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
                5 presupuestos gratis
              </span>
              <span className="inline-flex items-center gap-1.5">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-brand-300">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
                Sin tarjeta de cr&eacute;dito
              </span>
              <span className="inline-flex items-center gap-1.5">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-brand-300">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
                Sin compromiso
              </span>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
