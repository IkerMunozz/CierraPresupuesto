import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { sendFollowUpEmail } from '@/lib/autopilot/followUpDetector';

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const { quoteId } = body;

  if (!quoteId) {
    return Response.json({ error: 'quoteId required' }, { status: 400 });
  }

  const result = await sendFollowUpEmail(session.user.id, quoteId);

  if (!result.success) {
    return Response.json({ error: result.error }, { status: 400 });
  }

  return Response.json(result);
}
