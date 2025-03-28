'use client';

import { useTranslations } from 'next-intl';
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { User, Bell, Lock, Globe, Zap } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function SettingsLayout({ children }) {
  const t = useTranslations('profile');
  const pathname = usePathname();
  const currentTab = pathname.split('/').pop();

  return (
    <div className="h-screen flex flex-col">
      <div className="flex-none p-10 pb-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">{t('title')}</h2>
          <p className="text-muted-foreground">{t('description')}</p>
        </div>
      </div>

      <div className="flex-1 overflow-hidden px-10 pb-10">
        <div className="h-[calc(100vh-120px)] overflow-y-auto pr-4">
          <div className="flex space-x-8">
            <Tabs value={currentTab || "profile"} className="min-w-[200px]" orientation="vertical">
              <TabsList className="flex flex-col h-fit space-y-2 w-full">
                <Link href="/settings/profile" passHref legacyBehavior>
                  <TabsTrigger value="profile" className="w-full justify-start gap-2">
                    <User className="h-4 w-4" />
                    {t('profile')}
                  </TabsTrigger>
                </Link>
                <Link href="/settings/notifications" passHref legacyBehavior>
                  <TabsTrigger value="notifications" className="w-full justify-start gap-2">
                    <Bell className="h-4 w-4" />
                    {t('notifications')}
                  </TabsTrigger>
                </Link>
                <Link href="/settings/security" passHref legacyBehavior>
                  <TabsTrigger value="security" className="w-full justify-start gap-2">
                    <Lock className="h-4 w-4" />
                    {t('security')}
                  </TabsTrigger>
                </Link>
                <Link href="/settings/preferences" passHref legacyBehavior>
                  <TabsTrigger value="preferences" className="w-full justify-start gap-2">
                    <Globe className="h-4 w-4" />
                    {t('preferences')}
                  </TabsTrigger>
                </Link>
                <Link href="/settings/subscription" passHref legacyBehavior>
                  <TabsTrigger value="subscription" className="w-full justify-start gap-2">
                    <Zap className="h-4 w-4" />
                    {t('subscription.title')}
                  </TabsTrigger>
                </Link>
              </TabsList>
            </Tabs>

            <div className="flex-1">
              {children}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 