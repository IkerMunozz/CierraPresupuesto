import Link from 'next/link';

export default function SiteFooter() {
  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-10">
        <div className="grid gap-10 md:grid-cols-4">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 font-semibold text-slate-900">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-brand-600 text-white">CP</span>
              <span>CierraPresupuesto</span>
            </div>
            <p className="text-sm leading-6 text-slate-600">
              Presupuestos con IA para autónomos: genera, analiza y mejora propuestas para cerrar más ventas.
            </p>
            <p className="text-xs text-slate-500">© {new Date().getFullYear()} CierraPresupuesto</p>
          </div>

          <div className="space-y-3">
            <p className="text-sm font-semibold text-slate-900">Producto</p>
            <ul className="space-y-2 text-sm text-slate-600">
              <li>
                <a className="transition hover:text-slate-900" href="/#funcionalidades">
                  Funcionalidades
                </a>
              </li>
              <li>
                <a className="transition hover:text-slate-900" href="/#precios">
                  Precios
                </a>
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
                <a className="transition hover:text-slate-900" href="/#guias">
                  Guías por temas
                </a>
              </li>
              <li>
                <a className="transition hover:text-slate-900" href="/#faq">
                  Preguntas frecuentes
                </a>
              </li>
              <li>
                <a className="transition hover:text-slate-900" href="/#contacto">
                  Contacto
                </a>
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

