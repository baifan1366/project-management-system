'use client';

import { NextIntlClientProvider } from 'next-intl';
import { Providers } from '@/app/providers';
import { Header } from './Header';
import { PricingHeader } from './PricingHeader';
import { usePathname } from 'next/navigation';

export function RootLayoutClient({ children, locale, messages }) {
  const pathname = usePathname();
  const isPricingPage = pathname.includes('/pricing') || pathname.includes('/payment') || pathname.includes('/landing');
  const isAuthPage = pathname.includes('/auth/callback') || pathname.includes('/login') || pathname.includes('/signup') || pathname.includes('/reset-password') || pathname.includes('/forgot-password');

  return (
    <NextIntlClientProvider locale={locale} messages={messages} timeZone="Asia/Shanghai">
      <Providers>
        <div className="relative flex min-h-screen flex-col">
          {!isAuthPage && (isPricingPage ? <PricingHeader /> : <Header />)}
          <main className={`flex-1 container ${!isAuthPage && !isPricingPage ? 'pl-16' : ''}`}>
            {children}
          </main>
        </div>
      </Providers>
    </NextIntlClientProvider>
  );
}
