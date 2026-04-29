import { getMessages } from 'next-intl/server';
import { notFound } from 'next/navigation';
import ClientProviders from './providers';
import '../globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'CierraPresupuesto',
  description: 'Genera presupuestos de ventas optimizados con IA',
  icons: {
    icon: '/favicon.ico',       // Estándar .ico
    shortcut: '/favicon.ico',   // Para navegadores
    apple: '/apple-touch-icon.png', // Apple touch icon (opcional)
  },
};

export default async function LocaleLayout({
  children,
  params: { locale }
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  if (!['en', 'es'].includes(locale)) notFound();

  const messages = await getMessages();

  return (
    <html lang={locale}>
      <body>
        <ClientProviders messages={messages} locale={locale}>
          {children}
        </ClientProviders>
      </body>
    </html>
  );
}