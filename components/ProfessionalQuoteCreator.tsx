'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  CompanyInput, 
  ClientInput, 
  ConceptInput, 
  QuoteLineInput, 
  ProfessionalQuoteInput 
} from '@/lib/domain/professionalQuoteSchemas';

interface StepProps {
  onNext: () => void;
  onPrev: () => void;
  data: any;
  updateData: (newData: any) => void;
}

// --- Componentes de Apoyo ---

function Modal({ isOpen, onClose, title, children }: { isOpen: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-slate-900">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">✕</button>
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
  const [newCompany, setNewCompany] = useState<CompanyInput>({ name: '', phone: '', email: '', address: '', footerInfo: '' });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/companies')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setCompanies(data);
        } else {
          console.error('Error fetching companies:', data);
        }
        setLoading(false);
      })
      .catch(error => {
        console.error('Error fetching companies:', error);
        setLoading(false);
      });
  }, []);

  const handleAddCompany = async (e: React.FormEvent) => {
    e.preventDefault();
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
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900">Paso 1: Emisor del presupuesto</h2>
        <p className="text-sm text-slate-500">Elige la empresa que emite este presupuesto o añade una nueva.</p>
      </div>

      {loading ? (
        <div className="h-32 animate-pulse rounded-2xl bg-slate-100" />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {companies.map((c) => (
            <button
              key={c.id}
              onClick={() => updateData({ companyId: c.id })}
              className={`flex flex-col items-start rounded-2xl border-2 p-4 transition ${
                data.companyId === c.id ? 'border-blue-600 bg-blue-50/50' : 'border-slate-100 bg-white hover:border-slate-200'
              }`}
            >
              <span className="font-bold text-slate-900">{c.name}</span>
              <span className="text-xs text-slate-500">{c.email || 'Sin email'}</span>
            </button>
          ))}
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 p-4 text-slate-500 hover:border-slate-300 hover:text-slate-600 transition"
          >
            <span className="text-2xl">+</span>
            <span className="text-sm font-medium">Añadir empresa</span>
          </button>
        </div>
      )}

      <div className="flex justify-end pt-4">
        <button
          disabled={!data.companyId}
          onClick={onNext}
          className="rounded-xl bg-slate-900 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50"
        >
          Siguiente
        </button>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Nueva Empresa">
        <form onSubmit={handleAddCompany} className="space-y-4">
          <input
            placeholder="Nombre de la empresa *"
            required
            className="w-full rounded-xl border border-slate-200 p-2.5 text-sm"
            value={newCompany.name}
            onChange={e => setNewCompany({ ...newCompany, name: e.target.value })}
          />
          <input
            placeholder="Teléfono"
            className="w-full rounded-xl border border-slate-200 p-2.5 text-sm"
            value={newCompany.phone}
            onChange={e => setNewCompany({ ...newCompany, phone: e.target.value })}
          />
          <input
            placeholder="Email"
            type="email"
            className="w-full rounded-xl border border-slate-200 p-2.5 text-sm"
            value={newCompany.email}
            onChange={e => setNewCompany({ ...newCompany, email: e.target.value })}
          />
          <textarea
            placeholder="Dirección"
            className="w-full rounded-xl border border-slate-200 p-2.5 text-sm"
            value={newCompany.address}
            onChange={e => setNewCompany({ ...newCompany, address: e.target.value })}
          />
          <textarea
            placeholder="Información en el pie (Datos legales, etc.)"
            className="w-full rounded-xl border border-slate-200 p-2.5 text-sm"
            value={newCompany.footerInfo}
            onChange={e => setNewCompany({ ...newCompany, footerInfo: e.target.value })}
          />
          <button className="w-full rounded-xl bg-blue-600 py-2.5 text-sm font-semibold text-white hover:bg-blue-700">
            Guardar Empresa
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
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setClients(data);
        } else {
          console.error('Error fetching clients:', data);
        }
        setLoading(false);
      })
      .catch(error => {
        console.error('Error fetching clients:', error);
        setLoading(false);
      });
  }, []);

  const handleAddClient = async (e: React.FormEvent) => {
    e.preventDefault();
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
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900">Paso 2: Cliente</h2>
        <p className="text-sm text-slate-500">¿A quién va dirigido este presupuesto?</p>
      </div>

      {loading ? (
        <div className="h-32 animate-pulse rounded-2xl bg-slate-100" />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {clients.map((c) => (
            <button
              key={c.id}
              onClick={() => updateData({ clientId: c.id })}
              className={`flex flex-col items-start rounded-2xl border-2 p-4 transition ${
                data.clientId === c.id ? 'border-blue-600 bg-blue-50/50' : 'border-slate-100 bg-white hover:border-slate-200'
              }`}
            >
              <span className="font-bold text-slate-900">{c.name}</span>
              <span className="text-xs text-slate-500">{c.email || 'Sin email'}</span>
            </button>
          ))}
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 p-4 text-slate-500 hover:border-slate-300 hover:text-slate-600 transition"
          >
            <span className="text-2xl">+</span>
            <span className="text-sm font-medium">Nuevo cliente</span>
          </button>
        </div>
      )}

      <div className="flex justify-between pt-4">
        <button onClick={onPrev} className="rounded-xl border border-slate-200 px-6 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50">
          Anterior
        </button>
        <button
          disabled={!data.clientId}
          onClick={onNext}
          className="rounded-xl bg-slate-900 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50"
        >
          Siguiente
        </button>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Nuevo Cliente">
        <form onSubmit={handleAddClient} className="space-y-4">
          <input
            placeholder="Nombre del cliente/empresa *"
            required
            className="w-full rounded-xl border border-slate-200 p-2.5 text-sm"
            value={newClient.name}
            onChange={e => setNewClient({ ...newClient, name: e.target.value })}
          />
          <input
            placeholder="CIF / NIF"
            className="w-full rounded-xl border border-slate-200 p-2.5 text-sm"
            value={newClient.taxId}
            onChange={e => setNewClient({ ...newClient, taxId: e.target.value })}
          />
          <input
            placeholder="Email"
            type="email"
            className="w-full rounded-xl border border-slate-200 p-2.5 text-sm"
            value={newClient.email}
            onChange={e => setNewClient({ ...newClient, email: e.target.value })}
          />
          <input
            placeholder="Teléfono"
            className="w-full rounded-xl border border-slate-200 p-2.5 text-sm"
            value={newClient.phone}
            onChange={e => setNewClient({ ...newClient, phone: e.target.value })}
          />
          <textarea
            placeholder="Dirección"
            className="w-full rounded-xl border border-slate-200 p-2.5 text-sm"
            value={newClient.address}
            onChange={e => setNewClient({ ...newClient, address: e.target.value })}
          />
          <button className="w-full rounded-xl bg-blue-600 py-2.5 text-sm font-semibold text-white hover:bg-blue-700">
            Guardar Cliente
          </button>
        </form>
      </Modal>
    </div>
  );
}

