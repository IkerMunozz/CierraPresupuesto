'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  CompanyInput,
  ClientInput,
  ConceptInput,
  QuoteLineInput,
  ProfessionalQuoteInput,
} from '@/lib/domain/professionalQuoteSchemas';

interface StepProps {
  onNext: () => void;
  onPrev: () => void;
  data: any;
  updateData: (newData: any) => void;
}

// --- Componentes de Apoyo ---

function Modal({
  isOpen,
  onClose,
  title,
  children,
}: {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 p-4">
      <div className="w-full max-w-md rounded-md bg-white border border-slate-300 p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4 border-b border-slate-200 pb-3">
          <h3 className="text-base font-semibold text-slate-800">{title}</h3>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-700 text-sm">
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

// --- Pasos del Formulario ---

function Step1Company({ onNext, data, updateData }: Omit<StepProps, 'onPrev'>) {
  const [companies, setCompanies] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newCompany, setNewCompany] = useState<CompanyInput>({
    name: '',
    phone: '',
    email: '',
    address: '',
    footerInfo: '',
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/companies')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setCompanies(data);
        } else {
          console.error('Error fetching companies:', data);
        }
        setLoading(false);
      })
      .catch((error) => {
        console.error('Error fetching companies:', error);
        setLoading(false);
      });
  }, []);

  const handleAddCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Sending new company data:', newCompany);
    try {
      const res = await fetch('/api/companies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newCompany),
      });
      if (res.ok) {
        const created = await res.json();
        setCompanies([...companies, created]);
        updateData({ companyId: created.id });
        setIsModalOpen(false);
      } else {
        const errorData = await res.json();
        console.error('Error response from API:', errorData);
        alert(`Error: ${errorData.message || 'No se pudo crear la empresa'}`);
      }
    } catch (error) {
      console.error('Network error creating company:', error);
      alert('Error de red al crear la empresa');
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-base font-semibold text-slate-800 mb-1">Emisor</h2>
      <p className="text-sm text-slate-500 mb-4">Selecciona la empresa que emite el presupuesto.</p>

      {loading ? (
        <div className="h-20 animate-pulse bg-slate-100 rounded-sm" />
      ) : (
        <div className="grid gap-2 sm:grid-cols-3">
          {companies.map((c) => (
            <button
              key={c.id}
              onClick={() => updateData({ companyId: c.id })}
              className={`flex flex-col items-start rounded-sm border p-3 text-left transition ${
                data.companyId === c.id ? 'border-slate-800 bg-slate-50' : 'border-slate-200 hover:border-slate-400'
              }`}
            >
              <span className="font-medium text-slate-800 text-sm">{c.name}</span>
              <span className="text-xs text-slate-500">{c.email || 'Sin email'}</span>
            </button>
          ))}
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center justify-center rounded-sm border border-dashed border-slate-300 p-3 text-slate-500 hover:border-slate-500 hover:text-slate-700 transition"
          >
            <span className="text-sm">+ Añadir</span>
          </button>
        </div>
      )}

      <div className="flex justify-end pt-4 border-t border-slate-200 mt-4">
        <button
          disabled={!data.companyId}
          onClick={onNext}
          className="rounded-sm bg-slate-800 px-5 py-2 text-sm font-medium text-white transition hover:bg-slate-700 disabled:opacity-50"
        >
          Continuar →
        </button>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Nueva Empresa">
        <form onSubmit={handleAddCompany} className="space-y-3">
          <input
            placeholder="Nombre de la empresa *"
            required
            className="w-full rounded-sm border border-slate-300 p-2 text-sm"
            value={newCompany.name}
            onChange={(e) => setNewCompany({ ...newCompany, name: e.target.value })}
          />
          <input
            placeholder="Teléfono"
            className="w-full rounded-sm border border-slate-300 p-2 text-sm"
            value={newCompany.phone}
            onChange={(e) => setNewCompany({ ...newCompany, phone: e.target.value })}
          />
          <input
            placeholder="Email"
            type="email"
            className="w-full rounded-sm border border-slate-300 p-2 text-sm"
            value={newCompany.email}
            onChange={(e) => setNewCompany({ ...newCompany, email: e.target.value })}
          />
          <textarea
            placeholder="Dirección"
            className="w-full rounded-sm border border-slate-300 p-2 text-sm"
            value={newCompany.address}
            onChange={(e) => setNewCompany({ ...newCompany, address: e.target.value })}
          />
          <textarea
            placeholder="Información en el pie"
            className="w-full rounded-sm border border-slate-300 p-2 text-sm"
            value={newCompany.footerInfo}
            onChange={(e) => setNewCompany({ ...newCompany, footerInfo: e.target.value })}
          />
          <button className="w-full rounded-sm bg-slate-800 py-2 text-sm font-medium text-white hover:bg-slate-700">
            Guardar
          </button>
        </form>
      </Modal>
    </div>
  );
}

