'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import Results from '@/components/Results';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { FileText, Calendar, CreditCard, Building2, User, Mail, Phone, ArrowLeft, Download, Send } from 'lucide-react';

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

  const generatePDFBlob = async () => {
    if (!quote || !quote.id) return null;
    const doc = new jsPDF() as any;
    const primaryColor = [15, 23, 42];
    const accentColor = [59, 130, 246];
    const secondaryColor = [100, 116, 139];

    let logoImg: string | null = null;
    try {
      const resp = await fetch('/logo.png');
      const blob = await resp.blob();
      const reader = new FileReader();
      logoImg = await new Promise<string>((resolve, reject) => {
        reader.onloadend = () => {
          const result = reader.result as string;
          resolve(result.split(',')[1]);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch {}

    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.rect(0, 0, 210, 45, 'F');

    if (logoImg) {
      doc.addImage(logoImg, 'PNG', 18, 12, 28, 12);
    } else {
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(20);
      doc.text('VendeMás', 18, 26);
    }

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.text('PRESUPUESTO', 192, 20, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(new Date(quote.date || quote.createdAt).toLocaleDateString('es-ES', {
      day: '2-digit', month: 'long', year: 'numeric'
    }), 192, 28, { align: 'right' });

    doc.setFillColor(accentColor[0], accentColor[1], accentColor[2]);
    doc.rect(0, 45, 210, 1.5, 'F');

    const yStart = 55;

    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
    doc.text('DE', 18, yStart);
    doc.setDrawColor(accentColor[0], accentColor[1], accentColor[2]);
    doc.line(18, yStart + 2, 30, yStart + 2);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text(quote.company?.name || 'Mi Empresa', 18, yStart + 8);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
    let y = yStart + 13;
    if (quote.company?.address) { doc.text(quote.company.address, 18, y, { maxWidth: 75 }); y += 5; }
    if (quote.company?.email) { doc.text(quote.company.email, 18, y, { maxWidth: 75 }); y += 5; }
    if (quote.company?.phone) { doc.text(quote.company.phone, 18, y, { maxWidth: 75 }); }

    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
    doc.text('PARA', 115, yStart);
    doc.setDrawColor(accentColor[0], accentColor[1], accentColor[2]);
    doc.line(115, yStart + 2, 130, yStart + 2);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text(quote.client?.name || quote.clientName || 'Cliente', 115, yStart + 8);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
    y = yStart + 13;
    if (quote.client?.taxId) { doc.text(`NIF/CIF: ${quote.client.taxId}`, 115, y); y += 5; }
    if (quote.client?.email) { doc.text(quote.client.email, 115, y, { maxWidth: 75 }); y += 5; }
    if (quote.client?.address) { doc.text(quote.client.address, 115, y, { maxWidth: 75 }); }

    const yDetails = yStart + 25;
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(18, yDetails, 174, 12, 1.5, 1.5, 'F');

    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
    doc.text('FECHA', 24, yDetails + 4.5);
    doc.text('MÉTODO DE PAGO', 85, yDetails + 4.5);
    if (quote.validUntil) doc.text('VÁLIDO HASTA', 150, yDetails + 4.5);

    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text(new Date(quote.date || quote.createdAt).toLocaleDateString('es-ES'), 24, yDetails + 9);
    doc.text(quote.paymentMethod || 'A convenir', 85, yDetails + 9);
    if (quote.validUntil) {
      doc.text(new Date(quote.validUntil).toLocaleDateString('es-ES'), 150, yDetails + 9);
    }

    const tableLines = quote.lines || [];
    const tableData = tableLines.map((l: any) => [
      l.name,
      l.description || '',
      l.quantity.toString(),
      `${parseFloat(l.unitPrice || 0).toFixed(2)} €`,
      `${l.iva}%`,
      `${parseFloat(l.totalAmount || 0).toFixed(2)} €`
    ]);

    autoTable(doc, {
      startY: yDetails + 16,
      head: [['Concepto', 'Descripción', 'Cant.', 'Precio U.', 'IVA', 'Total']],
      body: tableData,
      theme: 'grid',
      headStyles: {
        fillColor: primaryColor,
        textColor: [255, 255, 255],
        fontSize: 8,
        fontStyle: 'bold',
        halign: 'center',
        cellPadding: 3.5
      },
      bodyStyles: {
        fontSize: 8,
        cellPadding: 3,
        textColor: [51, 65, 85]
      },
      columnStyles: {
        0: { cellWidth: 38, fontStyle: 'bold', textColor: primaryColor },
        1: { cellWidth: 58, textColor: secondaryColor },
        2: { cellWidth: 14, halign: 'center' },
        3: { cellWidth: 22, halign: 'right' },
        4: { cellWidth: 14, halign: 'center' },
        5: { cellWidth: 28, halign: 'right', fontStyle: 'bold', textColor: primaryColor }
      },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      margin: { left: 18, right: 18 }
    });

    const finalY = (doc as any).lastAutoTable.finalY + 6;
    const total = tableLines.reduce((acc: number, l: any) => acc + parseFloat(l.totalAmount || 0), 0);
    const subtotal = tableLines.reduce((acc: number, l: any) => acc + parseFloat(l.totalAmount || 0) / (1 + l.iva / 100), 0);
    const ivaTotal = total - subtotal;

    doc.setFillColor(248, 250, 252);
    doc.roundedRect(130, finalY, 62, 24, 1.5, 1.5, 'F');

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
    doc.text('Subtotal', 135, finalY + 6);
    doc.text('IVA', 135, finalY + 11.5);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text('TOTAL', 135, finalY + 19);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(`${subtotal.toFixed(2)} €`, 188, finalY + 6, { align: 'right' });
    doc.text(`${ivaTotal.toFixed(2)} €`, 188, finalY + 11.5, { align: 'right' });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text(`${total.toFixed(2)} €`, 188, finalY + 19, { align: 'right' });

    doc.setFillColor(accentColor[0], accentColor[1], accentColor[2]);
    doc.rect(130, finalY + 24, 62, 1, 'F');

    let footerY = finalY + 32;
    if (quote.observations) {
      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
      doc.text('Observaciones:', 18, footerY);
      doc.setFont('helvetica', 'normal');
      doc.text(quote.observations, 18, footerY + 4.5, { maxWidth: 174 });
      footerY += 12;
    }

    const pageH = doc.internal.pageSize.height || 297;
    doc.setDrawColor(226, 232, 240);
    doc.line(18, footerY, 192, footerY);

    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.rect(0, pageH - 16, 210, 16, 'F');

    if (logoImg) {
      doc.addImage(logoImg, 'PNG', 18, pageH - 13, 20, 9);
    } else {
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.text('VendeMás', 18, pageH - 7);
    }

    doc.setTextColor(148, 163, 184);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.text('Generado con VendeMás · Presupuestos profesionales con inteligencia artificial', 192, pageH - 7, { align: 'right' });

    return doc;
  };

  const handleDownloadPDF = async () => {
    const doc = await generatePDFBlob();
    if (doc) doc.save(`Presupuesto_${quote.client?.name || quote.clientName || 'cliente'}.pdf`);
  };

  const sendEmail = async () => {
    if (!quote.client?.email) {
      alert('El cliente no tiene email configurado');
      return;
    }
    setSending(true);
    try {
      const doc = await generatePDFBlob();
      if (!doc) throw new Error('No se pudo generar el PDF');
      const pdfBase64 = doc.output('datauristring').split(',')[1];
      const res = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quoteId: quote.id,
          clientEmail: quote.client.email,
          companyName: quote.company?.name || 'Mi Empresa',
          clientName: quote.client?.name || quote.clientName,
          pdfBase64,
          quoteTitle: quote.title,
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
      <main className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-50 py-12 px-4">
        <div className="mx-auto max-w-5xl">
          {/* Header Actions */}
          <div className="mb-8 flex items-center justify-between">
            <button 
              onClick={() => router.push('/app/history')}
              className="group flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-blue-600 transition-all duration-200"
            >
              <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
              <span>Volver al historial</span>
            </button>
            <div className="flex gap-3">
              <button 
                onClick={handleDownloadPDF}
                className="group flex items-center gap-2 rounded-xl bg-white border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:shadow-md hover:border-blue-200 hover:text-blue-600 transition-all duration-200"
              >
                <Download className="h-4 w-4 transition-transform group-hover:scale-110" />
                <span>Descargar PDF</span>
              </button>
              <button 
                onClick={sendEmail} 
                disabled={sending}
                className="group flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-200 hover:shadow-xl hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
              >
                <Send className="h-4 w-4 transition-transform group-hover:scale-110" />
                <span>{sending ? 'Enviando...' : 'Enviar por Email'}</span>
              </button>
            </div>
          </div>

          {/* Quote Card */}
          <div className="rounded-3xl bg-white shadow-2xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
            {/* Header Section */}
            <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 px-10 py-8">
              <div className="flex justify-between items-start">
                <div className="max-w-[60%]">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="bg-blue-500/20 p-2 rounded-lg">
                      <Building2 className="h-5 w-5 text-blue-400" />
                    </div>
                    <h1 className="text-2xl font-bold text-white break-words">{quote.company?.name || 'Empresa'}</h1>
                  </div>
                  <div className="space-y-1">
                    <p className="text-slate-300 text-sm flex items-center gap-2">
                      <span className="w-1 h-1 bg-slate-500 rounded-full"></span>
                      {quote.company?.address || 'Dirección no disponible'}
                    </p>
                    <p className="text-slate-300 text-sm flex items-center gap-2">
                      <Mail className="h-3 w-3" />
                      {quote.company?.email || 'Email no disponible'}
                    </p>
                    {quote.company?.phone && (
                      <p className="text-slate-300 text-sm flex items-center gap-2">
                        <Phone className="h-3 w-3" />
                        {quote.company.phone}
                      </p>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full border border-white/10">
                    <FileText className="h-4 w-4 text-blue-400" />
                    <span className="text-xs font-bold uppercase tracking-wider text-white">Presupuesto</span>
                  </div>
                  <p className="text-lg font-semibold text-white mt-3 tracking-tight">
                    {new Date(quote.date || quote.createdAt).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                  </p>
                </div>
              </div>
            </div>

            {/* Content Section */}
            <div className="px-10 py-8">
              {/* Client & Details Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                {/* Client Info */}
                <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-2xl p-6 border border-slate-200">
                  <div className="flex items-center gap-2 mb-4">
                    <User className="h-4 w-4 text-blue-600" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Cliente</h3>
                  </div>
                  <div className="space-y-2">
                    <p className="font-bold text-slate-900 text-lg break-words">{quote.client?.name || quote.clientName}</p>
                    {quote.client?.taxId && (
                      <p className="text-sm text-slate-600 font-mono bg-white/50 px-2 py-1 rounded inline-block">{quote.client.taxId}</p>
                    )}
                    {quote.client?.email && (
                      <p className="text-sm text-blue-600 flex items-center gap-2">
                        <Mail className="h-3 w-3" />
                        {quote.client.email}
                      </p>
                    )}
                  </div>
                </div>

                {/* Details */}
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-100">
                  <div className="flex items-center gap-2 mb-4">
                    <Calendar className="h-4 w-4 text-blue-600" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Detalles</h3>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-slate-600">Fecha</span>
                      <span className="text-sm font-bold text-slate-900">{new Date(quote.date || quote.createdAt).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })}</span>
                    </div>
                    {quote.validUntil && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-slate-600">Válido hasta</span>
                        <span className="text-sm font-bold text-slate-900">{new Date(quote.validUntil).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-slate-600 flex items-center gap-2">
                        <CreditCard className="h-3 w-3" />
                        Método de pago
                      </span>
                      <span className="text-sm font-bold text-blue-600">{quote.paymentMethod || 'A convenir'}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Table */}
              <div className="rounded-2xl border border-slate-200 overflow-hidden mb-8">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-gradient-to-r from-slate-50 to-slate-100 border-b border-slate-200">
                      <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Concepto</th>
                      <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500 text-center">Cant.</th>
                      <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500 text-right">Precio</th>
                      <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500 text-right">IVA</th>
                      <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(quote.lines || []).map((l: any, index: number) => (
                      <tr key={l.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-5">
                          <div className="flex items-start gap-3">
                            <div className="bg-blue-100 text-blue-600 rounded-lg p-2 mt-0.5">
                              <FileText className="h-4 w-4" />
                            </div>
                            <div>
                              <p className="font-bold text-slate-900">{l.name}</p>
                              {l.description && (
                                <p className="text-sm text-slate-500 mt-1">{l.description}</p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-5 text-center">
                          <span className="inline-flex items-center justify-center bg-slate-100 text-slate-700 font-semibold px-3 py-1 rounded-full text-sm">
                            {l.quantity}
                          </span>
                        </td>
                        <td className="px-6 py-5 text-right text-slate-600 font-medium">{parseFloat(l.unitPrice || 0).toFixed(2)} €</td>
                        <td className="px-6 py-5 text-right">
                          <span className="inline-flex items-center justify-center bg-amber-100 text-amber-700 font-semibold px-3 py-1 rounded-full text-sm">
                            {l.iva}%
                          </span>
                        </td>
                        <td className="px-6 py-5 text-right">
                          <span className="font-bold text-slate-900 text-lg">{parseFloat(l.totalAmount || 0).toFixed(2)} €</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Total Section */}
              <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 rounded-2xl p-8 shadow-xl">
                <div className="flex flex-col items-end gap-4">
                  <div className="flex items-center gap-3 text-slate-300 text-sm">
                    <span className="font-medium">Subtotal</span>
                    <span className="font-mono">
                      {(quote.lines || []).reduce((acc: number, l: any) => acc + (parseFloat(l.totalAmount || 0) / (1 + l.iva / 100)), 0).toFixed(2)} €
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-slate-300 text-sm">
                    <span className="font-medium">IVA</span>
                    <span className="font-mono">
                      {(quote.lines || []).reduce((acc: number, l: any) => acc + parseFloat(l.totalAmount || 0) - (parseFloat(l.totalAmount || 0) / (1 + l.iva / 100)), 0).toFixed(2)} €
                    </span>
                  </div>
                  <div className="w-full h-px bg-slate-700 my-2"></div>
                  <div className="flex items-center justify-between w-full max-w-xs">
                    <span className="text-lg font-bold text-white uppercase tracking-wider">Total</span>
                    <span className="text-3xl font-black text-white tracking-tight">
                      {(quote.lines || []).reduce((acc: number, l: any) => acc + parseFloat(l.totalAmount || 0), 0).toFixed(2)} €
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Results Section */}
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
