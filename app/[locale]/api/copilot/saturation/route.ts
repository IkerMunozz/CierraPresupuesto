import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { checkSaturationForClient, checkSaturationForQuote, getSaturationReport } from '@/lib/autopilot/communicationSaturation';

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const mode = searchParams.get('mode');

  if (mode === 'report') {
    const report = await getSaturationReport(session.user.id);
    return Response.json(report);
  }

  const quoteId = searchParams.get('quoteId');
  if (quoteId) {
    const check = await checkSaturationForQuote(session.user.id, quoteId);
    return Response.json({ quoteId, check });
  }

  return Response.json({
    message: 'Use POST to check saturation, or GET?mode=report for full report',
  });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const { clientEmail, quoteId } = body;

  if (clientEmail) {
    const check = await checkSaturationForClient(session.user.id, clientEmail);
    return Response.json({ clientEmail, check });
  }

  if (quoteId) {
    const check = await checkSaturationForQuote(session.user.id, quoteId);
    return Response.json({ quoteId, check });
  }

  return Response.json(
    { error: 'Provide { clientEmail } or { quoteId }' },
    { status: 400 }
  );
}
