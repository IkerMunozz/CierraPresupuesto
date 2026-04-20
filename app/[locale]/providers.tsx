'use client';

import { SessionProvider } from 'next-auth/react';
import { NextIntlClientProvider } from 'next-intl';
import Onboarding from '@/components/Onboarding';

interface ClientProvidersProps {
  children: React.ReactNode;
  messages: any;
  locale: string;
}

export default function ClientProviders({ children, messages, locale }: ClientProvidersProps) {
  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <SessionProvider>
        {children}
        <Onboarding />
      </SessionProvider>
    </NextIntlClientProvider>
  );
}