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
    <div className="mx-8 flex items-center justify-center opacity-40 grayscale transition-opacity hover:opacity-70">
      <span className="text-sm font-bold tracking-wide text-slate-700">{name}</span>
    </div>
  );
}

export default function LogosMarquee() {
  const items = [...LOGOS, ...LOGOS];

  return (
    <div className="relative overflow-hidden py-6">
      <div className="pointer-events-none absolute inset-y-0 left-0 w-32 bg-gradient-to-r from-white to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-32 bg-gradient-to-l from-white to-transparent" />

      <div className="flex animate-marquee items-center whitespace-nowrap">
        {items.map((name, idx) => (
          <Logo key={`${name}-${idx}`} name={name} />
        ))}
      </div>
    </div>
  );
}
