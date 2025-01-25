'use client';

import { NextIntlClientProvider } from 'next-intl';
import { Providers } from '@/app/providers';
import { Header } from './Header';
import { PricingHeader } from './PricingHeader';
import { usePathname } from 'next/navigation';

export function RootLayoutClient({ children, locale, messages }) {
  const pathname = usePathname();
  const isPricingPage = pathname.includes('/pricing');

  return (
    <NextIntlClientProvider locale={locale} messages={messages} timeZone="Asia/Shanghai">
      <Providers>
        <div className="relative flex min-h-screen flex-col">
          {isPricingPage ? <PricingHeader /> : <Header />}
          <main className="flex-1 container py-6">
            {children}
          </main>
        </div>
      </Providers>
    </NextIntlClientProvider>
  );
}
