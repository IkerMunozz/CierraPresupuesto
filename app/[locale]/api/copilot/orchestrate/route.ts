import { NextRequest, NextResponse } from 'next/server';
import { orchestrateFinalDecision, orchestrateBatchDecisions } from '@/lib/autopilot/finalOrchestrator';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, quoteId, proposedAction, batch, dryRun } = body;

    if (!userId) {
      return NextResponse.json(
        { error: 'userId es requerido' },
        { status: 400 }
      );
    }

    if (batch && Array.isArray(batch)) {
      const decisions = await orchestrateBatchDecisions(userId, batch, dryRun);
      return NextResponse.json({ decisions });
    }

    if (!quoteId || !proposedAction) {
      return NextResponse.json(
        { error: 'quoteId y proposedAction son requeridos' },
        { status: 400 }
      );
    }

    const decision = await orchestrateFinalDecision({
      userId,
      quoteId,
      proposedAction,
      dryRun,
    });

    return NextResponse.json({ decision });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error interno' },
      { status: 500 }
    );
  }
}
