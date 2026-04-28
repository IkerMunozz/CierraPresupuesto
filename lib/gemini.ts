import { GoogleGenerativeAI } from '@google/generative-ai';

export const hasGeminiKey = () => Boolean(process.env.GEMINI_API_KEY?.trim());

const getEnvNumber = (key: string, fallback: number) => {
  const raw = process.env[key];
  if (!raw) return fallback;
  const n = Number(raw);
  return Number.isFinite(n) ? n : fallback;
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const shouldRetry = (error: any) => {
  // Retry on rate limit (429) or server errors (5xx)
  const status = error.status || error.statusCode;
  return status === 429 || (status >= 500 && status <= 599);
};

export const callGemini = async (prompt: string, systemInstruction?: string, isJson: boolean = false) => {
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
    maxOutputTokens: getEnvNumber('GEMINI_MAX_TOKENS', 4096), // Aumentado para evitar truncados en respuestas grandes
    responseMimeType: isJson ? "application/json" : "text/plain",
  };

  const maxRetries = 3;
  let lastError: any;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig,
      });
      
      const response = await result.response;
      return response.text().trim();
    } catch (error: any) {
      lastError = error;
      console.error(`Error calling Gemini (attempt ${attempt + 1}):`, error);
      
      if (attempt < maxRetries && shouldRetry(error)) {
        const delay = Math.pow(2, attempt) * 1000 + Math.random() * 1000;
        await sleep(delay);
        continue;
      }
      
      if (error.status === 429) {
        throw new Error('Cuota de Gemini API excedida. Por favor, verifica tu plan de facturación en Google AI Studio.');
      }
      
      throw error;
    }
  }
  throw lastError;
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
    maxOutputTokens: getEnvNumber('GEMINI_MAX_TOKENS', 2048),
  };

  const maxRetries = 2;
  let lastError: any;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
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
    } catch (error: any) {
      lastError = error;
      if (attempt < maxRetries && shouldRetry(error)) {
        await sleep(Math.pow(2, attempt) * 1000);
        continue;
      }
      throw error;
    }
  }
  throw lastError;
};
