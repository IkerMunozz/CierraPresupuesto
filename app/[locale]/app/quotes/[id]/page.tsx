'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

export default function QuoteDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [quote, setQuote] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    fetch(`/api/quotes/${id}`)
      .then(res => res.json())
      .then(data => {
        setQuote(data);
        setLoading(false);
      });
  }, [id]);

  const generatePDFBlob = () => {
    if (!quote) return null;

    const doc = new jsPDF() as any;
    
    // Membrete Empresa
    doc.setFontSize(20);
    doc.text(quote.company.name, 20, 20);
    doc.setFontSize(10);
    doc.text(quote.company.address || '', 20, 30);
    doc.text(`Tel: ${quote.company.phone || ''}`, 20, 35);
    doc.text(`Email: ${quote.company.email || ''}`, 20, 40);

    // Datos Cliente
    doc.setFontSize(12);
    doc.text('PRESUPUESTO PARA:', 120, 20);
    doc.setFontSize(10);
    doc.text(quote.client.name, 120, 30);
    doc.text(quote.client.taxId || '', 120, 35);
    doc.text(quote.client.address || '', 120, 40);

    // Info Presupuesto
    doc.text(`Fecha: ${new Date(quote.date).toLocaleDateString()}`, 20, 60);
    doc.text(`Validez: ${quote.validUntil ? new Date(quote.validUntil).toLocaleDateString() : 'N/A'}`, 20, 65);
    doc.text(`Forma de Pago: ${quote.paymentMethod || 'A convenir'}`, 20, 70);

    // Tabla
    const tableData = quote.lines.map((l: any) => [
      l.name,
      l.quantity,
      `${parseFloat(l.unitPrice).toFixed(2)} €`,
      `${l.iva}%`,
      `${parseFloat(l.totalAmount).toFixed(2)} €`
    ]);

    doc.autoTable({
      startY: 80,
      head: [['Concepto', 'Cant.', 'Precio U.', 'IVA', 'Total']],
      body: tableData,
      theme: 'striped',
      headStyles: { fillColor: [59, 130, 246] }
    });

    // Totales
    const finalY = (doc as any).lastAutoTable.finalY + 10;
    const total = quote.lines.reduce((acc: number, l: any) => acc + parseFloat(l.totalAmount), 0);
    doc.setFontSize(12);
    doc.text(`TOTAL PRESUPUESTO: ${total.toFixed(2)} €`, 140, finalY);

    // Pie
    if (quote.company.footerInfo) {
      doc.setFontSize(8);
      doc.text(quote.company.footerInfo, 20, 280);
    }

    return doc;
  };

  const handleDownloadPDF = () => {
    const doc = generatePDFBlob();
    if (doc) doc.save(`Presupuesto_${quote.id}.pdf`);
  };

  const sendEmail = async () => {
    if (!quote.client.email) {
      alert('El cliente no tiene email configurado');
      return;
    }

    setSending(true);
    try {
      const doc = generatePDFBlob();
      const pdfBase64 = doc.output('datauristring').split(',')[1];

      const res = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quoteId: quote.id,
          clientEmail: quote.client.email,
          companyName: quote.company.name,
          pdfBase64,
        }),
      });

      if (res.ok) {
        alert('Presupuesto enviado con éxito al cliente');
      } else {
        const error = await res.json();
        throw new Error(error.message);
      }
    } catch (e: any) {
      alert(`Error al enviar: ${e.message}`);
    } finally {
      setSending(false);
    }
  };

  if (loading) return <div className="flex min-h-screen items-center justify-center">Cargando...</div>;

  return (
    <>
      <SiteHeader />
      <main className="min-h-screen bg-slate-50 py-12 px-4">
        <div className="mx-auto max-w-4xl">
          <div className="mb-8 flex items-center justify-between">
            <button onClick={() => router.push('/app')} className="text-sm font-bold text-slate-500 hover:text-slate-900 transition">
              ← Volver al panel
            </button>
            <div className="flex gap-3">
              <button
                onClick={handleDownloadPDF}
                className="rounded-xl bg-white border border-slate-200 px-5 py-2.5 text-sm font-bold text-slate-700 shadow-sm hover:bg-slate-50 transition"
              >
                Descargar PDF
              </button>
              <button
                onClick={sendEmail}
                disabled={sending}
                className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-blue-200 hover:bg-blue-700 disabled:opacity-50 transition"
              >
                {sending ? 'Enviando...' : 'Enviar por Email'}
              </button>
            </div>
          </div>

          <div className="rounded-[2.5rem] bg-white p-10 shadow-xl border border-slate-200">
            <div className="flex justify-between border-b border-slate-100 pb-10">
              <div>
                <h1 className="text-3xl font-bold text-slate-900">{quote.company.name}</h1>
                <p className="text-slate-500 mt-2">{quote.company.address}</p>
                <p className="text-slate-500">{quote.company.email} · {quote.company.phone}</p>
              </div>
              <div className="text-right">
                <h2 className="text-sm font-bold uppercase tracking-widest text-blue-600">Presupuesto</h2>
                <p className="text-3xl font-bold text-slate-900 mt-1">#PRE-{quote.id}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-10 py-10">
              <div>
                <h3 className="text-xs font-bold uppercase text-slate-400 mb-3">Cliente</h3>
                <p className="font-bold text-slate-900">{quote.client.name}</p>
                <p className="text-slate-600">{quote.client.taxId}</p>
                <p className="text-slate-600">{quote.client.address}</p>
                <p className="text-sm text-blue-600 mt-1">{quote.client.email}</p>
              </div>
              <div className="text-right">
                <h3 className="text-xs font-bold uppercase text-slate-400 mb-3">Detalles</h3>
                <p className="text-slate-600"><span className="font-medium">Fecha:</span> {new Date(quote.date).toLocaleDateString()}</p>
                <p className="text-slate-600"><span className="font-medium">Válido hasta:</span> {quote.validUntil ? new Date(quote.validUntil).toLocaleDateString() : 'N/A'}</p>
                <p className="text-slate-600"><span className="font-medium">Pago:</span> {quote.paymentMethod}</p>
              </div>
            </div>

            <table className="w-full text-left">
              <thead>
                <tr className="border-y border-slate-100 text-xs font-bold uppercase text-slate-400">
                  <th className="py-4">Concepto</th>
                  <th className="py-4 text-center">Cant.</th>
                  <th className="py-4 text-right">Precio</th>
                  <th className="py-4 text-right">IVA</th>
                  <th className="py-4 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {quote.lines.map((l: any) => (
                  <tr key={l.id}>
                    <td className="py-5">
                      <p className="font-bold text-slate-900">{l.name}</p>
                      <p className="text-sm text-slate-500">{l.description}</p>
                    </td>
                    <td className="py-5 text-center text-slate-600">{l.quantity}</td>
                    <td className="py-5 text-right text-slate-600">{parseFloat(l.unitPrice).toFixed(2)} €</td>
                    <td className="py-5 text-right text-slate-600">{l.iva}%</td>
                    <td className="py-5 text-right font-bold text-slate-900">{parseFloat(l.totalAmount).toFixed(2)} €</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="mt-10 flex flex-col items-end gap-2 bg-slate-50 p-8 rounded-3xl">
              <div className="flex w-64 justify-between text-slate-500 text-sm">
                <span>Base imponible</span>
                <span>{quote.lines.reduce((acc: number, l: any) => acc + (parseFloat(l.unitPrice) * parseFloat(l.quantity)), 0).toFixed(2)} €</span>
              </div>
              <div className="flex w-64 justify-between text-2xl font-bold text-slate-900 pt-2 border-t border-slate-200 mt-2">
                <span>TOTAL</span>
                <span>{quote.lines.reduce((acc: number, l: any) => acc + parseFloat(l.totalAmount), 0).toFixed(2)} €</span>
              </div>
            </div>

            {quote.observations && (
              <div className="mt-10 border-t border-slate-100 pt-10">
                <h3 className="text-xs font-bold uppercase text-slate-400 mb-3">Observaciones</h3>
                <p className="text-sm text-slate-600 leading-relaxed">{quote.observations}</p>
              </div>
            )}

            <div className="mt-20 text-center text-[10px] text-slate-400 uppercase tracking-widest leading-loose">
              {quote.company.footerInfo}
            </div>
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
