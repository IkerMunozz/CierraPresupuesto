'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function QuoteDetailPage() {
  const { id } = useParams();
  const router = useRouter();

  const [quote, setQuote] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    fetch(`/api/quotes/${id}`)
      .then((res) => res.json())
      .then((data) => {
        setQuote(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error fetching quote:', err);
        setLoading(false);
      });
  }, [id]);

  const generatePDFBlob = () => {
    if (!quote) return null;

    const doc = new jsPDF() as any;

    // Colores
    const primaryColor = [15, 23, 42];
    const accentColor = [37, 99, 235];
    const secondaryColor = [100, 116, 139];

    // Header superior
    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.rect(0, 0, 210, 40, 'F');

    // Logo texto
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(24);
    doc.text('VendeMás AI', 20, 25);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('PRESUPUESTOS PROFESIONALES', 20, 32);

    // Info presupuesto ID
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('PRESUPUESTO', 150, 20);
    doc.setFontSize(18);
    doc.text(`#PRE-${quote.id}`, 150, 30);

    // DE / PARA
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('DE:', 20, 55);
    doc.text('PARA:', 110, 55);

    doc.setDrawColor(226, 232, 240);
    doc.line(20, 58, 90, 58);
    doc.line(110, 58, 180, 58);

    // Emisor
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(quote.company?.name || 'Mi Empresa', 20, 65);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
    doc.text(quote.company?.address || '', 20, 70, { maxWidth: 70 });
    doc.text(`Tel: ${quote.company?.phone || '-'}`, 20, 80);
    doc.text(quote.company?.email || '', 20, 85);

    // Receptor
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.setFont('helvetica', 'bold');
    doc.text(quote.client?.name || 'Cliente', 110, 65);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
    doc.text(`NIF/CIF: ${quote.client?.taxId || '-'}`, 110, 70);
    doc.text(quote.client?.address || '', 110, 75, { maxWidth: 70 });
    doc.text(quote.client?.email || '', 110, 85);

    // Barra de detalles
    doc.setFillColor(248, 250, 252);
    doc.rect(20, 95, 170, 15, 'F');
    doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
    doc.setFontSize(9);
    doc.text('FECHA EMISIÓN', 25, 101);
    doc.text('VALIDEZ HASTA', 80, 101);
    doc.text('MÉTODO DE PAGO', 140, 101);

    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.setFont('helvetica', 'bold');
    doc.text(new Date(quote.date).toLocaleDateString(), 25, 106);
    doc.text(quote.validUntil ? new Date(quote.validUntil).toLocaleDateString() : 'Ver condiciones', 80, 106);
    doc.text(quote.paymentMethod || 'A convenir', 140, 106);

    // Tabla
    const tableData = quote.lines.map((l: any) => [
      { content: l.name + (l.description ? `\n${l.description}` : ''), styles: { fontStyle: 'bold' } },
      l.quantity,
      `${parseFloat(l.unitPrice).toFixed(2)} €`,
      `${l.iva}%`,
      { content: `${parseFloat(l.totalAmount).toFixed(2)} €`, styles: { halign: 'right', fontStyle: 'bold' } }
    ]);

    autoTable(doc, {
      startY: 115,
      head: [['Descripción', 'Cantidad', 'Precio U.', 'IVA', 'Total']],
      body: tableData,
      theme: 'plain',
      headStyles: { 
        fillColor: [241, 245, 249], 
        textColor: primaryColor,
        fontStyle: 'bold',
        fontSize: 10,
        cellPadding: 4
      },
      bodyStyles: { 
        fontSize: 9,
        cellPadding: 4,
        textColor: [51, 65, 85]
      },
      columnStyles: {
        0: { cellWidth: 80 },
        1: { halign: 'center' },
        2: { halign: 'right' },
        3: { halign: 'right' },
        4: { halign: 'right' }
      }
    });

    const finalY = (doc as any).lastAutoTable.finalY + 15;
    const total = quote.lines.reduce((acc: number, l: any) => acc + parseFloat(l.totalAmount), 0);
    const subtotal = quote.lines.reduce((acc: number, l: any) => acc + (parseFloat(l.unitPrice) * parseFloat(l.quantity)), 0);
    const totalIva = total - subtotal;

    doc.setFontSize(10);
    doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
    doc.text('Subtotal:', 140, finalY);
    doc.text('Impuestos:', 140, finalY + 6);
    
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text(`${subtotal.toFixed(2)} €`, 190, finalY, { align: 'right' });
    doc.text(`${totalIva.toFixed(2)} €`, 190, finalY + 6, { align: 'right' });

    doc.setFillColor(accentColor[0], accentColor[1], accentColor[2]);
    doc.rect(130, finalY + 12, 60, 12, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('TOTAL', 135, finalY + 20);
    doc.text(`${total.toFixed(2)} €`, 185, finalY + 20, { align: 'right' });

    if (quote.observations) {
      doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text('OBSERVACIONES / NOTAS:', 20, finalY + 10);
      doc.setFont('helvetica', 'normal');
      doc.text(quote.observations, 20, finalY + 16, { maxWidth: 100 });
    }

    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      if (quote.company?.footerInfo) {
        doc.text(quote.company.footerInfo, 105, 285, { align: 'center', maxWidth: 170 });
      }
      doc.text(`Página ${i} de ${pageCount}`, 190, 285, { align: 'right' });
      doc.text('Generado por VendeMás AI', 20, 285);
    }

    return doc;
  };

  const handleDownloadPDF = () => {
    const doc = generatePDFBlob();
    if (doc) doc.save(`Presupuesto_${quote.id}.pdf`);
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
      else {
        const err = await res.json();
        alert(`Error: ${err.message}`);
      }
    } catch (e: any) {
      alert(`Error: ${e.message}`);
    } finally {
      setSending(false);
    }
  };

  if (loading) return <div className="flex min-h-screen items-center justify-center">Cargando...</div>;
  if (!quote) return <div className="flex min-h-screen items-center justify-center">No se encontró el presupuesto</div>;

  return (
    <>
      <SiteHeader />
      <main className="min-h-screen bg-slate-50 py-12 px-4">
        <div className="mx-auto max-w-4xl">
          <div className="mb-8 flex items-center justify-between">
            <button onClick={() => router.push('/app/history')} className="text-sm font-bold text-slate-500 hover:text-slate-900 transition">
              ← Volver al historial
            </button>
            <div className="flex gap-3">
              <button onClick={handleDownloadPDF} className="rounded-xl bg-white border border-slate-200 px-5 py-2.5 text-sm font-bold text-slate-700 shadow-sm hover:bg-slate-50 transition">
                Descargar PDF
              </button>
              <button onClick={sendEmail} disabled={sending} className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-blue-200 hover:bg-blue-700 disabled:opacity-50 transition">
                {sending ? 'Enviando...' : 'Enviar por Email'}
              </button>
            </div>
          </div>

          <div className="rounded-[2.5rem] bg-white p-10 shadow-xl border border-slate-200">
            <div className="flex justify-between border-b border-slate-100 pb-10">
              <div>
                <h1 className="text-3xl font-bold text-slate-900">{quote.company?.name || 'Empresa'}</h1>
                <p className="text-slate-500 mt-2">{quote.company?.address}</p>
                <p className="text-slate-500">{quote.company?.email} · {quote.company?.phone}</p>
              </div>
              <div className="text-right">
                <h2 className="text-sm font-bold uppercase tracking-widest text-blue-600">Presupuesto</h2>
                <p className="text-3xl font-bold text-slate-900 mt-1">#PRE-{quote.id}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-10 py-10">
              <div>
                <h3 className="text-xs font-bold uppercase text-slate-400 mb-3">Cliente</h3>
                <p className="font-bold text-slate-900">{quote.client?.name}</p>
                <p className="text-slate-600">{quote.client?.taxId}</p>
                <p className="text-slate-600">{quote.client?.address}</p>
                <p className="text-sm text-blue-600 mt-1">{quote.client?.email}</p>
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
                {quote.lines?.map((l: any) => (
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
                <span>{quote.lines?.reduce((acc: number, l: any) => acc + (parseFloat(l.unitPrice) * parseFloat(l.quantity)), 0).toFixed(2)} €</span>
              </div>
              <div className="flex w-64 justify-between text-2xl font-bold text-slate-900 pt-2 border-t border-slate-200 mt-2">
                <span>TOTAL</span>
                <span>{quote.lines?.reduce((acc: number, l: any) => acc + parseFloat(l.totalAmount), 0).toFixed(2)} €</span>
              </div>
            </div>

            {quote.observations && (
              <div className="mt-10 border-t border-slate-100 pt-10">
                <h3 className="text-xs font-bold uppercase text-slate-400 mb-3">Observaciones</h3>
                <p className="text-sm text-slate-600 leading-relaxed">{quote.observations}</p>
              </div>
            )}
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
