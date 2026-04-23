import { getRequestConfig } from 'next-intl/server';

// Load translations directly from ES file
const esMessages = await import('./locales/es.json').then((m) => m.default);

export default getRequestConfig(async ({ locale }) => {
  // Only Spanish supported
  if (!locale || locale !== 'es') {
    locale = 'es';
  }

  return {
    locale,
    messages: esMessages,
  };
});
