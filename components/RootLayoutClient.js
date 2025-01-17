'use client';

import { NextIntlClientProvider } from 'next-intl';
import { Providers } from '@/app/providers';
import { Header } from './Header';

export function RootLayoutClient({ children, locale, messages }) {
  return (
    <NextIntlClientProvider locale={locale} messages={messages} timeZone="Asia/Shanghai">
      <Providers>
        <div className="relative flex min-h-screen flex-col">
          <Header />
          <main className="flex-1 container py-6">
            {children}
          </main>
        </div>
      </Providers>
    </NextIntlClientProvider>
  );
}