function Step3GeneralData({ onNext, onPrev, data, updateData }: StepProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900">Paso 3: Datos generales</h2>
        <p className="text-sm text-slate-500">Información básica del documento.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Fecha *</label>
          <input
            type="date"
            required
            className="w-full rounded-xl border border-slate-200 p-3 text-sm focus:border-blue-500 outline-none transition"
            value={data.date}
            onChange={e => updateData({ date: e.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Válido hasta</label>
          <input
            type="date"
            className="w-full rounded-xl border border-slate-200 p-3 text-sm focus:border-blue-500 outline-none transition"
            value={data.validUntil || ''}
            onChange={e => updateData({ validUntil: e.target.value })}
          />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Forma de pago</label>
          <select
            className="w-full rounded-xl border border-slate-200 p-3 text-sm focus:border-blue-500 outline-none transition bg-white"
            value={data.paymentMethod || ''}
            onChange={e => updateData({ paymentMethod: e.target.value })}
          >
            <option value="">Selecciona forma de pago...</option>
            <option value="Transferencia Bancaria">Transferencia Bancaria</option>
            <option value="Tarjeta de Crédito/Débito">Tarjeta de Crédito/Débito</option>
            <option value="PayPal">PayPal</option>
            <option value="Efectivo">Efectivo</option>
            <option value="Giro Bancario">Giro Bancario</option>
            <option value="A convenir">A convenir</option>
          </select>
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Observaciones (para el cliente)</label>
          <textarea
            placeholder="Detalles sobre el servicio, plazos, etc."
            rows={3}
            className="w-full rounded-xl border border-slate-200 p-3 text-sm focus:border-blue-500 outline-none transition"
            value={data.observations || ''}
            onChange={e => updateData({ observations: e.target.value })}
          />
        </div>
      </div>

      <div className="flex justify-between pt-4">
        <button onClick={onPrev} className="rounded-xl border border-slate-200 px-6 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50">
          Anterior
        </button>
        <button
          onClick={onNext}
          className="rounded-xl bg-slate-900 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          Siguiente
        </button>
      </div>
    </div>
  );
}

function Step4Lines({ onPrev, data, updateData }: Omit<StepProps, 'onNext'>) {
  const router = useRouter();
  const [lines, setLines] = useState<QuoteLineInput[]>(data.lines || [
    { name: '', description: '', quantity: 1, unitPrice: 0, discount: 0, iva: 21 }
  ]);
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
    try {
      const res = await fetch('/api/quotes/professional', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fullData),
      });
      if (res.ok) {
        const quote = await res.json();
        router.push(`/app/quotes/${quote.id}`);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Paso 4: Líneas del presupuesto</h2>
          <p className="text-sm text-slate-500">Detalla los servicios y precios.</p>
        </div>
        <button 
          onClick={addLine}
          className="rounded-xl bg-blue-50 px-4 py-2 text-sm font-bold text-blue-600 hover:bg-blue-100 transition"
        >
          + Añadir línea
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-100 text-slate-400">
              <th className="pb-3 pr-4 font-bold uppercase tracking-wider">Concepto</th>
              <th className="pb-3 pr-4 font-bold uppercase tracking-wider w-20">Cant.</th>
              <th className="pb-3 pr-4 font-bold uppercase tracking-wider w-32">P. Unit.</th>
              <th className="pb-3 pr-4 font-bold uppercase tracking-wider w-24">IVA %</th>
              <th className="pb-3 font-bold uppercase tracking-wider text-right">Total</th>
              <th className="pb-3 pl-4"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {lines.map((line, idx) => (
              <tr key={idx} className="group">
                <td className="py-4 pr-4">
                  <input
                    placeholder="Nombre del servicio"
                    className="w-full font-medium text-slate-900 outline-none"
                    value={line.name}
                    onChange={e => updateLine(idx, 'name', e.target.value)}
                  />
                  <textarea
                    placeholder="Descripción (opcional)"
                    className="w-full mt-1 text-slate-500 outline-none resize-none"
                    rows={1}
                    value={line.description || ''}
                    onChange={e => updateLine(idx, 'description', e.target.value)}
                  />
                </td>
                <td className="py-4 pr-4">
                  <input
                    type="number"
                    className="w-full rounded-lg border border-slate-100 p-1.5"
                    value={line.quantity}
                    onChange={e => updateLine(idx, 'quantity', parseFloat(e.target.value) || 0)}
                  />
                </td>
                <td className="py-4 pr-4">
                  <input
                    type="number"
                    className="w-full rounded-lg border border-slate-100 p-1.5"
                    value={line.unitPrice}
                    onChange={e => updateLine(idx, 'unitPrice', parseFloat(e.target.value) || 0)}
                  />
                </td>
                <td className="py-4 pr-4">
                  <select
                    className="w-full rounded-lg border border-slate-100 p-1.5 bg-white"
                    value={line.iva}
                    onChange={e => updateLine(idx, 'iva', parseInt(e.target.value))}
                  >
                    <option value={21}>21%</option>
                    <option value={10}>10%</option>
                    <option value={4}>4%</option>
                    <option value={0}>0%</option>
                  </select>
                </td>
                <td className="py-4 text-right font-bold text-slate-900">
                  {((line.quantity * line.unitPrice) * (1 + line.iva / 100)).toLocaleString('es-ES', { minimumFractionDigits: 2 })} €
                </td>
                <td className="py-4 pl-4 text-right">
                  <button onClick={() => removeLine(idx)} className="text-slate-300 hover:text-red-500 transition opacity-0 group-hover:opacity-100">
                    ✕
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col items-end gap-2 pt-6 border-t border-slate-100">
        <div className="flex w-64 justify-between text-sm text-slate-500">
          <span>Subtotal neto</span>
          <span>{calculateSubtotal().toLocaleString('es-ES', { minimumFractionDigits: 2 })} €</span>
        </div>
        <div className="flex w-64 justify-between text-lg font-bold text-slate-900">
          <span>TOTAL (INC. IVA)</span>
          <span>{calculateTotal().toLocaleString('es-ES', { minimumFractionDigits: 2 })} €</span>
        </div>
      </div>

      <div className="flex justify-between pt-8">
        <button onClick={onPrev} className="rounded-xl border border-slate-200 px-6 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50">
          Anterior
        </button>
        <div className="flex gap-3">
          <button
            disabled={isSaving}
            onClick={handleCreate}
            className="rounded-xl bg-blue-600 px-8 py-2.5 text-sm font-bold text-white shadow-lg shadow-blue-200 transition hover:bg-blue-700 disabled:opacity-50"
          >
            {isSaving ? 'Guardando...' : 'Crear presupuesto'}
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
    setFormData(prev => ({ ...prev, ...newData }));
  };

  const nextStep = () => setStep(s => s + 1);
  const prevStep = () => setStep(s => s - 1);

  return (
    <div className="rounded-[2.5rem] border border-slate-200 bg-white p-6 shadow-xl sm:p-10">
      {/* Progress Bar */}
      <div className="mb-10 flex gap-2">
        {[1, 2, 3, 4].map((s) => (
          <div 
            key={s} 
            className={`h-1.5 flex-1 rounded-full transition-colors ${step >= s ? 'bg-blue-600' : 'bg-slate-100'}`} 
          />
        ))}
      </div>

      {step === 1 && <Step1Company onNext={nextStep} data={formData} updateData={updateData} />}
      {step === 2 && <Step2Client onNext={nextStep} onPrev={prevStep} data={formData} updateData={updateData} />}
      {step === 3 && <Step3GeneralData onNext={nextStep} onPrev={prevStep} data={formData} updateData={updateData} />}
      {step === 4 && <Step4Lines onPrev={prevStep} data={formData} updateData={updateData} />}
    </div>
  );
}
