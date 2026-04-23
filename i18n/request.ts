import { getRequestConfig } from 'next-intl/server';

// Load translations directly from ES file
const esMessages = await import('./locales/es.json').then((m) => m.default);

function nestMessages(input: Record<string, unknown>) {
  const output: Record<string, any> = {};

  for (const [key, value] of Object.entries(input)) {
    if (!key.includes('.')) {
      output[key] = value;
      continue;
    }

    const parts = key.split('.');
    let cursor: Record<string, any> = output;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i]!;
      const isLeaf = i === parts.length - 1;

      if (isLeaf) {
        cursor[part] = value;
      } else {
        const next = cursor[part];
        if (!next || typeof next !== 'object' || Array.isArray(next)) {
          cursor[part] = {};
        }
        cursor = cursor[part];
      }
    }
  }

  return output;
}

export default getRequestConfig(async ({ locale }) => {
  // Only Spanish supported
  if (!locale || locale !== 'es') {
    locale = 'es';
  }

  return {
    locale,
    messages: nestMessages(esMessages as Record<string, unknown>),
  };
});
