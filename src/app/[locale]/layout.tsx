import type { Metadata } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import { notFound } from 'next/navigation';
import { AppProviders } from '@/components/providers/AppProviders';
import { OfflineBanner } from '@/components/ui/OfflineBanner';
// Exact CSS loading order: 1. Tokens -> 2. Bootstrap -> 3. Tailwind -> 4. Globals
import '@/styles/tokens.css';
import '@/styles/bootstrap.scss';
import '@/styles/tailwind.css';
import '@/styles/globals.css';

export const metadata: Metadata = {
  title: 'WiseFinance — Kelola Keuangan Pribadi dengan Saving, Living, Playing',
  description: 'Aplikasi pelacak keuangan pribadi berbasis Next.js, Prisma, dan AI Agent Wise.',
  manifest: '/manifest.webmanifest',
};

const locales = ['id', 'en'];

export default async function LocaleLayout({
  children,
  params: { locale },
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  if (!locales.includes(locale)) {
    notFound();
  }

  let messages;
  try {
    messages = (await import(`@/messages/${locale}.json`)).default;
  } catch (error) {
    notFound();
  }

  return (
    <html lang={locale} className="tw-h-full">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,100..1000;1,9..40,100..1000&family=Manrope:wght@200..800&family=JetBrains+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="tw-min-h-full tw-flex tw-flex-col tw-bg-page tw-text-default tw-antialiased">
        <NextIntlClientProvider locale={locale} messages={messages}>
          <AppProviders>
            {children}
            <OfflineBanner />
          </AppProviders>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