function Step2Client({ onNext, onPrev, data, updateData }: StepProps) {
  const [clients, setClients] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newClient, setNewClient] = useState<ClientInput>({ name: '', email: '', phone: '', address: '', taxId: '' });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/clients')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setClients(data);
        } else {
          console.error('Error fetching clients:', data);
        }
        setLoading(false);
      })
      .catch((error) => {
        console.error('Error fetching clients:', error);
        setLoading(false);
      });
  }, []);

  const handleAddClient = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Sending new client data:', newClient);
    try {
      const res = await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newClient),
      });
      if (res.ok) {
        const created = await res.json();
        setClients([...clients, created]);
        updateData({ clientId: created.id });
        setIsModalOpen(false);
      } else {
        const errorData = await res.json();
        console.error('Error response from API:', errorData);
        alert(`Error: ${errorData.message || 'No se pudo crear el cliente'}`);
      }
    } catch (error) {
      console.error('Network error creating client:', error);
      alert('Error de red al crear el cliente');
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-base font-semibold text-slate-800 mb-1">Cliente</h2>
      <p className="text-sm text-slate-500 mb-4">Selecciona el cliente destinatario.</p>

      {loading ? (
        <div className="h-20 animate-pulse bg-slate-100 rounded-sm" />
      ) : (
        <div className="grid gap-2 sm:grid-cols-3">
          {clients.map((c) => (
            <button
              key={c.id}
              onClick={() => updateData({ clientId: c.id })}
              className={`flex flex-col items-start rounded-sm border p-3 text-left transition ${
                data.clientId === c.id ? 'border-slate-800 bg-slate-50' : 'border-slate-200 hover:border-slate-400'
              }`}
            >
              <span className="font-medium text-slate-800 text-sm">{c.name}</span>
              <span className="text-xs text-slate-500">{c.email || 'Sin email'}</span>
            </button>
          ))}
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center justify-center rounded-sm border border-dashed border-slate-300 p-3 text-slate-500 hover:border-slate-500 hover:text-slate-700 transition"
          >
            <span className="text-sm">+ Nuevo</span>
          </button>
        </div>
      )}

      <div className="flex justify-between pt-4 border-t border-slate-200 mt-4">
        <button
          onClick={onPrev}
          className="rounded-sm border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
        >
          ← Atrás
        </button>
        <button
          disabled={!data.clientId}
          onClick={onNext}
          className="rounded-sm bg-slate-800 px-5 py-2 text-sm font-medium text-white transition hover:bg-slate-700 disabled:opacity-50"
        >
          Continuar →
        </button>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Nuevo Cliente">
        <form onSubmit={handleAddClient} className="space-y-3">
          <input
            placeholder="Nombre del cliente/empresa *"
            required
            className="w-full rounded-sm border border-slate-300 p-2 text-sm"
            value={newClient.name}
            onChange={(e) => setNewClient({ ...newClient, name: e.target.value })}
          />
          <input
            placeholder="CIF / NIF"
            className="w-full rounded-sm border border-slate-300 p-2 text-sm"
            value={newClient.taxId}
            onChange={(e) => setNewClient({ ...newClient, taxId: e.target.value })}
          />
          <input
            placeholder="Email"
            type="email"
            className="w-full rounded-sm border border-slate-300 p-2 text-sm"
            value={newClient.email}
            onChange={(e) => setNewClient({ ...newClient, email: e.target.value })}
          />
          <input
            placeholder="Teléfono"
            className="w-full rounded-sm border border-slate-300 p-2 text-sm"
            value={newClient.phone}
            onChange={(e) => setNewClient({ ...newClient, phone: e.target.value })}
          />
          <textarea
            placeholder="Dirección"
            className="w-full rounded-sm border border-slate-300 p-2 text-sm"
            value={newClient.address}
            onChange={(e) => setNewClient({ ...newClient, address: e.target.value })}
          />
          <button className="w-full rounded-sm bg-slate-800 py-2 text-sm font-medium text-white hover:bg-slate-700">
            Guardar
          </button>
        </form>
      </Modal>
    </div>
  );
}

