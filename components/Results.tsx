'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';

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

type CardProps = {
  title: string;
  subtitle?: string;
  loading: boolean;
  empty: string;
  value?: string;
  children?: React.ReactNode;
  onCopy?: () => Promise<void> | void;
  copied?: boolean;
};

function Spinner() {
  return (
    <div className="flex items-center gap-3 text-slate-600">
      <span className="relative inline-flex h-5 w-5">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-400 opacity-40" />
        <span className="relative inline-flex h-5 w-5 animate-spin rounded-full border-2 border-slate-200 border-t-brand-600" />
      </span>
      <span className="text-sm">Generando con IA…</span>
    </div>
  );
}

function Skeleton() {
  return (
    <div className="space-y-3">
      <div className="h-4 w-2/3 animate-pulse rounded bg-slate-200/70" />
      <div className="h-4 w-full animate-pulse rounded bg-slate-200/70" />
      <div className="h-4 w-11/12 animate-pulse rounded bg-slate-200/70" />
      <div className="h-4 w-4/5 animate-pulse rounded bg-slate-200/70" />
      <div className="h-4 w-2/5 animate-pulse rounded bg-slate-200/70" />
    </div>
  );
}

function CopyButton({ onCopy, copied }: { onCopy?: () => Promise<void> | void; copied?: boolean }) {
  return (
    <button
      type="button"
      onClick={onCopy}
      className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
      aria-label="Copiar al portapapeles"
    >
      <span className="h-2 w-2 rounded-full bg-slate-300" />
      {copied ? 'Copiado' : 'Copiar'}
    </button>
  );
}

function Card({ title, subtitle, loading, empty, value, children, onCopy, copied }: CardProps) {
  const showValue = typeof value === 'string' && value.trim().length > 0;

  return (
    <section className="rounded-[1.75rem] border border-slate-200 bg-white/95 p-6 shadow-soft backdrop-blur transition">
      <header className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
          {subtitle ? <p className="mt-1 text-sm text-slate-500">{subtitle}</p> : null}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <CopyButton onCopy={onCopy} copied={copied} />
        </div>
      </header>

      <div className="min-h-[220px] rounded-3xl border border-slate-100 bg-slate-50 p-5 text-sm leading-7 text-slate-700">
        <div className="transition-opacity duration-200">
          {loading ? (
            <div className="space-y-4">
              <Spinner />
              <Skeleton />
            </div>
          ) : showValue ? (
            <pre className="whitespace-pre-wrap font-sans break-words">{value}</pre>
          ) : children ? (
            children
          ) : (
            <p className="text-slate-500">{empty}</p>
          )}
        </div>
      </div>
    </section>
  );
}

