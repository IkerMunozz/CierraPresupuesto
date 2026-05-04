import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { findCriticalOpportunity } from '@/lib/autopilot/criticalOpportunity';

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const opportunity = await findCriticalOpportunity(session.user.id);

  if (!opportunity) {
    return Response.json({
      quoteId: '',
      type: 'opportunity',
      reason: 'Sin datos suficientes para analizar.',
      value: 0,
      urgency: 'low',
    });
  }

  return Response.json(opportunity);
}