function Step3GeneralData({ onNext, onPrev, data, updateData }: StepProps) {
  return (
    <div className="space-y-4">
      <h2 className="text-base font-semibold text-slate-800 mb-1">Datos del documento</h2>
      <p className="text-sm text-slate-500 mb-4">Configura las opciones generales.</p>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-600">Fecha *</label>
          <input
            type="date"
            required
            className="w-full rounded-sm border border-slate-300 p-2 text-sm"
            value={data.date}
            onChange={(e) => updateData({ date: e.target.value })}
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-600">Válido hasta</label>
          <input
            type="date"
            className="w-full rounded-sm border border-slate-300 p-2 text-sm"
            value={data.validUntil || ''}
            onChange={(e) => updateData({ validUntil: e.target.value })}
          />
        </div>
        <div className="space-y-1 sm:col-span-2">
          <label className="text-xs font-medium text-slate-600">Forma de pago</label>
          <select
            className="w-full rounded-sm border border-slate-300 p-2 text-sm bg-white"
            value={data.paymentMethod || ''}
            onChange={(e) => updateData({ paymentMethod: e.target.value })}
          >
            <option value="">Selecciona...</option>
            <option value="Transferencia Bancaria">Transferencia Bancaria</option>
            <option value="Tarjeta de Crédito/Débito">Tarjeta</option>
            <option value="PayPal">PayPal</option>
            <option value="Efectivo">Efectivo</option>
            <option value="A convenir">A convenir</option>
          </select>
        </div>
        <div className="space-y-1 sm:col-span-2">
          <label className="text-xs font-medium text-slate-600">Observaciones</label>
          <textarea
            placeholder="Notas para el cliente..."
            rows={2}
            className="w-full rounded-sm border border-slate-300 p-2 text-sm"
            value={data.observations || ''}
            onChange={(e) => updateData({ observations: e.target.value })}
          />
        </div>
      </div>

      <div className="flex justify-between pt-4 border-t border-slate-200 mt-4">
        <button
          onClick={onPrev}
          className="rounded-sm border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
        >
          ← Atrás
        </button>
        <button
          onClick={onNext}
          className="rounded-sm bg-slate-800 px-5 py-2 text-sm font-medium text-white transition hover:bg-slate-700"
        >
          Continuar →
        </button>
      </div>
    </div>
  );
}

function IAPricingRecommendation({ 
  total, 
  clientId, 
  onApply 
}: { 
  total: number, 
  clientId: number, 
  onApply: (price: number) => void 
}) {
  const [recommendation, setRecommendation] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const getRecommendation = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/quotes/analysis/pricing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ basePrice: total, clientId }),
      });
      if (res.ok) {
        const data = await res.json();
        setRecommendation(data);
      }
    } catch (e) {
      console.error('Error fetching recommendation', e);
    } finally {
      setLoading(false);
    }
  };

  if (!recommendation && !loading) {
    return (
      <button 
        onClick={getRecommendation}
        className="flex items-center gap-2 rounded-xl bg-blue-50 px-4 py-3 text-sm font-bold text-blue-700 hover:bg-blue-100 transition-all border border-blue-100"
      >
        <span className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
        Analizar precio con IA
      </button>
    );
  }

  if (loading) return <div className="h-12 w-48 animate-pulse bg-slate-100 rounded-xl" />;

  return (
    <div className="rounded-[1.5rem] border border-blue-200 bg-blue-50/50 p-6 shadow-sm">
      <div className="flex items-center gap-2 mb-4 text-blue-800">
        <div className="h-8 w-8 rounded-lg bg-blue-600 flex items-center justify-center text-white">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
            <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
          </svg>
        </div>
        <div>
          <h3 className="text-sm font-bold">Optimización de Precio IA</h3>
          <p className="text-[10px] uppercase font-bold tracking-widest opacity-70">Recomendación estratégica</p>
        </div>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <div>
          <p className="text-xs font-bold text-blue-600 uppercase tracking-tighter mb-1">Precio Recomendado</p>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">{recommendation.recommendedPrice} €</span>
            <span className="text-xs font-bold text-slate-500">
              ({recommendation.minPrice}€ - {recommendation.maxPrice}€)
            </span>
          </div>
        </div>
        <div className="flex flex-col justify-center">
          <p className="text-xs font-bold text-blue-600 uppercase tracking-tighter mb-1">Probabilidad de Éxito</p>
          <div className="flex items-center gap-3">
            <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
              <div 
                className="h-full bg-blue-600 transition-all duration-1000" 
                style={{ width: `${recommendation.acceptanceProbability}%` }}
              />
            </div>
            <span className="text-sm font-black text-slate-900">{recommendation.acceptanceProbability}%</span>
          </div>
        </div>
      </div>

      <p className="mt-4 text-sm text-slate-600 leading-relaxed italic border-l-4 border-blue-400 pl-4">
        "{recommendation.reasoning}"
      </p>

      <button 
        onClick={() => onApply(recommendation.recommendedPrice)}
        className="mt-6 w-full rounded-xl bg-slate-900 py-3 text-sm font-bold text-white hover:bg-slate-800 transition-all shadow-lg shadow-blue-900/10"
      >
        Aplicar precio recomendado
      </button>
    </div>
  );
}

