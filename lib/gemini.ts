import { GoogleGenerativeAI } from '@google/generative-ai';

export const hasGeminiKey = () => Boolean(process.env.GEMINI_API_KEY?.trim());

const getEnvNumber = (key: string, fallback: number) => {
  const raw = process.env[key];
  if (!raw) return fallback;
  const n = Number(raw);
  return Number.isFinite(n) ? n : fallback;
};

export const callGemini = async (prompt: string, systemInstruction?: string) => {
  const key = process.env.GEMINI_API_KEY?.trim();
  if (!key) throw new Error('Gemini API key no disponible');

  const genAI = new GoogleGenerativeAI(key);
  const modelName = process.env.GEMINI_MODEL?.trim() || 'gemini-2.5-flash';
  
  const model = genAI.getGenerativeModel({ 
    model: modelName,
    systemInstruction: systemInstruction || 'Eres un experto en ventas y análisis de presupuestos.',
  });

  const generationConfig = {
    temperature: getEnvNumber('GEMINI_TEMPERATURE', 0.7),
    maxOutputTokens: getEnvNumber('GEMINI_MAX_TOKENS', 2000),
  };

  try {
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig,
    });
    
    const response = await result.response;
    return response.text().trim();
  } catch (error: any) {
    console.error('Error calling Gemini:', error);
    
    // Si es error de cuota, devolver un mensaje más específico
    if (error.status === 429) {
      throw new Error('Cuota de Gemini API excedida. Por favor, verifica tu plan de facturación en Google AI Studio.');
    }
    
    throw error;
  }
};

export const callGeminiStream = async (prompt: string, systemInstruction?: string): Promise<ReadableStream<Uint8Array>> => {
  const key = process.env.GEMINI_API_KEY?.trim();
  if (!key) throw new Error('Gemini API key no disponible');

  const genAI = new GoogleGenerativeAI(key);
  const modelName = process.env.GEMINI_MODEL?.trim() || 'gemini-2.5-flash';
  
  const model = genAI.getGenerativeModel({ 
    model: modelName,
    systemInstruction: systemInstruction || 'Eres un experto en ventas y análisis de presupuestos.',
  });

  const generationConfig = {
    temperature: getEnvNumber('GEMINI_TEMPERATURE', 0.7),
    maxOutputTokens: getEnvNumber('GEMINI_MAX_TOKENS', 2000),
  };

  const result = await model.generateContentStream({
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig,
  });

  const encoder = new TextEncoder();
  return new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of result.stream) {
          const chunkText = chunk.text();
          // SSE format compatible with QuoteApp.tsx (OpenAI-like)
          const sseData = `data: ${JSON.stringify({
            choices: [{ delta: { content: chunkText } }]
          })}\n\n`;
          controller.enqueue(encoder.encode(sseData));
        }
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        controller.close();
      } catch (error) {
        controller.error(error);
      }
    },
  });
};
