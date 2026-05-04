import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { evaluatePoliciesWrapper, checkAllPolicies, type PolicyAction } from '@/lib/autopilot/policyEngine';

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const { quoteId, action } = body;

  if (quoteId && action) {
    const check = await evaluatePoliciesWrapper(session.user.id, quoteId, action as PolicyAction);
    return Response.json({ quoteId, action, check });
  }

  const { pendingActions } = body;
  if (pendingActions && Array.isArray(pendingActions)) {
    const results = await checkAllPolicies(
      session.user.id,
      pendingActions.map((pa: { quoteId: string; action: string }) => ({
        quoteId: pa.quoteId,
        action: pa.action as PolicyAction,
      }))
    );
    return Response.json({ results });
  }

  return Response.json(
    { error: 'Provide { quoteId, action } or { pendingActions: [{ quoteId, action }] }' },
    { status: 400 }
  );
}
