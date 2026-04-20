'use client';

export type FormValues = {
  serviceType: string;
  description: string;
  price: string;
  clientType: string;
  context?: string;
  streaming?: boolean;
};

type FormProps = {
  values: FormValues;
  onChange: (values: FormValues) => void;
  onSubmit: (values: FormValues) => void;
  loading: boolean;
};

export default function Form({ values, onChange, onSubmit, loading }: FormProps) {
  const priceLooksOk = values.price.trim().length >= 2;

  return (
    <form
      className="mt-6 space-y-5"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit(values);
      }}
    >
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="space-y-2 text-sm text-slate-700">
          Tipo de servicio
          <input
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:bg-white"
            value={values.serviceType}
            onChange={(event) => onChange({ ...values, serviceType: event.target.value })}
            placeholder="Diseño web, consultoría, campaña..."
            required
          />
        </label>
        <label className="space-y-2 text-sm text-slate-700">
          Tipo de cliente
          <select
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:bg-white"
            value={values.clientType}
            onChange={(event) => onChange({ ...values, clientType: event.target.value })}
            required
          >
            <option value="">Selecciona un tipo</option>
            <option value="PyME">PyME</option>
            <option value="Start-up">Start-up</option>
            <option value="Corporativo">Corporativo</option>
            <option value="Freelance">Freelance</option>
          </select>
        </label>
      </div>

      <label className="block space-y-2 text-sm text-slate-700">
        Descripción del servicio
        <textarea
          className="min-h-[120px] w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:bg-white"
          value={values.description}
          onChange={(event) => onChange({ ...values, description: event.target.value })}
          placeholder="Describe qué incluye la entrega, resultados y valor." 
          required
        />
      </label>

      <div className="grid gap-5 sm:grid-cols-2">
        <label className="space-y-2 text-sm text-slate-700">
          Precio
          <input
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:bg-white"
            value={values.price}
            onChange={(event) => onChange({ ...values, price: event.target.value })}
            placeholder="Ej. $3.500 USD / paquete"
            required
          />
          {!priceLooksOk ? <p className="text-xs text-slate-500">Incluye moneda o unidad (ej. “1200€” o “900€/mes”).</p> : null}
        </label>
        <label className="space-y-2 text-sm text-slate-700">
          Contexto opcional
          <input
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:bg-white"
            value={values.context}
            onChange={(event) => onChange({ ...values, context: event.target.value })}
            placeholder="Objetivos, plazos, restricciones..."
          />
        </label>
      </div>

      <label className="flex items-center space-x-2 text-sm text-slate-700">
        <input
          type="checkbox"
          checked={values.streaming || false}
          onChange={(event) => onChange({ ...values, streaming: event.target.checked })}
        />
        <span>Streaming en tiempo real (experimental)</span>
      </label>

      <button
        type="submit"
        disabled={loading}
        className="inline-flex items-center justify-center rounded-3xl bg-brand-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:bg-slate-300"
      >
        {loading ? 'Generando...' : 'Generar presupuesto'}
      </button>
    </form>
  );
}
