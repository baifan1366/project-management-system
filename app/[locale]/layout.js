import { getMessages } from 'next-intl/server';
import { RootLayoutClient } from '@/components/RootLayoutClient';
import { geistSans, geistMono, inter, robotoMono } from '@/lib/fonts';
import "../globals.css";

export function generateStaticParams() {
  return [{ locale: 'en' }, { locale: 'zh' }];
}

export const metadata = {
  title: 'Team Sync',
  description: 'Project Management System',
};

export default async function LocaleLayout({ children, params }) {
  const {locale} = await params;
  const messages = await getMessages();

  return (
    <html lang={locale} suppressHydrationWarning>
      <body className={`${inter.variable} ${robotoMono.variable} min-h-screen bg-background antialiased`}>
        <RootLayoutClient locale={locale} messages={messages}>
          {children}
        </RootLayoutClient>
      </body>
    </html>
  );
}
