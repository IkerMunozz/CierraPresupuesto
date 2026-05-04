'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight, Sparkles, Clock, ShieldCheck } from 'lucide-react';
import { useRef } from 'react';

export default function HeroSection() {
  const mockupRef = useRef<HTMLDivElement>(null);

  return (
    <section className="relative overflow-hidden pt-24 pb-20 lg:pt-36 lg:pb-32">
      {/* Background */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-b from-brand-50/50 via-white to-white" />
        <div className="absolute left-1/4 top-0 h-[500px] w-[600px] -translate-x-1/2 rounded-full bg-brand-400/10 blur-[120px]" />
        <div className="absolute right-1/4 top-20 h-[400px] w-[500px] rounded-full bg-violet-400/10 blur-[120px]" />
      </div>

      {/* Grid pattern overlay */}
      <div className="absolute inset-0 -z-5 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(circle, #000 1px, transparent 1px)', backgroundSize: '32px 32px' }} />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-10">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          {/* Left: Text */}
          <div className="max-w-xl">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="mb-8"
            >
              <span className="inline-flex items-center gap-2 rounded-full border border-brand-200/80 bg-white px-4 py-1.5 text-xs font-semibold text-brand-600 shadow-sm">
                <Sparkles size={12} />
                IA que cierra ventas por ti
              </span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.05 }}
              className="text-4xl font-extrabold tracking-tight text-surface-900 sm:text-5xl lg:text-[3.5rem] lg:leading-[1.1]"
            >
              Presupuestos que
              <br />
              <span className="bg-gradient-to-r from-brand-600 via-violet-600 to-purple-600 bg-clip-text text-transparent">
                cierran ventas
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="mt-6 text-lg leading-relaxed text-slate-600 sm:text-xl"
            >
              Crea presupuestos profesionales en segundos. La IA analiza, mejora y hace seguimiento automático para que cierres más sin esfuerzo.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.15 }}
              className="mt-10 flex flex-col items-start gap-4 sm:flex-row"
            >
              <Link
                href="/register"
                className="group inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-brand-600 to-violet-600 px-7 py-3.5 text-sm font-bold text-white shadow-lg shadow-brand-500/25 transition-all hover:shadow-xl hover:shadow-brand-500/30 active:scale-[0.98]"
              >
                Empezar gratis
                <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />
              </Link>
              <Link
                href="#como-funciona"
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-7 py-3.5 text-sm font-bold text-slate-700 shadow-sm transition-all hover:border-slate-300 hover:bg-slate-50"
              >
                Ver cómo funciona
              </Link>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-3 text-xs font-medium text-slate-500"
            >
              <span className="inline-flex items-center gap-1.5">
                <Clock size={13} className="text-emerald-500" />
                Gratis en 1 minuto
              </span>
              <span className="inline-flex items-center gap-1.5">
                <ShieldCheck size={13} className="text-emerald-500" />
                Sin tarjeta de crédito
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Sparkles size={13} className="text-emerald-500" />
                IA incluida siempre
              </span>
            </motion.div>
          </div>

          {/* Right: Mockup */}
          <motion.div
            ref={mockupRef}
            initial={{ opacity: 0, x: 40, rotate: 1 }}
            animate={{ opacity: 1, x: 0, rotate: 0 }}
            transition={{ duration: 0.7, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="relative hidden lg:block"
          >
            {/* Glow behind mockup */}
            <div className="absolute inset-0 -z-10 translate-y-4 rounded-[2rem] bg-gradient-to-br from-brand-400/20 via-violet-400/20 to-purple-400/20 blur-2xl" />

            {/* Main mockup card */}
            <div className="animate-float rounded-[1.5rem] border border-slate-200/60 bg-white/80 p-3 shadow-elevated backdrop-blur-xl">
              {/* Browser chrome */}
              <div className="mb-3 flex items-center gap-2 rounded-xl bg-slate-50 px-4 py-2.5">
                <div className="flex gap-1.5">
                  <div className="h-2.5 w-2.5 rounded-full bg-rose-400/80" />
                  <div className="h-2.5 w-2.5 rounded-full bg-amber-400/80" />
                  <div className="h-2.5 w-2.5 rounded-full bg-emerald-400/80" />
                </div>
                <div className="flex-1 text-center text-[11px] font-medium text-slate-400">
                  vendemas.ai/dashboard
                </div>
              </div>

              {/* Dashboard content */}
              <div className="rounded-xl bg-slate-50 p-5">
                <div className="mb-4 flex items-center justify-between">
                  <div className="h-3 w-24 rounded bg-slate-200" />
                  <div className="h-6 w-16 rounded-lg bg-brand-500/10" />
                </div>

                {/* KPI row */}
                <div className="mb-5 grid grid-cols-3 gap-3">
                  <div className="rounded-lg bg-white p-3 shadow-sm">
                    <div className="mb-2 h-2 w-12 rounded bg-slate-200" />
                    <div className="h-4 w-16 rounded bg-slate-900/80" />
                  </div>
                  <div className="rounded-lg bg-white p-3 shadow-sm">
                    <div className="mb-2 h-2 w-12 rounded bg-slate-200" />
                    <div className="h-4 w-10 rounded bg-brand-500/80" />
                  </div>
                  <div className="rounded-lg bg-white p-3 shadow-sm">
                    <div className="mb-2 h-2 w-12 rounded bg-slate-200" />
                    <div className="h-4 w-12 rounded bg-emerald-500/80" />
                  </div>
                </div>

                {/* Chart area */}
                <div className="rounded-lg bg-white p-4 shadow-sm">
                  <div className="mb-3 flex items-center gap-2">
                    <div className="h-2 w-16 rounded bg-slate-200" />
                    <div className="h-4 w-8 rounded-full bg-emerald-100 text-[9px] font-bold leading-4 text-emerald-700 text-center">+35%</div>
                  </div>
                  {/* SVG chart */}
                  <svg viewBox="0 0 300 80" className="w-full">
                    <defs>
                      <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#6366f1" stopOpacity="0.3" />
                        <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    <path d="M0,60 C30,55 60,45 90,50 S150,35 180,40 S240,20 270,25 L300,15 L300,80 L0,80 Z" fill="url(#chartGrad)" />
                    <path d="M0,60 C30,55 60,45 90,50 S150,35 180,40 S240,20 270,25 L300,15" fill="none" stroke="#6366f1" strokeWidth="2.5" strokeLinecap="round" />
                    <circle cx="270" cy="25" r="4" fill="#6366f1" />
                  </svg>
                </div>

                {/* Bottom row */}
                <div className="mt-4 flex gap-3">
                  <div className="flex-1 rounded-lg border border-slate-100 bg-white p-3">
                    <div className="mb-2 flex items-center gap-1.5">
                      <div className="h-2 w-2 rounded-full bg-amber-400" />
                      <div className="h-2 w-14 rounded bg-slate-200" />
                    </div>
                    <div className="h-2 w-full rounded bg-slate-100" />
                  </div>
                  <div className="flex-1 rounded-lg border border-slate-100 bg-white p-3">
                    <div className="mb-2 flex items-center gap-1.5">
                      <div className="h-2 w-2 rounded-full bg-emerald-400" />
                      <div className="h-2 w-12 rounded bg-slate-200" />
                    </div>
                    <div className="h-2 w-full rounded bg-slate-100" />
                  </div>
                </div>
              </div>
            </div>

            {/* Floating badge */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8, duration: 0.5 }}
              className="absolute -bottom-4 -left-8 rounded-xl border border-slate-200/60 bg-white/90 px-4 py-3 shadow-card backdrop-blur-sm"
            >
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600">
                  <Sparkles size={16} />
                </div>
                <div>
                  <p className="text-[11px] font-bold text-slate-900">Score: 87/100</p>
                  <p className="text-[10px] text-slate-500">Alta probabilidad</p>
                </div>
              </div>
            </motion.div>

            {/* Floating badge top right */}
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1, duration: 0.5 }}
              className="absolute -right-4 -top-4 rounded-xl border border-slate-200/60 bg-white/90 px-4 py-3 shadow-card backdrop-blur-sm"
            >
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-100 text-brand-600">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
                  </svg>
                </div>
                <div>
                  <p className="text-[11px] font-bold text-slate-900">Presupuesto enviado</p>
                  <p className="text-[10px] text-slate-500">Hace 2 min</p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
