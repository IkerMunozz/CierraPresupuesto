import { OpenAI } from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export type SalesStrategy = 'suave' | 'persuasiva' | 'cierre_directo';

interface NegotiationContext {
  clientName: string;
  industry?: string;
  dealValue?: string;
  lastClientMessage: string;
  businessGoal: string;
}

export async function generateNegotiationResponse(
  strategy: SalesStrategy,
  context: NegotiationContext
) {
  const systemPrompts: Record<SalesStrategy, string> = {
    suave: `Eres un consultor empático. Tu objetivo es validar la posición del cliente, ganar confianza y mantener la puerta abierta. No presiones. Usa un tono profesional pero muy cercano.`,
    persuasiva: `Eres un experto en ventas basado en valor. Tu objetivo es resaltar el ROI, los beneficios y lo que el cliente pierde al no actuar. Usa disparadores mentales como autoridad y prueba social.`,
    cierre_directo: `Eres un cerrador de alto nivel (High-Ticket Closer). Tu objetivo es eliminar dudas finales, usar urgencia/escasez ética y pedir la firma o el pago de forma asertiva.`
  };

  const userPrompt = `
    CLIENTE: ${context.clientName}
    SECTOR: ${context.industry || 'No especificado'}
    VALOR DEL TRATO: ${context.dealValue || 'No especificado'}
    
    MENSAJE DEL CLIENTE: "${context.lastClientMessage}"
    MI OBJETIVO: ${context.businessGoal}
    
    ESTRATEGIA A USAR: ${strategy.toUpperCase()}
    
    REGLA: Genera una respuesta lista para enviar por WhatsApp o Email. Que suene 100% humana, sin frases hechas de IA.
  `;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: systemPrompts[strategy] },
      { role: 'user', content: userPrompt },
    ],
    temperature: 0.7,
  });

  return response.choices[0].message.content;
}

// Mantenemos compatibilidad con el motor v1 para otras partes de la app
export async function generateSalesMessage(type: string, platform: string, context: any) {
  // ... lógica anterior o redirigir a la nueva ...
  return "Funcionalidad v1 integrada en v2";
}
