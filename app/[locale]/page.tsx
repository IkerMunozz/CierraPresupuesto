import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import MarketingSections from '@/components/MarketingSections';
import { redirect } from 'next/navigation';

export default async function HomePage() {
  const session = await getServerSession(authOptions);

  if (session?.user) {
    redirect('/app/dashboard');
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <SiteHeader />
      <main>
        <MarketingSections />
      </main>
      <SiteFooter />
    </div>
  );
}
