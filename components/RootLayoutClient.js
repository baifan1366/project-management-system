'use client';

import { NextIntlClientProvider } from 'next-intl';
import { Providers } from '@/app/providers';
import { Header } from './Header';
import { PricingHeader } from './PricingHeader';
import { usePathname } from 'next/navigation';
import SubscriptionLimitModal from './SubscriptionLimitModal';

export function RootLayoutClient({ children, locale, messages }) {
  const pathname = usePathname();
  const isPricingPage = pathname.includes('/pricing') || pathname.includes('/payment') || pathname.includes('/landing') || pathname.includes('/contactUs');
  const isAuthPage = pathname.includes('/auth') || pathname.includes('/login') || pathname.includes('/signup') || pathname.includes('/reset-password') || pathname.includes('/forgot-password');
  const isProjectPage = pathname.includes('/projects/');

  return (
    <NextIntlClientProvider locale={locale} messages={messages} timeZone="Asia/Shanghai">
      <Providers>
        <div className="relative flex min-h-screen min-w-screen flex-col">
          {!isAuthPage && (isPricingPage ? <PricingHeader /> : <Header />)}
          <main className={`flex-1 w-full ${!isAuthPage && !isPricingPage ? 'pl-16' : ''}`}>
            {children}
          </main>
          <SubscriptionLimitModal />
        </div>
      </Providers>
    </NextIntlClientProvider>
  );
}
