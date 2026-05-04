import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { runBrainLoop, runBrainLoopBatch } from '@/lib/autopilot/brain';

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const { dryRun = false, batch = false, config = {} } = body;

  if (batch) {
    const result = await runBrainLoopBatch(session.user.id, config);
    return Response.json(result);
  }

  const result = await runBrainLoop(session.user.id, config, dryRun);
  return Response.json(result);
}

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return Response.json({
    message: 'POST to /api/copilot/brain to run the brain loop',
    options: {
      dryRun: 'Analyze without executing',
      batch: 'Run batch mode for multiple actions',
      config: 'Custom thresholds (minImpactThreshold, minConfidenceThreshold, etc.)',
    },
  });
}
