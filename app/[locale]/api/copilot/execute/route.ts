import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { executeAutonomousCycle } from '@/lib/autopilot/actionExecutor';

export async function POST() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { decision, execution } = await executeAutonomousCycle(session.user.id);

    return Response.json({
      decision,
      execution,
    });
  } catch (err) {
    return Response.json(
      { error: (err as Error).message },
      { status: 500 }
    );
  }
}
