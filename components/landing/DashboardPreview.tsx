'use client';

import { motion } from 'framer-motion';
import { useInView } from 'framer-motion';
import { useRef } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts';
import { TrendingUp, BarChart3, FileText, Eye, CheckCircle, ArrowUpRight } from 'lucide-react';

const revenueData = [
  { month: 'Ene', value: 1200 },
  { month: 'Feb', value: 1800 },
  { month: 'Mar', value: 1400 },
  { month: 'Abr', value: 2200 },
  { month: 'May', value: 2800 },
  { month: 'Jun', value: 3200 },
  { month: 'Jul', value: 2900 },
  { month: 'Ago', value: 3600 },
  { month: 'Sep', value: 4100 },
  { month: 'Oct', value: 3800 },
  { month: 'Nov', value: 4200 },
  { month: 'Dic', value: 4800 },
];

const funnelData = [
  { stage: 'Creados', value: 48, color: '#94a3b8' },
  { stage: 'Enviados', value: 36, color: '#6366f1' },
  { stage: 'Vistos', value: 24, color: '#8b5cf6' },
  { stage: 'Aceptados', value: 14, color: '#10b981' },
];

const kpis = [
  {
    label: 'Ingresos potenciales',
    value: '4.200€',
    change: '+18%',
    icon: TrendingUp,
    color: 'text-emerald-600',
    bg: 'bg-emerald-50',
  },
  {
    label: 'Tasa de conversión',
    value: '35%',
    change: '+5%',
    icon: BarChart3,
    color: 'text-brand-600',
    bg: 'bg-brand-50',
  },
  {
    label: 'Enviados este mes',
    value: '12',
    change: '+3',
    icon: FileText,
    color: 'text-violet-600',
    bg: 'bg-violet-50',
  },
  {
    label: 'Aceptados',
    value: '5',
    change: '+2',
    icon: CheckCircle,
    color: 'text-sky-600',
    bg: 'bg-sky-50',
  },
];

export default function DashboardPreview() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });

  return (
    <section className="py-24 lg:py-32 bg-slate-50/50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-10">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-brand-600">
            Dashboard
          </p>
          <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-surface-900 sm:text-4xl">
            Todo bajo control
          </h2>
          <p className="mt-5 text-lg text-slate-600">
            Ingresos, conversión, funnel y acciones recomendadas por IA. Todo en un vistazo.
          </p>
        </div>

        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 40 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7, delay: 0.15 }}
          className="mt-16 rounded-2xl border border-slate-200 bg-white shadow-elevated overflow-hidden"
        >
          {/* Browser chrome */}
          <div className="border-b border-slate-100 bg-slate-50 px-5 py-3 flex items-center gap-3">
            <div className="flex gap-1.5">
              <div className="h-2.5 w-2.5 rounded-full bg-rose-400" />
              <div className="h-2.5 w-2.5 rounded-full bg-amber-400" />
              <div className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
            </div>
            <div className="flex-1 text-center text-[11px] font-medium text-slate-400">
              vendemas.ai/dashboard
            </div>
          </div>

          <div className="p-6 lg:p-8">
            {/* KPI row */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              {kpis.map((kpi) => {
                const Icon = kpi.icon;
                return (
                  <div key={kpi.label} className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                      <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${kpi.bg} ${kpi.color}`}>
                        <Icon size={16} />
                      </div>
                      <span className="inline-flex items-center gap-0.5 text-[11px] font-bold text-emerald-600">
                        <ArrowUpRight size={10} />
                        {kpi.change}
                      </span>
                    </div>
                    <p className="text-xl font-extrabold text-surface-900">{kpi.value}</p>
                    <p className="mt-0.5 text-[11px] font-medium text-slate-500">{kpi.label}</p>
                  </div>
                );
              })}
            </div>

            {/* Charts row */}
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Revenue chart */}
              <div className="rounded-xl border border-slate-100 p-6">
                <div className="flex items-center justify-between mb-6">
                  <h4 className="text-sm font-bold text-surface-900">Ingresos potenciales</h4>
                  <div className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-600">
                    <TrendingUp size={10} />
                    +42%
                  </div>
                </div>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={revenueData}>
                      <defs>
                        <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#6366f1" stopOpacity={0.2} />
                          <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }} tickFormatter={(v) => `${v / 1000}k`} />
                      <Tooltip
                        contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.08)', fontSize: '12px' }}
                        formatter={(value: number) => [`${value.toLocaleString()}€`, 'Ingresos']}
                      />
                      <Area type="monotone" dataKey="value" stroke="#6366f1" strokeWidth={2} fill="url(#areaGrad)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Funnel chart */}
              <div className="rounded-xl border border-slate-100 p-6">
                <div className="flex items-center justify-between mb-6">
                  <h4 className="text-sm font-bold text-surface-900">Funnel de ventas</h4>
                  <div className="flex items-center gap-1.5 rounded-full bg-brand-50 px-2.5 py-1 text-[11px] font-bold text-brand-600">
                    <Eye size={10} />
                    35% conversión
                  </div>
                </div>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={funnelData} layout="vertical" barSize={24}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                      <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }} />
                      <YAxis dataKey="stage" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b', fontWeight: 500 }} width={72} />
                      <Tooltip
                        contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.08)', fontSize: '12px' }}
                        formatter={(value: number) => [`${value} presupuestos`, '']}
                      />
                      <Bar dataKey="value" radius={[0, 6, 6, 0]} fill="#6366f1">
                        {funnelData.map((entry, index) => (
                          <cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* AI summary */}
            <div className="mt-6 rounded-xl bg-surface-900 p-6">
              <div className="flex items-center gap-2 mb-3">
                <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
                  Resumen ejecutivo IA
                </span>
              </div>
              <p className="text-sm text-slate-300 leading-relaxed">
                Tu conversión está en <strong className="text-white">35%</strong> con{' '}
                <strong className="text-white">12 propuestas</strong> enviadas este mes. Detectamos{' '}
                <strong className="text-amber-400">3 borradores sin enviar</strong> que representan{' '}
                <strong className="text-amber-400">1.800€ potenciales</strong>. Prioriza enviarlos esta semana para maximizar ingresos.
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
