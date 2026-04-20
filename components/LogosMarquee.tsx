'use client';

const LOGOS = [
  'Estudio Aurora',
  'Grupo Atlas',
  'Clínica Norte',
  'Línea Creativa',
  'Consultoría Sigma',
  'Taller Central',
  'DataWorks',
  'Pixel & Co.',
  'Innova Legal',
  'Café Mercado',
];

function Logo({ name }: { name: string }) {
  return (
    <div className="mx-3 inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm">
      {name}
    </div>
  );
}

export default function LogosMarquee() {
  // Duplicate list to create seamless scrolling.
  const items = [...LOGOS, ...LOGOS];

  return (
    <div className="relative overflow-hidden rounded-[2rem] border border-slate-200 bg-white/70 py-5 shadow-soft backdrop-blur">
      <div className="pointer-events-none absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-white via-white/80 to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-white via-white/80 to-transparent" />

      <div className="flex animate-marquee items-center whitespace-nowrap">
        {items.map((name, idx) => (
          <Logo key={`${name}-${idx}`} name={name} />
        ))}
      </div>
    </div>
  );
}