function Step4Lines({ onPrev, data, updateData }: Omit<StepProps, 'onNext'>) {
  const router = useRouter();
  const [lines, setLines] = useState<QuoteLineInput[]>(
    data.lines || [{ name: '', description: '', quantity: 1, unitPrice: 0, discount: 0, iva: 21 }],
  );
  const [isSaving, setIsSaving] = useState(false);

  const addLine = () => {
    setLines([...lines, { name: '', description: '', quantity: 1, unitPrice: 0, discount: 0, iva: 21 }]);
  };

  const removeLine = (idx: number) => {
    if (lines.length > 1) {
      setLines(lines.filter((_, i) => i !== idx));
    }
  };

  const updateLine = (idx: number, field: keyof QuoteLineInput, value: any) => {
    const newLines = [...lines];
    (newLines[idx] as any)[field] = value;
    setLines(newLines);
  };

  const handleApplyAIPrice = (price: number) => {
    // Aplicar a la última línea o repartir (aquí lo aplicamos a la última por simplicidad)
    const newLines = [...lines];
    newLines[newLines.length - 1].unitPrice = price;
    setLines(newLines);
  };

  const calculateSubtotal = () => {
    return lines.reduce((acc, line) => {
      const base = line.quantity * line.unitPrice;
      const disc = base * (line.discount / 100);
      return acc + (base - disc);
    }, 0);
  };

  const calculateTotal = () => {
    return lines.reduce((acc, line) => {
      const base = line.quantity * line.unitPrice;
      const disc = base * (line.discount / 100);
      const sub = base - disc;
      const tax = sub * (line.iva / 100);
      return acc + sub + tax;
    }, 0);
  };

  const handleCreate = async () => {
    setIsSaving(true);
    const fullData = { ...data, lines };
    console.log('Creating professional quote with data:', fullData);
    try {
      const res = await fetch('/api/quotes/professional', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fullData),
      });
      if (res.ok) {
        const quote = await res.json();
        router.push(`/app/quotes/${quote.id}`);
      } else {
        const errorData = await res.json();
        console.error('Error creating quote:', errorData);
        alert(`Error: ${errorData.message || 'No se pudo crear el presupuesto'}`);
      }
    } catch (e) {
      console.error('Network error creating quote:', e);
      alert('Error de red al crear el presupuesto');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between border-b border-slate-200 pb-3">
        <div>
          <h2 className="text-base font-semibold text-slate-800">Líneas</h2>
        </div>
        <button
          onClick={addLine}
          className="rounded-sm border border-slate-300 px-3 py-1 text-xs font-medium text-slate-600 hover:border-slate-500 transition"
        >
          + Añadir
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-slate-500">
              <th className="pb-2 pr-3 font-medium text-xs uppercase">Concepto</th>
              <th className="pb-2 pr-3 font-medium text-xs uppercase w-16">Cant.</th>
              <th className="pb-2 pr-3 font-medium text-xs uppercase w-24">P. Unit</th>
              <th className="pb-2 pr-3 font-medium text-xs uppercase w-16">IVA</th>
              <th className="pb-2 font-medium text-xs uppercase text-right">Total</th>
              <th className="pb-2 pl-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {lines.map((line, idx) => (
              <tr key={idx}>
                <td className="py-3 pr-3">
                  <input
                    placeholder="Servicio..."
                    className="w-full font-medium text-slate-800 text-sm outline-none"
                    value={line.name}
                    onChange={(e) => updateLine(idx, 'name', e.target.value)}
                  />
                  <input
                    placeholder="Descripción"
                    className="w-full mt-1 text-slate-500 text-xs outline-none"
                    value={line.description || ''}
                    onChange={(e) => updateLine(idx, 'description', e.target.value)}
                  />
                </td>
                <td className="py-4 pr-4">
                  <input
                    type="number"
                    className="w-full rounded-sm border border-slate-200 p-1 text-sm"
                    value={line.quantity}
                    onChange={(e) => updateLine(idx, 'quantity', parseFloat(e.target.value) || 0)}
                  />
                </td>
                <td className="py-4 pr-4">
                  <input
                    type="number"
                    className="w-full rounded-sm border border-slate-200 p-1 text-sm"
                    value={line.unitPrice}
                    onChange={(e) => updateLine(idx, 'unitPrice', parseFloat(e.target.value) || 0)}
                  />
                </td>
                <td className="py-4 pr-4">
                  <select
                    className="w-full rounded-sm border border-slate-200 p-1 text-sm bg-white"
                    value={line.iva}
                    onChange={(e) => updateLine(idx, 'iva', parseInt(e.target.value))}
                  >
                    <option value={21}>21%</option>
                    <option value={10}>10%</option>
                    <option value={4}>4%</option>
                    <option value={0}>0%</option>
                  </select>
                </td>
                <td className="py-4 text-right font-medium text-slate-800">
                  {(line.quantity * line.unitPrice * (1 + line.iva / 100)).toLocaleString('es-ES', {
                    minimumFractionDigits: 2,
                  })}{' '}
                  €
                </td>
                <td className="py-4 pl-4 text-right">
                  <button onClick={() => removeLine(idx)} className="text-slate-400 hover:text-red-600 text-sm">
                    ✕
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col items-end gap-1 pt-4 border-t border-slate-200">
        <div className="flex w-48 justify-between text-sm text-slate-500">
          <span>Subtotal</span>
          <span>{calculateSubtotal().toLocaleString('es-ES', { minimumFractionDigits: 2 })} €</span>
        </div>
        <div className="flex w-48 justify-between text-base font-semibold text-slate-800">
          <span>TOTAL</span>
          <span>{calculateTotal().toLocaleString('es-ES', { minimumFractionDigits: 2 })} €</span>
        </div>
      </div>

      {/* IA Recommendation Section */}
      <div className="mt-4">
        <IAPricingRecommendation 
          total={calculateSubtotal()} 
          clientId={data.clientId} 
          onApply={handleApplyAIPrice} 
        />
      </div>

      <div className="flex justify-between pt-8 border-t border-slate-200 mt-4">
        <button
          onClick={onPrev}
          className="rounded-sm border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
        >
          ← Atrás
        </button>
        <div className="flex gap-2">
          <button
            disabled={isSaving}
            onClick={handleCreate}
            className="rounded-sm bg-slate-900 px-8 py-3 text-sm font-bold text-white hover:bg-slate-800 transition-all shadow-lg disabled:opacity-50"
          >
            {isSaving ? 'Guardando...' : 'Crear Presupuesto'}
          </button>
        </div>
      </div>
    </div>
  );
}

