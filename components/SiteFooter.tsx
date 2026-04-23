import Link from 'next/link';
import Image from 'next/image';

export default function SiteFooter() {
  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-10">
        <div className="grid gap-10 md:grid-cols-4">
          <div className="space-y-3">
            <Link href="/" className="inline-flex items-center">
              <div className="relative h-14 w-56">
                <Image 
                  src="/logo.png" 
                  alt="CierraPresupuesto" 
                  fill 
                  className="object-contain object-left"
                />
              </div>
            </Link>
            <p className="text-sm leading-6 text-slate-600">
              Presupuestos con IA para autónomos: genera, analiza y mejora propuestas para cerrar más ventas.
            </p>
            <p className="text-xs text-slate-500">© {new Date().getFullYear()} CierraPresupuesto</p>
          </div>

          <div className="space-y-3">
            <p className="text-sm font-semibold text-slate-900">Producto</p>
            <ul className="space-y-2 text-sm text-slate-600">
              <li>
                <Link className="transition hover:text-slate-900" href="/#funcionalidades">
                  Funcionalidades
                </Link>
              </li>
              <li>
                <Link className="transition hover:text-slate-900" href="/#pricing">
                  Precios
                </Link>
              </li>
              <li>
                <Link className="transition hover:text-slate-900" href="/app">
                  Abrir app
                </Link>
              </li>
            </ul>
          </div>

          <div className="space-y-3">
            <p className="text-sm font-semibold text-slate-900">Recursos</p>
            <ul className="space-y-2 text-sm text-slate-600">
              <li>
                <Link className="transition hover:text-slate-900" href="/#guias">
                  Guías por temas
                </Link>
              </li>
              <li>
                <Link className="transition hover:text-slate-900" href="/#faq">
                  Preguntas frecuentes
                </Link>
              </li>
              <li>
                <Link className="transition hover:text-slate-900" href="/#contacto">
                  Contacto
                </Link>
              </li>
            </ul>
          </div>

          <div className="space-y-3" id="contacto">
            <p className="text-sm font-semibold text-slate-900">Legal y contacto</p>
            <ul className="space-y-2 text-sm text-slate-600">
              <li className="text-slate-600">Soporte: soporte@cierrapresupuesto.com</li>
              <li className="text-slate-600">Privacidad · Términos</li>
              <li className="text-slate-600">Hecho en España</li>
            </ul>
          </div>
        </div>
      </div>
    </footer>
  );
}

