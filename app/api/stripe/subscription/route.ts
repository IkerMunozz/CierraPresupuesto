import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getUserSubscription } from '@/lib/plans';

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  try {
    const subscription = await getUserSubscription(session.user.id);
    return Response.json({
      plan: subscription.plan,
      status: subscription.status,
    });
  } catch (error) {
    console.error('Error fetching subscription:', error);
    return new Response(JSON.stringify({ error: 'Internal Server Error', message: error instanceof Error ? error.message : 'Unknown error' }), { status: 500 });
  }
}
