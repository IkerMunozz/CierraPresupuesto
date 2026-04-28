'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { CheckCircle2, AlertCircle, TrendingUp, Copy, Check, Lock, Sparkles, Wand2, Target, Shield } from 'lucide-react';

type Analysis = {
  score: number;
  feedback: string[];
  risks: string[];
  competitiveness: 'baja' | 'media' | 'alta';
};

export type GenerateResult = {
  quote: string;
  analysis: Analysis;
  improvedQuote: string;
  isFree?: boolean;
};

function Spinner() {
  return (
    <div className="flex items-center gap-3 text-blue-600">
      <span className="relative inline-flex h-5 w-5">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-400 opacity-40" />
        <span className="relative inline-flex h-5 w-5 animate-spin rounded-full border-2 border-slate-200 border-t-blue-600" />
      </span>
      <span className="text-sm font-medium">Analizando con Inteligencia Artificial...</span>
    </div>
  );
}

function Skeleton() {
  return (
    <div className="space-y-4">
      <div className="h-4 w-2/3 animate-pulse rounded-full bg-slate-100" />
      <div className="h-4 w-full animate-pulse rounded-full bg-slate-100" />
      <div className="h-4 w-11/12 animate-pulse rounded-full bg-slate-100" />
      <div className="h-4 w-4/5 animate-pulse rounded-full bg-slate-100" />
    </div>
  );
}

function MarkdownRenderer({ content }: { content: string }) {
  return (
    <div className="prose prose-slate prose-sm max-w-none 
        prose-headings:font-bold prose-headings:text-slate-900
        prose-p:leading-relaxed prose-p:text-slate-600
        prose-strong:text-slate-900 prose-strong:font-bold
        prose-ul:list-disc prose-ul:pl-4
        prose-li:my-1">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>
        {content}
      </ReactMarkdown>
    </div>
  );
}

function ScoreIndicator({ score }: { score: number }) {
  const color = score >= 85 ? 'text-emerald-600' : score >= 70 ? 'text-blue-600' : 'text-amber-600';
  const bgColor = score >= 85 ? 'bg-gradient-to-br from-emerald-50 to-emerald-100' : score >= 70 ? 'bg-gradient-to-br from-blue-50 to-blue-100' : 'bg-gradient-to-br from-amber-50 to-amber-100';
  const borderColor = score >= 85 ? 'border-emerald-200' : score >= 70 ? 'border-blue-200' : 'border-amber-200';
  const ringColor = score >= 85 ? 'ring-emerald-500' : score >= 70 ? 'ring-blue-500' : 'ring-amber-500';

  return (
    <div className={`flex items-center gap-6 rounded-3xl border ${borderColor} ${bgColor} p-8 shadow-lg`}>
      <div className="relative flex h-24 w-24 shrink-0 items-center justify-center">
        <div className={`absolute inset-0 rounded-full ${ringColor} opacity-10 blur-xl`}></div>
        <svg className="h-full w-full -rotate-90 transform">
          <circle
            cx="48"
            cy="48"
            r="42"
            stroke="currentColor"
            strokeWidth="10"
            fill="transparent"
            className="text-white/60"
          />
          <circle
            cx="48"
            cy="48"
            r="42"
            stroke="currentColor"
            strokeWidth="10"
            fill="transparent"
            strokeDasharray={264}
            strokeDashoffset={264 - (264 * score) / 100}
            className={`${color} transition-all duration-1000 ease-out drop-shadow-lg`}
            strokeLinecap="round"
          />
        </svg>
        <span className={`absolute text-3xl font-black ${color} drop-shadow-sm`}>{score}</span>
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-2">
          <Target className={`h-5 w-5 ${color}`} />
          <p className="text-sm font-bold uppercase tracking-wider text-slate-700">Probabilidad de Cierre</p>
        </div>
        <p className="text-slate-700 text-base leading-relaxed font-medium">
          {score >= 85 
            ? '🎯 Excelente propuesta. Tienes una probabilidad muy alta de que el cliente acepte.' 
            : score >= 70 
            ? '👍 Buen presupuesto. Con unos pequeños ajustes podrías asegurar la venta.' 
            : '⚠️ Tu propuesta necesita mejoras críticas para ser competitiva.'}
        </p>
      </div>
    </div>
  );
}

