'use client';

type ResultProps = {
  title: string;
  loading: boolean;
  children: React.ReactNode;
  className?: string;
};

export default function Result({ title, loading, children, className = '' }: ResultProps) {
  return (
    <section className={`rounded-[2rem] border border-slate-200 bg-white/95 p-6 shadow-soft ${className}`}>
      <div className="mb-4 flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
        </div>
      </div>
      <div className="min-h-[220px] rounded-3xl border border-slate-100 bg-slate-50 p-5 text-sm leading-7 text-slate-700">
        {loading ? <p className="text-slate-500">Generando resultados de IA...</p> : children}
      </div>
    </section>
  );
}
