// app/[locale]/crm/page.tsx - CRM Dashboard
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { getPipelineSummary } from '@/lib/services/pipelineService';
import { getPipelineStats } from '@/lib/services/pipelineService';
import { getClientTimeline } from '@/lib/services/clientTimelineService';
import PipelineKanban from '@/components/crm/PipelineKanban';
import PipelineStats from '@/components/crm/PipelineStats';
import SiteHeader from '@/components/SiteHeader';

export default async function CRMPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect('/login');

  const summary = await getPipelineSummary(session.user.id);

  return (
    <>
      <SiteHeader />
      <main className="min-h-screen bg-slate-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-slate-900">CRM Inteligente</h1>
            <p className="text-slate-500 mt-1">Gestiona tus clientes con IA y automatización</p>
          </div>

          {/* Stats Overview */}
          <PipelineStats summary={summary} />

          {/* Kanban Pipeline */}
          <div className="mt-8">
            <h2 className="text-xl font-bold text-slate-900 mb-4">Pipeline de Ventas</h2>
            <PipelineKanban userId={session.user.id} />
          </div>
        </div>
      </main>
    </>
  );
}