export default function Results({
  result,
  loading,
  error,
}: {
  result: GenerateResult | null;
  loading: boolean;
  error: string | null;
}) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const copy = async (key: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      window.setTimeout(() => setCopiedKey((current) => (current === key ? null : current)), 2000);
    } catch {}
  };

  if (loading) {
    return (
      <div className="rounded-[2.5rem] border border-slate-200 bg-white p-8 shadow-xl">
        <Spinner />
        <div className="mt-8">
          <Skeleton />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-3xl border border-red-100 bg-red-50 p-6 text-red-700 flex items-center gap-4">
        <AlertCircle className="h-6 w-6 shrink-0" />
        <p className="font-medium">{error}</p>
      </div>
    );
  }

  if (!result || !result.quote) {
    return null;
  }

  const isFree = result.isFree;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* SECCIÓN DE ANÁLISIS */}
      <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-2xl relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute top-0 right-0 p-8 opacity-5">
          <TrendingUp size={120} />
        </div>
        
        <div className="relative z-10">
          <div className="flex items-center gap-4 mb-8">
            <div className="bg-gradient-to-br from-blue-600 to-indigo-600 p-3 rounded-2xl shadow-lg shadow-blue-500/30">
              <Sparkles className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-900">Análisis del Experto</h2>
              <p className="text-slate-500 text-sm mt-1">Evaluación detallada de tu propuesta por IA</p>
            </div>
          </div>

          {isFree ? (
          <div className="text-center py-16 px-6 border-2 border-dashed border-slate-200 rounded-3xl bg-gradient-to-br from-slate-50 to-slate-100">
            <Lock className="h-12 w-12 text-slate-400 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-slate-900 mb-2">Análisis Premium</h3>
            <p className="text-slate-500 text-sm max-w-sm mx-auto mb-6">
              El análisis detallado de conversión y riesgos es una función exclusiva para usuarios Pro.
            </p>
            <Link href="/subscription" className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-blue-500/30 hover:shadow-xl hover:from-blue-700 hover:to-indigo-700 transition-all duration-200">
              <Sparkles className="h-4 w-4" />
              Mejorar a Pro
            </Link>
          </div>
        ) : (
          <div className="space-y-8">
            {!result.analysis || result.analysis.score === 0 ? (
              <div className="text-center py-12 px-6 border-2 border-dashed border-slate-200 rounded-3xl bg-gradient-to-br from-slate-50 to-slate-100">
                <AlertCircle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
                <h3 className="text-lg font-bold text-slate-900">Análisis no disponible</h3>
                <p className="text-slate-500 text-sm max-w-sm mx-auto mt-2">
                  El análisis no se pudo generar. Por favor, intenta crear un nuevo presupuesto.
                </p>
              </div>
            ) : (
              <>
                <ScoreIndicator score={result.analysis.score} />

                <div className="grid gap-6 md:grid-cols-2">
                  <div className="rounded-3xl bg-gradient-to-br from-emerald-50 to-emerald-100 p-6 border border-emerald-200 shadow-lg">
                    <div className="flex items-center gap-2 mb-6">
                      <div className="bg-emerald-500 p-2 rounded-xl">
                        <CheckCircle2 className="h-5 w-5 text-white" />
                      </div>
                      <h3 className="font-bold uppercase tracking-wider text-xs text-emerald-800">Puntos Fuertes y Mejoras</h3>
                    </div>
                    <div className="space-y-4">
                      {result.analysis.feedback && result.analysis.feedback.length > 0 ? (
                        result.analysis.feedback.map((f, i) => (
                          <div key={i} className="bg-white rounded-2xl p-5 shadow-md text-sm text-slate-700 border border-emerald-100 hover:shadow-lg transition-shadow">
                            <MarkdownRenderer content={f} />
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-slate-500 text-center py-4">No hay puntos fuertes disponibles</p>
                      )}
                    </div>
                  </div>

                  <div className="rounded-3xl bg-gradient-to-br from-amber-50 to-amber-100 p-6 border border-amber-200 shadow-lg">
                    <div className="flex items-center gap-2 mb-6">
                      <div className="bg-amber-500 p-2 rounded-xl">
                        <Shield className="h-5 w-5 text-white" />
                      </div>
                      <h3 className="font-bold uppercase tracking-wider text-xs text-amber-800">Riesgos Detectados</h3>
                    </div>
                    <div className="space-y-4">
                      {result.analysis.risks && result.analysis.risks.length > 0 ? (
                        result.analysis.risks.map((r, i) => (
                          <div key={i} className="bg-white rounded-2xl p-5 shadow-md text-sm text-slate-700 border border-amber-100 hover:shadow-lg transition-shadow">
                            <MarkdownRenderer content={r} />
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-slate-500 text-center py-4">No hay riesgos detectados</p>
                      )}
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
        </div>
      </section>

      {/* SECCIÓN DE VERSIÓN OPTIMIZADA */}
      <section className="rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-8 shadow-2xl border border-slate-700 overflow-hidden relative">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '32px 32px' }}></div>
        </div>
        
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <div className="bg-gradient-to-br from-blue-500 to-indigo-600 p-3 rounded-2xl shadow-lg shadow-blue-500/30">
                <Wand2 className="h-6 w-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                  Versión Optimizada
                  <span className="bg-gradient-to-r from-blue-500 to-indigo-500 text-xs px-3 py-1 rounded-full font-semibold">IA POWERED</span>
                </h2>
                <p className="text-slate-400 text-sm mt-1">Propuesta reescrita por IA para maximizar impacto y conversión.</p>
              </div>
            </div>
            <button 
              onClick={() => copy('improved', result.improvedQuote)}
              className="group flex items-center gap-2 rounded-xl bg-white/10 hover:bg-white/20 backdrop-blur-sm px-5 py-2.5 text-sm font-bold transition-all duration-200 border border-white/10 hover:border-white/20"
            >
              {copiedKey === 'improved' ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4 group-hover:scale-110 transition-transform" />}
              {copiedKey === 'improved' ? 'Copiado' : 'Copiar Texto'}
            </button>
          </div>

          {isFree ? (
            <div className="text-center py-16 px-6 bg-white/5 backdrop-blur-sm rounded-3xl border border-white/10">
              <Lock className="h-12 w-12 text-white/20 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-white mb-2">Función Premium</h3>
              <p className="text-slate-400 text-sm max-w-sm mx-auto mb-6">La reescritura optimizada por IA requiere un plan Pro para desbloquear todo el potencial de tus presupuestos.</p>
              <Link href="/subscription" className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-blue-500/30 hover:shadow-xl hover:from-blue-600 hover:to-indigo-700 transition-all duration-200">
                <Sparkles className="h-4 w-4" />
                Mejorar a Pro
              </Link>
            </div>
          ) : !result.improvedQuote ? (
            <div className="text-center py-16 px-6 bg-white/5 backdrop-blur-sm rounded-3xl border border-white/10">
              <AlertCircle className="h-12 w-12 text-amber-400/50 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-white mb-2">Versión no disponible</h3>
              <p className="text-slate-400 text-sm max-w-sm mx-auto">La versión optimizada no está disponible en este momento. Por favor, intenta generar un nuevo presupuesto.</p>
            </div>
          ) : (
            <div className="rounded-3xl bg-gradient-to-br from-slate-50 to-slate-100 p-8 text-slate-800 shadow-2xl border border-slate-200">
              <div className="flex items-center gap-2 mb-6 pb-4 border-b border-slate-200">
                <div className="bg-blue-100 p-2 rounded-lg">
                  <Sparkles className="h-4 w-4 text-blue-600" />
                </div>
                <span className="text-sm font-semibold text-slate-600">Contenido generado por IA</span>
              </div>
              <div className="prose prose-blue max-w-none prose-p:leading-relaxed prose-headings:text-slate-900 prose-headings:font-bold">
                <MarkdownRenderer content={result.improvedQuote} />
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
