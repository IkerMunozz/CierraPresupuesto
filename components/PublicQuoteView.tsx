'use client';

import { useState, useEffect } from 'react';
import { Quote, Company } from '@/lib/db/schema';
import { quoteLines } from '@/lib/db/schema';
import { useRouter } from 'next/navigation';

interface PublicQuoteViewProps {
  quote: Quote & { lines: (typeof quoteLines.$inferSelect)[] };
  company: Company | null;
}

type ViewStatus = 'pending' | 'accepting' | 'rejecting' | 'accepted' | 'rejected' | 'error';

export default function PublicQuoteView({ quote, company }: PublicQuoteViewProps) {
  const [status, setStatus] = useState<ViewStatus>('pending');
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  // Emitir evento de "visto" al cargar
  useEffect(() => {
    fetch('/api/events/quote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ quoteId: quote.id, type: 'QUOTE_VIEWED' }),
    }).catch(e => console.error('Error emitiendo QUOTE_VIEWED:', e));
  }, [quote.id]);

  const calculateTotals = () => {
    const subtotal = quote.lines.reduce((acc, line) => {
      const lineTotal = Number(line.quantity) * Number(line.unitPrice);
      const discount = Number(line.discount) || 0;
      return acc + (lineTotal - (lineTotal * discount) / 100);
    }, 0);

    const tax = quote.lines.reduce((acc, line) => {
      const lineSubtotal = Number(line.quantity) * Number(line.unitPrice);
      const discount = Number(line.discount) || 0;
      const subtotalAfterDiscount = lineSubtotal - (lineSubtotal * discount) / 100;
      return acc + subtotalAfterDiscount * (Number(line.iva) / 100);
    }, 0);

    return {
      subtotal,
      tax,
      total: subtotal + tax,
    };
  };

  const { subtotal, tax, total } = calculateTotals();

  const handleAccept = async () => {
    setStatus('accepting');
    try {
      const res = await fetch('/api/events/quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quoteId: quote.id, type: 'QUOTE_ACCEPTED' }),
      });

      if (res.ok) {
        setStatus('accepted');
      } else {
        throw new Error('Error al aceptar');
      }
    } catch (e) {
      setStatus('error');
      setError('No se pudo aceptar el presupuesto. Inténtalo de nuevo.');
    }
  };

  const handleReject = async () => {
    setStatus('rejecting');
    try {
      const res = await fetch('/api/events/quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quoteId: quote.id, type: 'QUOTE_REJECTED' }),
      });

      if (res.ok) {
        setStatus('rejected');
      } else {
        throw new Error('Error al rechazar');
      }
    } catch (e) {
      setStatus('error');
      setError('No se pudo rechazar el presupuesto. Inténtalo de nuevo.');
    }
  };

  // Estados finales
  if (status === 'accepted') {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-4">
        <div className="text-center space-y-6 max-w-md">
          <div className="text-6xl">🎉</div>
          <h1 className="text-3xl font-bold text-slate-900">¡Presupuesto aceptado!</h1>
          <p className="text-lg text-slate-600">
            Nos pondremos en contacto contigo pronto para los siguientes pasos.
          </p>
          <div className="pt-6 border-t border-slate-200">
            <p className="text-sm text-slate-500">
              Referencia: {quote.id.substring(0, 8)}
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (status === 'rejected') {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-4">
        <div className="text-center space-y-6 max-w-md">
          <div className="text-6xl">✅</div>
          <h1 className="text-3xl font-bold text-slate-900">Gracias por tu respuesta</h1>
          <p className="text-lg text-slate-600">
            Hemos registrado tu decisión. Si cambias de opinión, contáctanos.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* HEADER */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-5 sm:px-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            {company?.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img 
                src={company.logoUrl} 
                alt={company.name || 'Empresa'} 
                className="h-10 w-auto object-contain" 
              />
            ) : (
              <div className="h-10 w-10 rounded-lg bg-slate-900 flex items-center justify-center">
                <span className="text-white font-bold text-sm">
                  {company?.name?.charAt(0) || 'E'}
                </span>
              </div>
            )}
            <div>
              <p className="font-semibold text-slate-900">{company?.name || 'Empresa'}</p>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-50 text-yellow-700 border border-yellow-200">
                <span className="h-1.5 w-1.5 rounded-full bg-yellow-500 animate-pulse" />
                Pendiente
              </span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-12 sm:px-6">
        {/* HERO */}
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold text-slate-900 sm:text-5xl tracking-tight">
            {quote.title}
          </h1>
          <p className="mt-4 text-lg text-slate-600 max-w-2xl mx-auto">
            Hemos preparado esta propuesta personalizada para ti
          </p>
          <div className="mt-8 inline-block">
            <div className="relative">
              <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-slate-900 to-slate-700 blur opacity-10" />
              <div className="relative bg-white rounded-2xl px-8 py-6 border border-slate-200 shadow-sm">
                <p className="text-sm font-medium text-slate-500 uppercase tracking-wider mb-1">
                  Total propuesto
                </p>
                <p className="text-5xl font-extrabold text-slate-900">
                  €{total.toFixed(2)}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  IVA incluido • Válido hasta {quote.validUntil ? new Date(quote.validUntil).toLocaleDateString() : 'fecha no especificada'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* CUERPO */}
        <div className="space-y-8 mb-12">
          {/* Descripción */}
          <section className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900 mb-4">Descripción del servicio</h2>
            <div className="prose prose-slate max-w-none text-slate-600">
              {quote.content ? (
                <div dangerouslySetInnerHTML={{ __html: quote.content }} />
              ) : (
                <p className="text-slate-400 italic">No hay descripción detallada.</p>
              )}
            </div>
          </section>

          {/* Entregables si hay líneas */}
          {quote.lines.length > 0 && (
            <section className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm">
              <h2 className="text-xl font-semibold text-slate-900 mb-6">Entregables</h2>
              <ul className="space-y-4">
                {quote.lines.map((line) => (
                  <li key={line.id} className="flex items-start gap-3">
                    <span className="mt-1 h-5 w-5 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                      <svg className="h-3 w-3 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </span>
                    <div>
                      <p className="font-medium text-slate-900">{line.name}</p>
                      {line.description && (
                        <p className="text-sm text-slate-600">{line.description}</p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        {/* DETALLE ECONÓMICO */}
        <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-12">
          <div className="px-8 py-6 border-b border-slate-200">
            <h2 className="text-xl font-semibold text-slate-900">Detalle económico</h2>
          </div>

          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="px-8 py-4 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Concepto
                </th>
                <th className="px-8 py-4 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Cant.
                </th>
                <th className="px-8 py-4 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  P. Unit
                </th>
                <th className="px-8 py-4 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Total
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {quote.lines.map((line) => {
                const lineTotal = Number(line.quantity) * Number(line.unitPrice);
                const discount = Number(line.discount) || 0;
                const subtotalLine = lineTotal - (lineTotal * discount) / 100;
                const totalLine = subtotalLine * (1 + Number(line.iva) / 100);

                return (
                  <tr key={line.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-8 py-4">
                      <p className="font-medium text-slate-900">{line.name}</p>
                      {line.description && (
                        <p className="text-xs text-slate-500 mt-0.5">{line.description}</p>
                      )}
                    </td>
                    <td className="px-8 py-4 text-sm text-slate-600">{line.quantity}</td>
                    <td className="px-8 py-4 text-sm text-slate-600">
                      €{Number(line.unitPrice).toFixed(2)}
                    </td>
                    <td className="px-8 py-4 text-sm font-medium text-slate-900 text-right">
                      €{totalLine.toFixed(2)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="border-t-2 border-slate-200">
              <tr>
                <td colSpan={3} className="px-8 py-4 text-right text-sm font-medium text-slate-600">
                  Subtotal
                </td>
                <td className="px-8 py-4 text-right text-sm font-medium text-slate-900">
                  €{subtotal.toFixed(2)}
                </td>
              </tr>
              <tr>
                <td colSpan={3} className="px-8 py-4 text-right text-sm font-medium text-slate-600">
                  IVA
                </td>
                <td className="px-8 py-4 text-right text-sm font-medium text-slate-900">
                  €{tax.toFixed(2)}
                </td>
              </tr>
              <tr className="bg-slate-50">
                <td colSpan={3} className="px-8 py-5 text-right text-base font-bold text-slate-900">
                  TOTAL
                </td>
                <td className="px-8 py-5 text-right text-base font-bold text-slate-900">
                  €{total.toFixed(2)}
                </td>
              </tr>
            </tfoot>
          </table>
        </section>

        {/* CTA PRINCIPAL */}
        <section className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm text-center">
          <h3 className="text-xl font-semibold text-slate-900 mb-6">
            ¿Listo para comenzar?
          </h3>

          <div>
            <button
              onClick={handleAccept}
              disabled={status === 'accepting'}
              className="w-full max-w-md mx-auto rounded-xl bg-slate-900 px-8 py-4 text-lg font-bold text-white hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg shadow-slate-900/10"
            >
              {status === 'accepting' ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Procesando...
                </span>
              ) : (
                'Aceptar propuesta'
              )}
            </button>
          </div>

          <p className="mt-3 text-sm text-slate-500">
            Confirmas que estás de acuerdo con las condiciones
          </p>

          <div className="mt-6 pt-6 border-t border-slate-200">
            <button
              onClick={handleReject}
              disabled={status === 'rejecting'}
              className="text-sm font-medium text-slate-500 hover:text-slate-700 transition-colors disabled:opacity-50"
            >
              {status === 'rejecting' ? 'Procesando...' : 'Rechazar propuesta'}
            </button>
          </div>

          {error && (
            <div className="mt-4 p-3 rounded-lg bg-red-50 border border-red-200">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}
        </section>

        {/* FOOTER */}
        <footer className="mt-16 pt-8 border-t border-slate-200 text-center">
          <p className="text-sm text-slate-500">
            ¿Tienes dudas? Puedes responder a este email
          </p>
          <p className="mt-2 text-xs text-slate-400">
            Propuesta generada por VendeMás AI
          </p>
        </footer>
      </main>
    </div>
  );
}
