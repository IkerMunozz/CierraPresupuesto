export const hasOpenAIKey = () => Boolean(process.env.OPENAI_API_KEY?.trim());

const getEnvNumber = (key: string, fallback: number) => {
  const raw = process.env[key];
  if (!raw) return fallback;
  const n = Number(raw);
  return Number.isFinite(n) ? n : fallback;
};

const sleep = async (ms: number) => new Promise((r) => setTimeout(r, ms));

const shouldRetry = (status: number) => status === 429 || (status >= 500 && status <= 599);

export const callOpenAI = async (prompt: string) => {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) throw new Error('OpenAI API key no disponible');

  const model = process.env.OPENAI_MODEL?.trim() || 'gpt-3.5-turbo';
  const temperature = getEnvNumber('OPENAI_TEMPERATURE', 0.7);
  const maxTokens = getEnvNumber('OPENAI_MAX_TOKENS', 650);
  const timeoutMs = getEnvNumber('OPENAI_TIMEOUT_MS', 25_000);
  const maxRetries = Math.max(0, Math.min(3, getEnvNumber('OPENAI_MAX_RETRIES', 2)));

  const body = {
    model,
    messages: [
      { role: 'system', content: 'Eres un asistente de IA que ayuda a escribir presupuestos y análisis comerciales.' },
      { role: 'user', content: prompt },
    ],
    temperature,
    max_tokens: maxTokens,
  };

  let lastError: unknown = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${key}`,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!response.ok) {
        const text = await response.text().catch(() => '');
        const err = new Error(`OpenAI error (${response.status}): ${text || response.statusText}`);
        if (attempt < maxRetries && shouldRetry(response.status)) {
          lastError = err;
          const backoffMs = Math.min(8000, 400 * 2 ** attempt + Math.floor(Math.random() * 250));
          await sleep(backoffMs);
          continue;
        }
        throw err;
      }

      const data = (await response.json()) as any;
      const message = data?.choices?.[0]?.message?.content;
      return typeof message === 'string' ? message.trim() : '';
    } catch (e) {
      lastError = e;
      const isAbort =
        typeof e === 'object' && e !== null && 'name' in e && (e as { name?: string }).name === 'AbortError';
      if (attempt < maxRetries && (isAbort || e instanceof TypeError)) {
        const backoffMs = Math.min(8000, 400 * 2 ** attempt + Math.floor(Math.random() * 250));
        await sleep(backoffMs);
        continue;
      }
      throw e;
    } finally {
      clearTimeout(t);
    }
  }

  throw lastError instanceof Error ? lastError : new Error('OpenAI error desconocido');
};

export const callOpenAIStream = async (prompt: string): Promise<ReadableStream<Uint8Array>> => {
  const key = process.env.OPENAI_API_KEY?.trim();
  
  if (!key) {
    // Modo simulado para streaming
    const encoder = new TextEncoder();
    const mockText = "Asunto: Propuesta comercial\n\nEste es un presupuesto generado en modo prueba porque no se ha detectado la clave OPENAI_API_KEY.\n\nContenido simulado:\n- Servicio profesional optimizado\n- Entrega inmediata\n- Calidad garantizada\n\nSiguiente paso: responde a este mensaje para empezar.";
    
    return new ReadableStream({
      async start(controller) {
        for (const word of mockText.split(' ')) {
          controller.enqueue(encoder.encode(word + ' '));
          await sleep(50); // Simular velocidad de escritura
        }
        controller.close();
      },
    });
  }

  const model = process.env.OPENAI_MODEL?.trim() || 'gpt-3.5-turbo';
  const temperature = getEnvNumber('OPENAI_TEMPERATURE', 0.7);
  const maxTokens = getEnvNumber('OPENAI_MAX_TOKENS', 650);
  const timeoutMs = getEnvNumber('OPENAI_TIMEOUT_MS', 25_000);
  const maxRetries = Math.max(0, Math.min(3, getEnvNumber('OPENAI_MAX_RETRIES', 2)));

  const body = {
    model,
    messages: [
      { role: 'system', content: 'Eres un asistente de IA que ayuda a escribir presupuestos y análisis comerciales.' },
      { role: 'user', content: prompt },
    ],
    temperature,
    max_tokens: maxTokens,
    stream: true,
  };

  let lastError: unknown = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${key}`,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!response.ok) {
        const text = await response.text().catch(() => '');
        const err = new Error(`OpenAI error (${response.status}): ${text || response.statusText}`);
        if (attempt < maxRetries && shouldRetry(response.status)) {
          lastError = err;
          const backoffMs = Math.min(8000, 400 * 2 ** attempt + Math.floor(Math.random() * 250));
          await sleep(backoffMs);
          continue;
        }
        throw err;
      }

      return response.body as ReadableStream<Uint8Array>;
    } catch (e) {
      lastError = e;
      const isAbort =
        typeof e === 'object' && e !== null && 'name' in e && (e as { name?: string }).name === 'AbortError';
      if (attempt < maxRetries && (isAbort || e instanceof TypeError)) {
        const backoffMs = Math.min(8000, 400 * 2 ** attempt + Math.floor(Math.random() * 250));
        await sleep(backoffMs);
        continue;
      }
      throw e;
    } finally {
      clearTimeout(t);
    }
  }

  throw lastError instanceof Error ? lastError : new Error('OpenAI error desconocido');
};

export const moderateContent = async (content: string): Promise<boolean> => {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) return true; // Si no hay key, asumir ok

  try {
    const response = await fetch('https://api.openai.com/v1/moderations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({ input: content }),
    });

    if (!response.ok) return true; // Si falla, asumir ok

    const data = await response.json();
    const result = data.results?.[0];
    return !result?.flagged;
  } catch {
    return true; // En error, asumir ok
  }
};
