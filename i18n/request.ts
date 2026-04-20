import { notFound } from 'next/navigation';
import { getRequestConfig } from 'next-intl/server';

export default getRequestConfig(async ({ locale }) => {
  if (!locale || !['en', 'es'].includes(locale)) {
    locale = 'es';
  }

  return {
    locale,
    messages: (await import(`./locales/${locale}.json`)).default,
  };
});