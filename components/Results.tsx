'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { CheckCircle2, AlertCircle, TrendingUp, Copy, Check, Lock, Sparkles } from 'lucide-react';

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
  const bgColor = score >= 85 ? 'bg-emerald-50' : score >= 70 ? 'bg-blue-50' : 'bg-amber-50';
  const borderColor = score >= 85 ? 'border-emerald-100' : score >= 70 ? 'border-blue-100' : 'border-amber-100';

  return (
    <div className={`flex items-center gap-4 rounded-3xl border ${borderColor} ${bgColor} p-6`}>
      <div className="relative flex h-20 w-20 shrink-0 items-center justify-center">
        <svg className="h-full w-full -rotate-90 transform">
          <circle
            cx="40"
            cy="40"
            r="36"
            stroke="currentColor"
            strokeWidth="8"
            fill="transparent"
            className="text-white/50"
          />
          <circle
            cx="40"
            cy="40"
            r="36"
            stroke="currentColor"
            strokeWidth="8"
            fill="transparent"
            strokeDasharray={226}
            strokeDashoffset={226 - (226 * score) / 100}
            className={`${color} transition-all duration-1000 ease-out`}
          />
        </svg>
        <span className={`absolute text-2xl font-black ${color}`}>{score}</span>
      </div>
      <div>
        <p className="text-sm font-bold uppercase tracking-wider text-slate-500">Probabilidad de Cierre</p>
        <p className="text-slate-600 text-sm leading-relaxed mt-1">
          {score >= 85 
            ? 'Excelente propuesta. Tienes una probabilidad muy alta de que el cliente acepte.' 
            : score >= 70 
            ? 'Buen presupuesto. Con unos pequeños ajustes podrías asegurar la venta.' 
            : 'Tu propuesta necesita mejoras críticas para ser competitiva.'}
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
      <section className="rounded-[2.5rem] border border-slate-200 bg-white p-8 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-5">
          <TrendingUp size={120} />
        </div>
        
        <div className="flex items-center gap-3 mb-8">
          <div className="bg-blue-600 p-2 rounded-xl">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900">Análisis del Experto</h2>
        </div>

        {isFree ? (
          <div className="text-center py-10 px-4 border-2 border-dashed border-slate-100 rounded-[2rem]">
            <Lock className="h-10 w-10 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-slate-900">Análisis Bloqueado</h3>
            <p className="text-slate-500 text-sm max-w-sm mx-auto mt-2">
              El análisis detallado de conversión y riesgos es una función exclusiva para usuarios Pro.
            </p>
            <Link href="/subscription" className="mt-6 inline-flex items-center justify-center rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-blue-200 hover:bg-blue-700 transition">
              Mejorar a Pro
            </Link>
          </div>
        ) : (
          <div className="space-y-8">
            {!result.analysis || result.analysis.score === 0 ? (
              <div className="text-center py-10 px-4 border-2 border-dashed border-slate-100 rounded-[2rem]">
                <AlertCircle className="h-10 w-10 text-amber-400 mx-auto mb-4" />
                <h3 className="text-lg font-bold text-slate-900">Análisis no disponible</h3>
                <p className="text-slate-500 text-sm max-w-sm mx-auto mt-2">
                  El análisis no se pudo generar. Por favor, intenta crear un nuevo presupuesto.
                </p>
              </div>
            ) : (
              <>
                <ScoreIndicator score={result.analysis.score} />

                <div className="grid gap-6 md:grid-cols-2">
                  <div className="rounded-[2rem] bg-slate-50 p-6 border border-slate-100">
                    <div className="flex items-center gap-2 mb-4 text-emerald-700">
                      <CheckCircle2 className="h-5 w-5" />
                      <h3 className="font-bold uppercase tracking-wider text-xs">Puntos Fuertes y Mejoras</h3>
                    </div>
                    <div className="space-y-4">
                      {result.analysis.feedback && result.analysis.feedback.length > 0 ? (
                        result.analysis.feedback.map((f, i) => (
                          <div key={i} className="bg-white rounded-2xl p-4 shadow-sm text-sm text-slate-700 border border-slate-100">
                            <MarkdownRenderer content={f} />
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-slate-500">No hay puntos fuertes disponibles</p>
                      )}
                    </div>
                  </div>

                  <div className="rounded-[2rem] bg-slate-50 p-6 border border-slate-100">
                    <div className="flex items-center gap-2 mb-4 text-amber-700">
                      <AlertCircle className="h-5 w-5" />
                      <h3 className="font-bold uppercase tracking-wider text-xs">Riesgos Detectados</h3>
                    </div>
                    <div className="space-y-4">
                      {result.analysis.risks && result.analysis.risks.length > 0 ? (
                        result.analysis.risks.map((r, i) => (
                          <div key={i} className="bg-white rounded-2xl p-4 shadow-sm text-sm text-slate-700 border border-slate-100">
                            <MarkdownRenderer content={r} />
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-slate-500">No hay riesgos detectados</p>
                      )}
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </section>

      {/* SECCIÓN DE VERSIÓN OPTIMIZADA */}
      <section className="rounded-[2.5rem] border border-slate-200 bg-slate-900 p-8 shadow-xl text-white">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="bg-white/10 p-2 rounded-xl">
              <TrendingUp className="h-5 w-5 text-blue-400" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Versión Optimizada</h2>
              <p className="text-slate-400 text-sm">Propuesta reescrita por IA para maximizar impacto.</p>
            </div>
          </div>
          <button 
            onClick={() => copy('improved', result.improvedQuote)}
            className="flex items-center gap-2 rounded-xl bg-white/10 hover:bg-white/20 px-4 py-2 text-sm font-bold transition"
          >
            {copiedKey === 'improved' ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
            {copiedKey === 'improved' ? 'Copiado' : 'Copiar Texto'}
          </button>
        </div>

        {isFree ? (
          <div className="text-center py-10 px-4 bg-white/5 rounded-[2rem] border border-white/10">
            <Lock className="h-8 w-8 text-white/20 mx-auto mb-4" />
            <p className="text-slate-400 text-sm">La reescritura optimizada requiere un plan Pro.</p>
          </div>
        ) : !result.improvedQuote ? (
          <div className="text-center py-10 px-4 bg-white/5 rounded-[2rem] border border-white/10">
            <AlertCircle className="h-8 w-8 text-white/20 mx-auto mb-4" />
            <p className="text-slate-400 text-sm">La versión optimizada no está disponible. Por favor, intenta generar un nuevo presupuesto.</p>
          </div>
        ) : (
          <div className="rounded-[2rem] bg-white p-8 text-slate-800 shadow-inner overflow-hidden">
            <div className="prose prose-blue max-w-none prose-p:leading-relaxed">
              <MarkdownRenderer content={result.improvedQuote} />
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