function ScorePill({ score, competitiveness }: { score: number; competitiveness: Analysis['competitiveness'] }) {
  const tone = useMemo(() => {
    if (score >= 85) return { bg: 'bg-emerald-500', label: 'Alta' };
    if (score >= 70) return { bg: 'bg-brand-600', label: 'Media' };
    return { bg: 'bg-amber-500', label: 'Baja' };
  }, [score]);

  const compLabel =
    competitiveness === 'alta' ? 'Competitivo' : competitiveness === 'media' ? 'Equilibrado' : 'Poco competitivo';

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-3xl bg-slate-100 p-4">
      <span className={`inline-flex h-12 w-12 items-center justify-center rounded-2xl ${tone.bg} text-white`}>
        {score}
      </span>
      <div className="min-w-[180px]">
        <p className="font-semibold text-slate-900">Score de conversión</p>
        <p className="text-sm text-slate-600">
          Nivel: {tone.label} · {compLabel}
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
      window.setTimeout(() => setCopiedKey((current) => (current === key ? null : current)), 1200);
    } catch {
      // no-op: clipboard may be blocked; keep UX silent
    }
  };

  const isFree = result?.isFree;

  return (
    <div className="space-y-6">
      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          <p>{error}</p>
          {error.includes('IA requiere') && (
            <Link href="/subscription" className="mt-3 inline-block text-blue-600 hover:underline">
              Mejorar a Pro →
            </Link>
          )}
        </div>
      ) : null}

      

      <Card
        title="Análisis"
        subtitle="Problemas, riesgos y competitividad con score 0–100."
        loading={loading}
        empty="El análisis aparecerá aquí cuando generes un presupuesto."
        onCopy={
          result && isFree === false && result.analysis.score > 0
            ? () =>
                copy(
                  'analysis',
                  [
                    `Score: ${result.analysis.score}`,
                    `Competitividad: ${result.analysis.competitividad}`,
                    ``,
                    `Feedback:`,
                    ...result.analysis.feedback.map((x) => `- ${x}`),
                    ``,
                    `Riesgos:`,
                    ...result.analysis.risks.map((x) => `- ${x}`),
                  ].join('\n'),
                )
            : undefined
        }
        copied={copiedKey === 'analysis'}
      >
        {result ? (
          isFree ? (
            <div className="flex flex-col items-center justify-center space-y-4 py-8 text-center">
              <div className="rounded-2xl bg-brand-50 p-3">
                <svg className="h-8 w-8 text-brand-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div className="max-w-xs space-y-2">
                <h3 className="font-semibold text-slate-900">Análisis exclusivo PRO</h3>
                <p className="text-sm text-slate-600">
                  El análisis detallado con IA y score de conversión está disponible solo en los planes PRO y BUSINESS.
                </p>
                <Link
                  href="/subscription"
                  className="mt-4 inline-flex items-center justify-center rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700"
                >
                  Mejorar ahora
                </Link>
              </div>
            </div>
          ) : result.analysis.score > 0 ? (
            <div className="space-y-4">
              <ScorePill score={result.analysis.score} competitiveness={result.analysis.competitiveness} />
              <div className="grid gap-4 lg:grid-cols-2">
                <div className="rounded-3xl border border-slate-200 bg-white p-4">
                  <h3 className="text-sm font-semibold text-slate-900">Feedback</h3>
                  <ul className="mt-2 list-disc space-y-2 pl-5 text-sm text-slate-600">
                    {result.analysis.feedback.map((item, index) => (
                      <li key={index} className="break-words">{item}</li>
                    ))}
                  </ul>
                </div>
                <div className="rounded-3xl border border-slate-200 bg-white p-4">
                  <h3 className="text-sm font-semibold text-slate-900">Riesgos</h3>
                  <ul className="mt-2 list-disc space-y-2 pl-5 text-sm text-slate-600">
                    {result.analysis.risks.map((item, index) => (
                      <li key={index} className="break-words">{item}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center space-y-4 py-8 text-center">
              <p className="max-w-xs text-sm text-slate-600">
                El análisis de IA no está disponible para este presupuesto.
              </p>
            </div>
          )
        ) : (
          <div className="flex flex-col items-center justify-center space-y-4 py-8 text-center">
            <p className="max-w-xs text-sm text-slate-600">
              El análisis aparecerá aquí cuando generes un presupuesto.
            </p>
          </div>
        )}
      </Card>

      <Card
        title="Versión mejorada"
        subtitle="Reescritura optimizada para aumentar conversión."
        loading={loading}
        empty="La versión mejorada se mostrará aquí."
        value={isFree ? undefined : result?.improvedQuote}
        onCopy={result?.improvedQuote && !isFree ? () => copy('improved', result.improvedQuote) : undefined}
        copied={copiedKey === 'improved'}
      >
        {result && isFree ? (
          <div className="flex flex-col items-center justify-center space-y-4 py-8 text-center">
            <p className="max-w-xs text-sm text-slate-600">
              La optimización de textos avanzada requiere un plan PRO o superior.
            </p>
          </div>
        ) : null}
      </Card>
    </div>
  );
}
