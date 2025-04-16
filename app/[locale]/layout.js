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
    <main className={`${inter.variable} ${robotoMono.variable} min-h-screen min-w-screen bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 antialiased`}>
      <RootLayoutClient locale={locale} messages={messages}>
        <div className="flex">
          <div className="flex-1">
            <div className="h-full">
              {children}
            </div>
          </div>
        </div>
      </RootLayoutClient>
    </main>
  );
}
