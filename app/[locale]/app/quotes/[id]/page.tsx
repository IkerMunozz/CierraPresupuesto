'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import Results from '@/components/Results';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function QuoteDetailPage() {
  const { id } = useParams();
  const router = useRouter();

  const [quote, setQuote] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    fetch(`/api/quotes/${id}`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Error al cargar el presupuesto');
        return data;
      })
      .then((data) => {
        setQuote(data);
        setError(null);
      })
      .catch(err => {
        console.error('Error fetching quote:', err);
        setError(err.message);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [id]);

  const generatePDFBlob = () => {
    if (!quote || !quote.id) return null;
    const doc = new jsPDF() as any;
    const primaryColor = [15, 23, 42];
    const accentColor = [37, 99, 235];
    const secondaryColor = [100, 116, 139];

    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.rect(0, 0, 210, 40, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(24);
    doc.text('VendeMás AI', 20, 25);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('PRESUPUESTOS PROFESIONALES', 20, 32);

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('PRESUPUESTO', 150, 20);
    doc.setFontSize(18);
    doc.text(`#PRE-${quote.id.substring(0, 8)}`, 150, 30);

    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.setFontSize(12);
    doc.text('DE:', 20, 55);
    doc.text('PARA:', 110, 55);
    doc.setDrawColor(226, 232, 240);
    doc.line(20, 58, 90, 58);
    doc.line(110, 58, 180, 58);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(quote.company?.name || 'Mi Empresa', 20, 65);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
    doc.text(quote.company?.address || '', 20, 70, { maxWidth: 70 });
    doc.text(quote.company?.email || '', 20, 85);

    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.setFont('helvetica', 'bold');
    doc.text(quote.client?.name || quote.clientName || 'Cliente', 110, 65);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
    doc.text(`NIF/CIF: ${quote.client?.taxId || '-'}`, 110, 70);
    doc.text(quote.client?.email || '', 110, 85);

    doc.setFillColor(248, 250, 252);
    doc.rect(20, 95, 170, 15, 'F');
    doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
    doc.setFontSize(9);
    doc.text('FECHA EMISIÓN', 25, 101);
    doc.text('MÉTODO DE PAGO', 140, 101);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.setFont('helvetica', 'bold');
    doc.text(new Date(quote.date || quote.createdAt).toLocaleDateString(), 25, 106);
    doc.text(quote.paymentMethod || 'A convenir', 140, 106);

    const tableLines = quote.lines || [];
    const tableData = tableLines.map((l: any) => [
      { content: l.name + (l.description ? `\n${l.description}` : ''), styles: { fontStyle: 'bold' } },
      l.quantity,
      `${parseFloat(l.unitPrice || 0).toFixed(2)} €`,
      `${l.iva}%`,
      { content: `${parseFloat(l.totalAmount || 0).toFixed(2)} €`, styles: { halign: 'right', fontStyle: 'bold' } }
    ]);

    autoTable(doc, {
      startY: 115,
      head: [['Descripción', 'Cantidad', 'Precio U.', 'IVA', 'Total']],
      body: tableData,
      theme: 'plain',
      headStyles: { fillColor: [241, 245, 249], textColor: primaryColor, fontStyle: 'bold' },
      columnStyles: { 0: { cellWidth: 80 }, 1: { halign: 'center' }, 4: { halign: 'right' } }
    });

    const finalY = (doc as any).lastAutoTable.finalY + 15;
    const total = tableLines.reduce((acc: number, l: any) => acc + parseFloat(l.totalAmount || 0), 0);
    doc.setFillColor(accentColor[0], accentColor[1], accentColor[2]);
    doc.rect(130, finalY, 60, 12, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('TOTAL', 135, finalY + 8);
    doc.text(`${total.toFixed(2)} €`, 185, finalY + 8, { align: 'right' });

    return doc;
  };

  const handleDownloadPDF = () => {
    const doc = generatePDFBlob();
    if (doc) doc.save(`Presupuesto_${quote.id.substring(0, 8)}.pdf`);
  };

  const sendEmail = async () => {
    if (!quote.client?.email) {
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
          companyName: quote.company?.name || 'Mi Empresa',
          pdfBase64,
        }),
      });
      if (res.ok) alert('Presupuesto enviado con éxito');
    } catch (e: any) {
      alert(`Error: ${e.message}`);
    } finally {
      setSending(false);
    }
  };

  if (loading) return <div className="flex min-h-screen items-center justify-center">Cargando presupuesto...</div>;
  if (error) return <div className="flex flex-col min-h-screen items-center justify-center p-4"><h2 className="text-red-600 font-bold mb-2">Error</h2><p>{error}</p></div>;
  if (!quote?.id) return <div className="flex min-h-screen items-center justify-center">Presupuesto no encontrado</div>;

  return (
    <>
      <SiteHeader />
      <main className="min-h-screen bg-slate-50 py-12 px-4 text-left">
        <div className="mx-auto max-w-4xl">
          <div className="mb-8 flex items-center justify-between">
            <button onClick={() => router.push('/app/history')} className="text-sm font-bold text-slate-500 hover:text-slate-900 transition">← Historial</button>
            <div className="flex gap-3">
              <button onClick={handleDownloadPDF} className="rounded-xl bg-white border border-slate-200 px-5 py-2.5 text-sm font-bold text-slate-700 shadow-sm hover:bg-slate-50 transition">Descargar PDF</button>
              <button onClick={sendEmail} disabled={sending} className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-blue-200 hover:bg-blue-700 disabled:opacity-50 transition">{sending ? 'Enviando...' : 'Enviar por Email'}</button>
            </div>
          </div>

          <div className="rounded-[2.5rem] bg-white p-10 shadow-xl border border-slate-200">
            <div className="flex justify-between border-b border-slate-100 pb-10">
              <div className="max-w-[60%]">
                <h1 className="text-3xl font-bold text-slate-900 break-words">{quote.company?.name || 'Empresa'}</h1>
                <p className="text-slate-500 mt-2 break-words">{quote.company?.address}</p>
                <p className="text-slate-500 break-words">{quote.company?.email} {quote.company?.phone ? `· ${quote.company.phone}` : ''}</p>
              </div>
              <div className="text-right">
                <h2 className="text-sm font-bold uppercase tracking-widest text-blue-600">Presupuesto</h2>
                <p className="text-3xl font-bold text-slate-900 mt-1"></p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-10 py-10">
              <div className="text-left">
                <h3 className="text-xs font-bold uppercase text-slate-400 mb-3">Cliente</h3>
                <p className="font-bold text-slate-900 break-words">{quote.client?.name || quote.clientName}</p>
                <p className="text-slate-600 break-words">{quote.client?.taxId}</p>
                <p className="text-sm text-blue-600 mt-1 break-words">{quote.client?.email}</p>
              </div>
              <div className="text-right">
                <h3 className="text-xs font-bold uppercase text-slate-400 mb-3">Detalles</h3>
                <p className="text-slate-600"><span className="font-medium">Fecha:</span> {new Date(quote.date || quote.createdAt).toLocaleDateString()}</p>
                <p className="text-slate-600"><span className="font-medium">Válido:</span> {quote.validUntil ? new Date(quote.validUntil).toLocaleDateString() : 'N/A'}</p>
                <p className="text-slate-600"><span className="font-medium">Pago:</span> {quote.paymentMethod || 'A convenir'}</p>
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
                {(quote.lines || []).map((l: any) => (
                  <tr key={l.id}>
                    <td className="py-5 pr-4">
                      <p className="font-bold text-slate-900 text-left">{l.name}</p>
                      <p className="text-sm text-slate-500 text-left">{l.description}</p>
                    </td>
                    <td className="py-5 text-center text-slate-600">{l.quantity}</td>
                    <td className="py-5 text-right text-slate-600">{parseFloat(l.unitPrice || 0).toFixed(2)} €</td>
                    <td className="py-5 text-right text-slate-600">{l.iva}%</td>
                    <td className="py-5 text-right font-bold text-slate-900">{parseFloat(l.totalAmount || 0).toFixed(2)} €</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="mt-10 flex flex-col items-end gap-2 bg-slate-50 p-8 rounded-3xl">
              <div className="flex w-64 justify-between text-2xl font-bold text-slate-900 pt-2 border-t border-slate-200 mt-2">
                <span>TOTAL</span>
                <span>{(quote.lines || []).reduce((acc: number, l: any) => acc + parseFloat(l.totalAmount || 0), 0).toFixed(2)} €</span>
              </div>
            </div>
          </div>

          <div className="mt-12">
            <Results 
              result={{
                quote: quote.content || quote.quote || (quote.lines?.length ? 'Presupuesto detallado por conceptos' : ''),
                analysis: quote.analysis || { score: 0, feedback: [], risks: [], competitiveness: 'media' },
                improvedQuote: quote.improved || '',
                isFree: quote.isFree
              }} 
              loading={false} 
              error={null} 
            />
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
