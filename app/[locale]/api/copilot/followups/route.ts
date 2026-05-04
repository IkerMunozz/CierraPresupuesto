import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { generateAllFollowUpEmails } from '@/lib/autopilot/followUpDetector';

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const emails = await generateAllFollowUpEmails(session.user.id);

  return Response.json({
    count: emails.length,
    emails,
  });
}
