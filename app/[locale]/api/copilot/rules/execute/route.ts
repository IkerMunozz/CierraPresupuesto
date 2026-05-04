import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { evaluateAllRules } from '@/lib/autopilot/triggerRules';
import { executeAllTriggers } from '@/lib/autopilot/actionExecutor';

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const { execute = true } = body;

  const triggers = await evaluateAllRules(session.user.id);

  if (!execute) {
    return Response.json({
      total: triggers.length,
      triggers,
    });
  }

  const results = await executeAllTriggers(session.user.id, triggers);

  return Response.json({
    total: triggers.length,
    executed: results.filter(r => r.success).length,
    failed: results.filter(r => !r.success).length,
    triggers,
    results,
  });
}
