import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prioritizeRevenue } from '@/lib/autopilot/revenuePrioritizer';

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const prioritized = await prioritizeRevenue(session.user.id);

  return Response.json({
    top3: prioritized,
    totalPotential: prioritized.reduce((sum, a) => sum + a.impact, 0),
  });
}
