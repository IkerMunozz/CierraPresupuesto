// components/dashboard/EnterpriseDashboard.tsx
'use client';

import React from 'react';
import Link from 'next/link';
import { 
  ArrowUpRight, 
  ArrowDownRight, 
  BarChart3, 
  FileText, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  Zap,
  MoreVertical,
  Plus,
  ArrowRight,
  Target
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts';

interface DashboardData {
  kpis: {
    potentialRevenue: number;
    potentialRevenueChange: number;
    conversionRate: number;
    conversionRateChange: number;
    sent: number;
    sentChange: number;
    accepted: number;
    acceptedChange: number;
  };
  summary: {
    text: string;
    status: 'positive' | 'neutral' | 'attention';
  };
  funnel: {
    chartData: any[];
    explanation: string;
  };
  insights: any[];
  actions: any[];
  activities: any[];
  quotes: any[];
}

export function EnterpriseDashboard({ data, userName }: { data: DashboardData, userName?: string }) {
  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(val);

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-20">
      <main className="max-w-[1600px] mx-auto px-6 py-8">
        
        {/* Welcome message */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-slate-900">Hola, {userName || 'Usuario'}</h2>
          <p className="text-slate-500 mt-1">Aquí tienes el resumen del estado de tu negocio hoy.</p>
        </div>

        {/* executive Summary & KPI Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8">
          
          {/* Summary Box */}
          <div className="lg:col-span-8">
            <div className={`h-full rounded-[2rem] p-8 border ${
              data.summary.status === 'attention' ? 'bg-amber-50 border-amber-100' : 'bg-slate-900 border-slate-800'
            } shadow-sm relative overflow-hidden group`}>
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-6">
                  <div className={`h-2 w-2 rounded-full ${data.summary.status === 'attention' ? 'bg-amber-500' : 'bg-emerald-500'} animate-pulse`} />
                  <span className={`text-[10px] font-bold uppercase tracking-[0.2em] ${data.summary.status === 'attention' ? 'text-amber-800' : 'text-slate-400'}`}>
                    Resumen Ejecutivo
                  </span>
                </div>
                <p className={`text-xl lg:text-2xl leading-relaxed font-medium ${data.summary.status === 'attention' ? 'text-amber-900' : 'text-white'}`}>
                  {data.summary.text.split('**').map((part, i) => i % 2 === 1 ? <span key={i} className={data.summary.status === 'attention' ? 'font-bold text-amber-950' : 'font-bold text-brand-500'}>{part}</span> : part)}
                </p>
              </div>
              <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
                <Target size={120} className={data.summary.status === 'attention' ? 'text-amber-900' : 'text-white'} />
              </div>
            </div>
          </div>

          {/* Side KPIs */}
          <div className="lg:col-span-4 grid grid-cols-1 gap-6">
            <KPICard 
              title="Ingresos Potenciales" 
              value={formatCurrency(data.kpis.potentialRevenue)} 
              change={data.kpis.potentialRevenueChange}
              icon={<Zap size={20} className="text-brand-500" />}
            />
            <KPICard 
              title="Tasa de Conversión" 
              value={`${data.kpis.conversionRate}%`} 
              change={data.kpis.conversionRateChange}
              icon={<Target size={20} className="text-emerald-500" />}
            />
          </div>
        </div>

        {/* Main Section */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Column: Funnel & Table */}
          <div className="lg:col-span-8 space-y-8">
            
            {/* Funnel Section */}
            <section className="bg-white rounded-[2rem] border border-slate-200 p-8 shadow-sm">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="text-base font-bold text-slate-900">Análisis del Funnel</h3>
                  <p className="text-xs text-slate-500 mt-1">Visualización del flujo de conversión y fugas</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">Últimos 30 días</span>
                </div>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                <div className="h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart layout="vertical" data={data.funnel.chartData} margin={{ left: 0, right: 40 }}>
                      <XAxis type="number" hide />
                      <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 12, fontWeight: 600, fill: '#64748b' }} width={100} />
                      <Tooltip 
                        cursor={{ fill: 'transparent' }}
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            return (
                              <div className="bg-slate-900 text-white p-3 rounded-xl shadow-xl border border-slate-800 text-xs">
                                <p className="font-bold mb-1">{payload[0].payload.name}</p>
                                <p className="opacity-70">{payload[0].value} presupuestos</p>
                                <p className="text-brand-400 font-bold mt-1">{formatCurrency(payload[0].payload.dinero)}</p>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Bar dataKey="valor" radius={[0, 8, 8, 0]} barSize={32}>
                        {data.funnel.chartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} fillOpacity={0.9} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100">
                  <div className="flex items-center gap-2 text-slate-900 font-bold text-sm mb-3">
                    <AlertCircle size={16} className="text-brand-600" />
                    <span>Diagnóstico IA</span>
                  </div>
                  <p className="text-sm text-slate-600 leading-relaxed italic">
                    {data.funnel.explanation.split('**').map((part, i) => i % 2 === 1 ? <b key={i} className="text-slate-900">{part}</b> : part)}
                  </p>
                </div>
              </div>
            </section>

            {/* Table Section */}
            <section className="bg-white rounded-[2rem] border border-slate-200 overflow-hidden shadow-sm">
              <div className="p-8 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-900">Presupuestos Recientes</h3>
                  <p className="text-xs text-slate-500 mt-1">Gestión detallada de propuestas activas</p>
                </div>
                <button className="p-2 hover:bg-slate-50 rounded-xl transition-colors">
                  <MoreVertical size={20} className="text-slate-400" />
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/50">
                      <th className="px-8 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Cliente</th>
                      <th className="px-8 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">IA Score</th>
                      <th className="px-8 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Importe</th>
                      <th className="px-8 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Estado</th>
                      <th className="px-8 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {data.quotes.map((quote) => (
                      <tr key={quote.id} className="group hover:bg-slate-50/50 transition-colors">
                        <td className="px-8 py-5">
                          <p className="text-sm font-bold text-slate-900">{quote.clientName}</p>
                          <p className="text-[10px] text-slate-400 font-medium mt-0.5">{new Date(quote.date).toLocaleDateString('es-ES')}</p>
                        </td>
                        <td className="px-8 py-5">
                          <div className="flex justify-center">
                            <div className={`h-8 w-8 rounded-lg flex items-center justify-center text-xs font-bold border ${
                              quote.score >= 80 ? 'bg-emerald-50 border-emerald-100 text-emerald-700' :
                              quote.score >= 60 ? 'bg-brand-50 border-brand-100 text-brand-700' :
                              'bg-slate-50 border-slate-100 text-slate-600'
                            }`}>
                              {quote.score}
                            </div>
                          </div>
                        </td>
                        <td className="px-8 py-5">
                          <p className="text-sm font-bold text-slate-900">{formatCurrency(quote.amount)}</p>
                        </td>
                        <td className="px-8 py-5">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold border uppercase tracking-wider ${
                            quote.status === 'accepted' ? 'bg-emerald-50 border-emerald-100 text-emerald-600' :
                            quote.status === 'sent' ? 'bg-brand-50 border-brand-100 text-brand-600' :
                            quote.status === 'rejected' ? 'bg-rose-50 border-rose-100 text-rose-600' :
                            'bg-slate-100 border-slate-200 text-slate-500'
                          }`}>
                            {quote.status}
                          </span>
                        </td>
                        <td className="px-8 py-5 text-right">
                          <Link href={`/app/quotes/${quote.id}`} className="p-2 text-slate-400 hover:text-slate-900 hover:bg-white rounded-xl shadow-sm transition-all inline-flex items-center gap-2 text-xs font-bold border border-transparent hover:border-slate-200">
                            <span>Gestionar</span>
                            <ArrowRight size={14} />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </div>

          {/* Right Column: Insights & Actions */}
          <div className="lg:col-span-4 space-y-8">
            
            {/* AI Insights Section */}
            <section className="bg-white rounded-[2rem] border border-slate-200 p-8 shadow-sm">
              <div className="flex items-center gap-3 mb-8">
                <div className="h-10 w-10 rounded-2xl bg-brand-50 flex items-center justify-center text-brand-600">
                  <Zap size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Insights IA</h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Patrones avanzados</p>
                </div>
              </div>
              
              <div className="space-y-6">
                {data.insights.map((insight, idx) => (
                  <div key={idx} className="flex gap-4 group">
                    <div className="mt-1">
                      <div className={`h-2 w-2 rounded-full mt-1.5 ${
                        insight.type === 'warning' ? 'bg-rose-500' :
                        insight.type === 'opportunity' ? 'bg-brand-500' :
                        'bg-emerald-500'
                      }`} />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 mb-1 group-hover:text-brand-600 transition-colors">{insight.title}</h4>
                      <p className="text-xs text-slate-500 leading-relaxed mb-2">{insight.description}</p>
                      {insight.impact && (
                        <span className="text-[10px] font-bold px-2 py-1 bg-slate-50 text-slate-600 rounded-lg border border-slate-100 uppercase tracking-tighter">
                          Impacto: {insight.impact}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Recommended Actions */}
            <section className="bg-slate-900 rounded-[2rem] p-8 shadow-lg shadow-slate-200 overflow-hidden relative">
              <div className="relative z-10">
                <h3 className="text-base font-bold text-white mb-2">Acciones Sugeridas</h3>
                <p className="text-xs text-slate-400 mb-8">Tareas priorizadas para aumentar cierre</p>
                
                <div className="space-y-4">
                  {data.actions.map((action, idx) => (
                    <div key={idx} className="bg-white/5 border border-white/10 p-5 rounded-2xl hover:bg-white/10 transition-all group">
                      <div className="flex items-center justify-between mb-2">
                        <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-md ${
                          action.priority === 'alta' ? 'bg-rose-500/20 text-rose-400' :
                          action.priority === 'media' ? 'bg-amber-500/20 text-amber-400' :
                          'bg-emerald-500/20 text-emerald-400'
                        }`}>
                          {action.priority}
                        </span>
                        <span className="text-[10px] font-bold text-slate-500">{action.impact}</span>
                      </div>
                      <h4 className="text-sm font-bold text-white mb-1">{action.title}</h4>
                      <p className="text-xs text-slate-400 leading-relaxed">{action.description}</p>
                      <Link 
                        href={action.ctaPath}
                        className="mt-4 flex items-center gap-2 text-[10px] font-bold text-brand-400 uppercase tracking-widest group-hover:gap-3 transition-all"
                      >
                        <span>{action.cta}</span>
                        <ArrowRight size={12} />
                      </Link>
                    </div>
                  ))}
                </div>
              </div>
              <div className="absolute -bottom-10 -right-10 opacity-5">
                <Zap size={200} className="text-white" />
              </div>
            </section>

           </div>
        </div>
      </main>
    </div>
  );
}

function KPICard({ title, value, change, icon }: { title: string, value: string, change: number, icon: React.ReactNode }) {
  const isPositive = change >= 0;
  return (
    <div className="bg-white rounded-[2rem] p-6 border border-slate-200 shadow-sm flex items-center justify-between group hover:border-brand-100 transition-colors">
      <div>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">{title}</p>
        <div className="flex items-baseline gap-2">
          <h4 className="text-2xl font-bold text-slate-900">{value}</h4>
          <span className={`inline-flex items-center text-[10px] font-bold ${isPositive ? 'text-emerald-600' : 'text-rose-600'}`}>
            {isPositive ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
            {Math.abs(change)}%
          </span>
        </div>
      </div>
      <div className="h-12 w-12 rounded-2xl bg-slate-50 flex items-center justify-center group-hover:bg-white group-hover:shadow-soft transition-all">
        {icon}
      </div>
    </div>
  );
}
