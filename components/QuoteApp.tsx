'use client';

import { useState, useEffect } from 'react';
import Form, { type FormValues } from '@/components/Form';
import Results, { type GenerateResult } from '@/components/Results';

type HistoryItem = GenerateResult & { id: number; serviceType: string; createdAt: string };

const initialValues: FormValues = {
  serviceType: '',
  description: '',
  price: '',
  clientType: '',
  context: '',
};

export default function QuoteApp() {
  const [values, setValues] = useState<FormValues>(initialValues);
  const [result, setResult] = useState<GenerateResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [currentStep, setCurrentStep] = useState<'form' | 'results'>('form');

  const loadHistory = async () => {
    try {
      const response = await fetch('/api/history');
      if (response.ok) {
        const data = await response.json();
        setHistory(
          data.map((item: any) => ({
            ...item,
            createdAt: new Date(item.createdAt).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' }),
          })),
        );
      }
    } catch (err) {
      // Ignore errors for history
    }
  };

  useEffect(() => {
    loadHistory();
  }, []);

  const handleSubmit = async (payload: FormValues) => {
    setLoading(true);
    setError(null);
    setCurrentStep('results');

    try {
      if (payload.streaming) {
        // Streaming
        const response = await fetch(`/api/generate?stream=true`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const body = (await response.json().catch(() => null)) as { message?: string } | null;
          throw new Error(body?.message || 'Error al generar el presupuesto');
        }

        const reader = response.body?.getReader();
        if (!reader) throw new Error('No reader');

        let accumulated = '';
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          const lines = buffer.split('\n');
          buffer = lines.pop() || ''; // Keep incomplete line

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data === '[DONE]') break;
              try {
                const parsed = JSON.parse(data);
                const content = parsed.choices?.[0]?.delta?.content;
                if (content) {
                  accumulated += content;
                  setResult({ quote: accumulated, analysis: { score: 0, feedback: [], risks: [], competitiveness: 'media' }, improvedQuote: '' });
                }
              } catch (e) {
                // Ignore invalid JSON
              }
            }
          }
        }
        // After streaming, fetch full analysis
        const fullResponse = await fetch('/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (fullResponse.ok) {
          const data = await fullResponse.json();
          setResult(data);
          await loadHistory();
        }
      } else {
        // Normal
        const response = await fetch('/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const body = (await response.json().catch(() => null)) as { message?: string } | null;
          throw new Error(body?.message || 'Error al generar el presupuesto');
        }

        const data = (await response.json()) as GenerateResult;
        setResult(data);
        await loadHistory();
      }
    } catch (err) {
      setError((err as Error).message ?? 'Hubo un problema al generar el presupuesto.');
    } finally {
      setLoading(false);
    }
  };

  const handleNewQuote = () => {
    setCurrentStep('form');
    setResult(null);
    setError(null);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10">
      {/* Step Indicator */}
      <div className="mb-8">
        <div className="flex items-center justify-center">
          <div className="flex items-center space-x-4">
            <div className={`flex items-center justify-center w-10 h-10 rounded-full ${
              currentStep === 'form' ? 'bg-blue-600 text-white' : 'bg-green-600 text-white'
            } font-semibold text-sm`}>
              1
            </div>
            <div className={`h-1 w-16 ${currentStep === 'results' ? 'bg-green-600' : 'bg-slate-300'}`} />
            <div className={`flex items-center justify-center w-10 h-10 rounded-full ${
              currentStep === 'results' ? 'bg-blue-600 text-white' : 'bg-slate-300 text-slate-600'
            } font-semibold text-sm`}>
              2
            </div>
          </div>
        </div>
        <div className="text-center mt-4">
          <p className="text-sm text-slate-600">
            {currentStep === 'form' ? 'Completa la información del servicio' : 'Revisa y mejora tu presupuesto'}
          </p>
        </div>
      </div>

      {currentStep === 'form' ? (
        <div className="grid gap-8 lg:grid-cols-2">
          <div className="space-y-6">
            <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-lg">
              <h2 className="text-2xl font-bold text-slate-900 mb-2">Crear presupuesto</h2>
              <p className="text-slate-600 mb-6">
                Describe tu servicio y obtén un presupuesto profesional con análisis inteligente.
              </p>
              <Form values={values} onChange={setValues} onSubmit={handleSubmit} loading={loading} />
            </div>
          </div>

          <div className="space-y-6">
            {history.length > 0 ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-lg">
                <h3 className="text-lg font-semibold text-slate-900 mb-4">Presupuestos recientes</h3>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {history.slice(0, 5).map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setResult({ quote: item.quote, analysis: item.analysis, improvedQuote: item.improvedQuote });
                        setCurrentStep('results');
                      }}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 p-4 text-left transition hover:border-slate-300 hover:bg-slate-100"
                    >
                      <p className="text-sm font-medium text-slate-800">{item.serviceType}</p>
                      <p className="mt-1 text-sm text-slate-500">
                        Score: {item.analysis.score} · {item.createdAt}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
                <svg className="mx-auto h-12 w-12 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <h3 className="mt-4 text-sm font-medium text-slate-900">Sin presupuestos aún</h3>
                <p className="mt-2 text-sm text-slate-500">
                  Crea tu primer presupuesto para comenzar a construir tu historial.
                </p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-slate-900">Tu presupuesto</h2>
            <button
              onClick={handleNewQuote}
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
            >
              Crear nuevo
            </button>
          </div>
          <Results result={result} loading={loading} error={error} />
        </div>
      )}
    </div>
  );
}

