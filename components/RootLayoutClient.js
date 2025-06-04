'use client';

import { NextIntlClientProvider } from 'next-intl';
import { Providers } from '@/app/providers';
import { Header } from './Header';
import { PricingHeader } from './PricingHeader';
import { usePathname } from 'next/navigation';
import SubscriptionLimitModal from './SubscriptionLimitModal';
import dynamic from 'next/dynamic';
import { useEffect } from 'react';

// Dynamically import the ExpirationReminderModal to avoid SSR issues
const ExpirationReminderModal = dynamic(
  () => import('./subscription/ExpirationReminderModal'),
  { ssr: false }
);

export function RootLayoutClient({ children, locale, messages }) {
  const pathname = usePathname();
  const isPricingPage = pathname.includes('/pricing') || pathname.includes('/payment') || pathname.includes('/landing') || pathname.includes('/contactUs');
  const isAuthPage = pathname.includes('/auth') || pathname.includes('/login') || pathname.includes('/signup') || pathname.includes('/reset-password') || pathname.includes('/forgot-password');
  const isProjectPage = pathname.includes('/projects/');

  // Add developer utilities for testing subscription expiration (development only)
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      // Add developer tools to the window object
      window.testSubscriptionExpiration = async (action = 'expire', daysFromNow = 0) => {
        try {
          const response = await fetch('/api/dev/test-expiration', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ action, daysFromNow })
          });
          
          const result = await response.json();
          console.log('Subscription test result:', result);
          return result;
        } catch (error) {
          console.error('Error testing subscription expiration:', error);
          return { error: error.message };
        }
      };
      
      console.log('🧪 Developer utilities loaded');
      console.log('Test subscription expiration:');
      console.log('- window.testSubscriptionExpiration("expire", 0) - Set subscription to expire immediately');
      console.log('- window.testSubscriptionExpiration("makeExpiringSoon") - Set subscription to expire in 5 days');
      console.log('- window.testSubscriptionExpiration("resetToActive") - Reset subscription to active (30 days)');
    }
  }, []);

  return (
    <NextIntlClientProvider locale={locale} messages={messages} timeZone="Asia/Shanghai">
      <Providers>
        <div className="relative flex min-h-screen min-w-screen flex-col">
          {!isAuthPage && (isPricingPage ? <PricingHeader /> : <Header />)}
          <main className={`flex-1 w-full ${!isAuthPage && !isPricingPage ? 'pl-16' : ''}`}>
            {children}
          </main>
          <SubscriptionLimitModal />
          <ExpirationReminderModal />
        </div>
      </Providers>
    </NextIntlClientProvider>
  );
}
