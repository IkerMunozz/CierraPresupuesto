import { NextResponse } from 'next/server';
import { analyzeQuote, generateQuote, improveQuote, type QuoteInput } from '@/lib/quoteEngine';
import { QuoteInputSchema } from '@/lib/domain/quoteSchemas';
import { rateLimit } from '@/lib/rateLimit';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { quotes } from '@/lib/db/schema';
import { callOpenAIStream, moderateContent } from '@/lib/openai';
import { callGeminiStream, hasGeminiKey } from '@/lib/gemini';
import { getUserPlan, PLANS } from '@/lib/plans';

type GenerateResponse = {
  quote: string;
  analysis: {
    score: number;
    feedback: string[];
    risks: string[];
    competitiveness: 'baja' | 'media' | 'alta';
  };
  improvedQuote: string;
};

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ message: 'No autorizado.' }, { status: 401 });
    }

    // Check plan
    const plan = await getUserPlan(session.user.id);
    const hasAI = PLANS[plan].features.ai;
    const isFree = plan === 'free';

    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
      const rl = await rateLimit({ key: `generate:${ip}` });
      if (!rl.ok) {
        return NextResponse.json(
          { message: 'Demasiadas solicitudes. Inténtalo de nuevo en unos segundos.' },
          { status: 429, headers: { 'Retry-After': String(rl.retryAfterSeconds) } },
        );
      }
    }

    const body = (await request.json()) as unknown;
    const validated = QuoteInputSchema.safeParse(body);
    if (!validated.success) {
      const first = validated.error.issues[0];
      return NextResponse.json({ message: first?.message ?? 'Payload inválido.' }, { status: 400 });
    }

    const input: QuoteInput = validated.data;

    // Moderar contenido
    const contentToModerate = `${input.serviceType} ${input.description} ${input.context || ''}`;
    const isSafe = await moderateContent(contentToModerate);
    if (!isSafe) {
      return NextResponse.json({ message: 'Contenido no permitido.' }, { status: 400 });
    }

    const url = new URL(request.url);
    const isStream = url.searchParams.get('stream') === 'true';

    if (isStream) {
      // Streaming: generar solo el quote
      const prompt = `Genera un presupuesto profesional para: ${input.serviceType}, descripción: ${input.description}, precio: ${input.price}, tipo de cliente: ${input.clientType}${input.context ? `, contexto adicional: ${input.context}` : ''}`;
      
      let stream: ReadableStream<Uint8Array>;
      if (hasGeminiKey()) {
        stream = await callGeminiStream(prompt, 'Eres un experto en ventas B2B/B2C para autónomos.');
      } else {
        stream = await callOpenAIStream(prompt);
      }

      return new Response(stream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
    } else {
      // Normal: generar completo
      const quote = await generateQuote(input);
      
      let analysis = {
        score: 0,
        feedback: [],
        risks: [],
        competitiveness: 'media' as const,
      };
      let improvedQuote = '';

      if (hasAI) {
        analysis = await analyzeQuote(quote);
        improvedQuote = await improveQuote(quote, analysis);
      }

      // Save to DB
      await db.insert(quotes).values({
        userId: session.user.id,
        serviceType: input.serviceType,
        description: input.description,
        price: input.price,
        clientType: input.clientType,
        context: input.context,
        quote,
        analysis,
        improvedQuote,
      });

      const response = { quote, analysis, improvedQuote, isFree };
      return NextResponse.json(response, { status: 200 });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudo generar el presupuesto.';
    return NextResponse.json({ message }, { status: 500 });
  }
}
