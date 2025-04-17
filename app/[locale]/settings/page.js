'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTranslations } from 'next-intl';
import { Tabs, TabsContent } from "@/components/ui/tabs";

export default function SettingsPage() {
  const router = useRouter();
  const t = useTranslations('profile');
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    // 添加一个短暂的延迟，显示骨架屏
    const timeout = setTimeout(() => {
      router.push('/settings/profile');
    }, 800);
    
    return () => clearTimeout(timeout);
  }, [router]);
  
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-8">
        {/* Profile Section */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>{t('profile')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-4">
              <Skeleton className="h-12 w-12 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-[250px]" />
                <Skeleton className="h-4 w-[200px]" />
              </div>
            </div>
            <div className="grid gap-6 mt-6">
              <div className="grid gap-3">
                <Skeleton className="h-4 w-[100px]" />
                <Skeleton className="h-10 w-full" />
              </div>
              <div className="grid gap-3">
                <Skeleton className="h-4 w-[140px]" />
                <Skeleton className="h-10 w-full" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notifications Section */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>{t('notifications')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Skeleton className="h-4 w-[200px]" />
                  <Skeleton className="h-4 w-[250px]" />
                </div>
                <Skeleton className="h-6 w-12" />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Skeleton className="h-4 w-[220px]" />
                  <Skeleton className="h-4 w-[230px]" />
                </div>
                <Skeleton className="h-6 w-12" />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Skeleton className="h-4 w-[180px]" />
                  <Skeleton className="h-4 w-[240px]" />
                </div>
                <Skeleton className="h-6 w-12" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Preferences Section */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>{t('preferences')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid gap-3">
                <Skeleton className="h-4 w-[120px]" />
                <Skeleton className="h-10 w-full" />
              </div>
              <div className="grid gap-3">
                <Skeleton className="h-4 w-[150px]" />
                <div className="flex space-x-2">
                  <Skeleton className="h-10 w-[100px]" />
                  <Skeleton className="h-10 w-[100px]" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Security Section */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>{t('security')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid gap-3">
                <Skeleton className="h-4 w-[180px]" />
                <Skeleton className="h-10 w-full" />
              </div>
              <div className="grid gap-3">
                <Skeleton className="h-4 w-[200px]" />
                <Skeleton className="h-10 w-full" />
              </div>
              <div className="grid gap-3">
                <Skeleton className="h-4 w-[220px]" />
                <Skeleton className="h-10 w-full" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}