import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { makeAutonomousDecision } from '@/lib/autopilot/autonomousDecision';

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const decision = await makeAutonomousDecision(session.user.id);

  return Response.json(decision);
}
