import { PLANS, type PlanKey } from '@/lib/plans-config';

type Row = {
  label: string;
  render: (plan: PlanKey) => React.ReactNode;
  subtle?: boolean;
};

function CellCheck({ ok }: { ok: boolean }) {
  return (
    <div className="flex items-center justify-center">
      <span
        className={`inline-flex h-8 w-8 items-center justify-center rounded-2xl ${
          ok ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-50 text-slate-300'
        }`}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path strokeLinecap="round" strokeLinejoin="round" d={ok ? 'M5 13l4 4L19 7' : 'M6 18L18 6M6 6l12 12'} />
        </svg>
      </span>
    </div>
  );
}

function formatLimit(x: number) {
  if (x === -1) return 'Ilimitado';
  return String(x);
}

export default function PlanComparisonTable({
  currentPlan,
}: {
  currentPlan?: PlanKey;
}) {
  const plans: PlanKey[] = ['free', 'pro', 'business'];

  const rows: Row[] = [
    { label: 'IA (generación + análisis + mejora)', render: (p) => <CellCheck ok={PLANS[p].features.ai} /> },
    {
      label: 'Presupuestos al mes',
      render: (p) => <span className="text-sm font-semibold text-slate-900">{formatLimit(PLANS[p].features.maxQuotes)}</span>,
    },
    {
      label: 'Clientes',
      render: (p) => <span className="text-sm font-semibold text-slate-900">{formatLimit(PLANS[p].features.maxClients)}</span>,
    },
    { label: 'Plantillas profesionales', render: (p) => <CellCheck ok={PLANS[p].features.proTemplates} /> },
    { label: 'Branding personalizable', render: (p) => <CellCheck ok={PLANS[p].features.customBranding} /> },
    { label: 'Exportación a PDF', render: (p) => <CellCheck ok={PLANS[p].features.exportPdf} /> },
    { label: 'Soporte prioritario', render: (p) => <CellCheck ok={PLANS[p].features.prioritySupport} /> },
  ];

  return (
    <div className="mt-10 overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-soft">
      <div className="border-b border-slate-200 bg-slate-50 px-6 py-5">
        <p className="text-sm font-extrabold text-slate-900">Comparativa completa</p>
        <p className="mt-1 text-sm text-slate-600">Todo lo importante, sin letra pequeña.</p>
      </div>

      <div className="grid grid-cols-4">
        <div className="px-6 py-5 text-xs font-bold uppercase tracking-wider text-slate-500">Características</div>
        {plans.map((p) => {
          const isCurrent = currentPlan === p;
          const tone =
            p === 'business' ? 'purple' : p === 'pro' ? 'blue' : 'slate';

          return (
            <div
              key={p}
              className={`px-6 py-5 text-center ${
                isCurrent ? 'bg-emerald-50' : ''
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <span
                  className={`text-sm font-extrabold ${
                    tone === 'purple'
                      ? 'text-purple-700'
                      : tone === 'blue'
                        ? 'text-blue-700'
                        : 'text-slate-700'
                  }`}
                >
                  {PLANS[p].name}
                </span>
                {isCurrent && (
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-emerald-800">
                    Actual
                  </span>
                )}
              </div>
            </div>
          );
        })}

        {rows.map((row, idx) => (
          <div key={row.label} className="contents">
            <div
              className={`px-6 py-4 text-sm font-semibold text-slate-900 ${
                idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'
              }`}
            >
              {row.label}
            </div>
            {plans.map((p) => (
              <div
                key={`${row.label}-${p}`}
                className={`px-6 py-4 text-center ${
                  idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'
                }`}
              >
                {row.render(p)}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

