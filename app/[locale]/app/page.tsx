import SiteHeader from '@/components/SiteHeader';
import ProfessionalQuoteCreator from '@/components/ProfessionalQuoteCreator';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';

export default async function AppPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect('/login');

  return (
    <>
      <SiteHeader />
      <main className="min-h-screen bg-slate-50 px-4 py-10 sm:px-6 lg:px-10">
        <div className="mx-auto max-w-5xl">
          <header className="mb-10">
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-blue-600">
                <span className="h-2 w-2 rounded-full bg-blue-600" />
                Nuevo Presupuesto Profesional
              </div>
              <h1 className="text-3xl font-bold text-slate-900 sm:text-4xl">Crea una propuesta impecable.</h1>
              <p className="max-w-2xl text-slate-500">
                Sigue los pasos para configurar tu empresa, elegir al cliente y detallar los servicios. 
                Calculamos los impuestos automáticamente por ti.
              </p>
            </div>
          </header>

          <ProfessionalQuoteCreator />
        </div>
      </main>
    </>
  );
}
