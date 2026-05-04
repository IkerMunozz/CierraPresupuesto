'use client';

import Link from 'next/link';
import { ArrowRight, Sparkles, AlertTriangle, TrendingUp, Clock, Target } from 'lucide-react';

interface CopilotData {
  mode: string;
  insight: string;
  data: {
    metric: string;
    value: string;
    context: string;
  }[];
  action: string;
  impact: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
}

const priorityConfig = {
  critical: {
    label: 'URGENTE',
    bg: 'bg-rose-500',
    text: 'text-rose-400',
    border: 'border-rose-500/20',
    icon: <AlertTriangle size={16} />,
  },
  high: {
    label: 'ALTA',
    bg: 'bg-amber-500',
    text: 'text-amber-400',
    border: 'border-amber-500/20',
    icon: <TrendingUp size={16} />,
  },
  medium: {
    label: 'MEDIA',
    bg: 'bg-blue-500',
    text: 'text-blue-400',
    border: 'border-blue-500/20',
    icon: <Clock size={16} />,
  },
  low: {
    label: 'BAJA',
    bg: 'bg-slate-500',
    text: 'text-slate-400',
    border: 'border-slate-500/20',
    icon: <Target size={16} />,
  },
};

export default function CopilotCard({ copilot }: { copilot: CopilotData }) {
  const config = priorityConfig[copilot.priority];

  return (
    <section className="bg-slate-900 rounded-[2rem] border border-slate-800 overflow-hidden shadow-lg shadow-slate-200 relative">
      {/* Top accent line */}
      <div className={`h-1 ${config.bg}`} />

      <div className="p-7">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-brand-500/10 flex items-center justify-center text-brand-400">
              <Sparkles size={18} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Copiloto de Ventas</h3>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Qué hacer hoy</p>
            </div>
          </div>
          <span className={`inline-flex items-center gap-1 text-[10px] font-extrabold px-2.5 py-1 rounded-md bg-white/5 ${config.text}`}>
            {config.icon}
            {config.label}
          </span>
        </div>

        {/* Insight */}
        <p className="text-sm text-slate-300 leading-relaxed mb-6">
          {copilot.insight}
        </p>

        {/* Data points */}
        <div className="space-y-3 mb-6">
          {copilot.data.map((d, i) => (
            <div key={i} className="flex items-start justify-between gap-3 rounded-xl bg-white/5 px-4 py-3 border border-white/5">
              <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{d.metric}</p>
                <p className="text-sm font-bold text-white mt-0.5">{d.value}</p>
              </div>
              <p className="text-[10px] text-slate-500 text-right leading-relaxed max-w-[120px]">{d.context}</p>
            </div>
          ))}
        </div>

        {/* Action */}
        <div className="rounded-xl bg-brand-500/10 border border-brand-500/20 p-4 mb-5">
          <p className="text-[10px] font-bold text-brand-400 uppercase tracking-widest mb-1">Acción recomendada</p>
          <p className="text-sm text-white font-medium leading-relaxed">{copilot.action}</p>
        </div>

        {/* Impact */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp size={14} className="text-emerald-400" />
            <span className="text-xs font-bold text-emerald-400">{copilot.impact}</span>
          </div>
          <Link
            href="/app/dashboard"
            className="inline-flex items-center gap-1.5 text-[10px] font-bold text-brand-400 uppercase tracking-widest hover:gap-2.5 transition-all"
          >
            <span>Ver detalles</span>
            <ArrowRight size={10} />
          </Link>
        </div>
      </div>

      {/* Background decoration */}
      <div className="absolute -bottom-20 -right-20 opacity-5">
        <Sparkles size={200} className="text-white" />
      </div>
    </section>
  );
}
