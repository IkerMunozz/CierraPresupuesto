import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { checkMemoryBeforeAction, getMemorySummary } from '@/lib/autopilot/actionMemory';

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const mode = searchParams.get('mode');

  if (mode === 'summary') {
    const summary = await getMemorySummary(session.user.id);
    return Response.json(summary);
  }

  return Response.json({
    message: 'Use POST to check memory before actions, or GET?mode=summary for history',
  });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const { pendingActions } = body;

  if (!pendingActions || !Array.isArray(pendingActions)) {
    return Response.json(
      { error: 'pendingActions array required: [{ quoteId, action }]' },
      { status: 400 }
    );
  }

  const check = await checkMemoryBeforeAction(session.user.id, pendingActions);

  return Response.json(check);
}
