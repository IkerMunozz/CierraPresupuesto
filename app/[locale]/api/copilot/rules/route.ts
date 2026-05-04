import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { evaluateAllRules, getTriggersByType } from '@/lib/autopilot/triggerRules';

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const triggers = await evaluateAllRules(session.user.id);
  const grouped = getTriggersByType(triggers);

  return Response.json({
    total: triggers.length,
    grouped: {
      FOLLOW_UP: grouped.FOLLOW_UP.length,
      PRIORITIZE: grouped.PRIORITIZE.length,
      ALERT_USER: grouped.ALERT_USER.length,
      INSIGHT_ACTION: grouped.INSIGHT_ACTION.length,
    },
    triggers,
  });
}