// --- Componente Principal ---

export default function ProfessionalQuoteCreator() {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<Partial<ProfessionalQuoteInput>>({
    companyId: undefined,
    clientId: undefined,
    date: new Date().toISOString().split('T')[0],
    validUntil: '',
    paymentMethod: '',
    internalNotes: '',
    observations: '',
    lines: [{ name: '', description: '', quantity: 1, unitPrice: 0, discount: 0, iva: 21 }],
  });

  const updateData = (newData: Partial<ProfessionalQuoteInput>) => {
    setFormData((prev) => ({ ...prev, ...newData }));
  };

  const nextStep = () => setStep((s) => s + 1);
  const prevStep = () => setStep((s) => s - 1);

  const stepTitles = ['Empresa', 'Cliente', 'Datos', 'Líneas'];

  return (
    <div className="rounded-md border border-slate-300 bg-white p-5">
      {/* Progress Steps */}
      <div className="mb-6 flex items-center gap-1 text-sm">
        {stepTitles.map((title, idx) => (
          <div key={idx} className="flex items-center">
            <div
              className={`flex items-center gap-2 px-3 py-1.5 rounded-sm ${
                step === idx + 1 ? 'bg-slate-800 text-white' : 'text-slate-500'
              }`}
            >
              <span className="font-medium">{idx + 1}</span>
              <span>{title}</span>
            </div>
            {idx < stepTitles.length - 1 && <span className="mx-1 text-slate-300">/</span>}
          </div>
        ))}
      </div>

      {step === 1 && <Step1Company onNext={nextStep} data={formData} updateData={updateData} />}
      {step === 2 && <Step2Client onNext={nextStep} onPrev={prevStep} data={formData} updateData={updateData} />}
      {step === 3 && <Step3GeneralData onNext={nextStep} onPrev={prevStep} data={formData} updateData={updateData} />}
      {step === 4 && <Step4Lines onPrev={prevStep} data={formData} updateData={updateData} />}
    </div>
  );
}
