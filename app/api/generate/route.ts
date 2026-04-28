import { NextResponse } from 'next/server';
import { generateEnterpriseQuote, generateQuote, generateQuoteStream, type QuoteInput } from '@/lib/quoteEngine';
import { QuoteInputSchema } from '@/lib/domain/quoteSchemas';
import { rateLimit } from '@/lib/rateLimit';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { quotes } from '@/lib/db/schema';
import { getUserPlan, PLANS } from '@/lib/plans';

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    const plan = session?.user?.id ? await getUserPlan(session.user.id) : 'free';
    const hasAI = PLANS[plan].features.ai;
    const isFree = plan === 'free';

    // Rate limiting
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
      const rl = await rateLimit({ key: `generate:${ip}` });
      if (!rl.ok) return NextResponse.json({ message: 'Demasiadas solicitudes.' }, { status: 429 });
    }

    const body = await request.json();
    const validated = QuoteInputSchema.safeParse(body);
    if (!validated.success) return NextResponse.json({ message: 'Datos inválidos.' }, { status: 400 });

    const input: QuoteInput = validated.data;
    const url = new URL(request.url);
    const isStream = url.searchParams.get('stream') === 'true';

    // Caso 1: Streaming (Solo genera el presupuesto, sin análisis atómico por ahora)
    if (isStream) {
      const stream = await generateQuoteStream(input);
      return new Response(stream, { headers: { 'Content-Type': 'text/event-stream' } });
    }

    // Caso 2: Generación Completa
    let quote: string;
    let analysis = { score: 0, feedback: [] as string[], risks: [] as string[], competitiveness: 'media' as const };
    let improvedQuote = '';

    if (hasAI) {
      console.log(`🚀 Ejecutando pipeline Enterprise para plan ${plan}...`);
      const result = await generateEnterpriseQuote(input);
      quote = result.quote;
      analysis = result.analysis;
      improvedQuote = result.improvedQuote;
    } else {
      console.log(`ℹ️ Usuario en plan ${plan}, usando generación simple.`);
      quote = await generateQuote(input);
    }

    // Persistencia en DB
    if (session?.user?.id) {
      try {
        await db.insert(quotes).values({
          userId: session.user.id,
          title: `Presupuesto para ${input.clientName || 'Cliente'}`,
          clientName: input.clientName || 'Cliente',
          content: quote,
          analysis: hasAI ? analysis : null,
          improved: hasAI ? improvedQuote : null,
          score: hasAI ? analysis.score : null,
          status: 'draft',
          serviceType: input.serviceType,
          description: input.description,
          price: input.price,
          clientType: input.clientType,
          context: input.context,
        });
      } catch (e) {
        console.error('Error guardando en DB:', e);
      }
    }

    return NextResponse.json({ 
      quote, 
      analysis: hasAI ? analysis : null, 
      improvedQuote: hasAI ? improvedQuote : null, 
      isFree 
    });

  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json({ message: error.message || 'Error interno en el motor de IA' }, { status: 500 });
  }
}
