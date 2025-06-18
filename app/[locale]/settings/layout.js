'use client';

import { useTranslations } from 'next-intl';
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { User, Bell, Lock, Globe, Zap } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useState, useEffect } from 'react';
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// 骨架屏组件
function SettingsSkeletonPage({ type }) {
  const t = useTranslations('profile');
  
  // 根据不同类型展示相应的骨架屏
  const renderProfileSkeleton = () => (
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
  );

  const renderNotificationsSkeleton = () => (
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
  );

  const renderPreferencesSkeleton = () => (
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
  );

  const renderSecuritySkeleton = () => (
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
  );

  const renderSubscriptionSkeleton = () => (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle>{t('subscription.title')}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <Skeleton className="h-20 w-full rounded-md" />
          <div className="grid grid-cols-2 gap-4">
            <Skeleton className="h-16 w-full rounded-md" />
            <Skeleton className="h-16 w-full rounded-md" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-[140px]" />
            <Skeleton className="h-12 w-full rounded-md" />
          </div>
        </div>
      </CardContent>
    </Card>
  );

  // 根据类型返回不同的骨架屏
  switch(type) {
    case 'profile':
      return renderProfileSkeleton();
    case 'notifications':
      return renderNotificationsSkeleton();
    case 'preferences':
      return renderPreferencesSkeleton();
    case 'security':
      return renderSecuritySkeleton();
    case 'subscription':
      return renderSubscriptionSkeleton();
    default:
      return renderProfileSkeleton();
  }
}

export default function SettingsLayout({ children }) {
  const t = useTranslations('profile');
  const pathname = usePathname();
  const router = useRouter();
  const currentTab = pathname.split('/').pop();
  const [isLoading, setIsLoading] = useState(false);
  const [previousTab, setPreviousTab] = useState('');
  
  // 处理标签页切换
  const handleTabChange = (tab) => {
    if (tab === currentTab) return;
    
    // 关闭所有现有的toast
    toast.dismiss();
    
    // 设置加载状态
    setIsLoading(true);
    setPreviousTab(currentTab);
    
    // 记录当前时间戳
    const startTime = Date.now();
    
    // 至少显示骨架屏500毫秒，确保良好的用户体验
    const minLoadingTime = 100;
    
    // 导航到新页面
    router.push(`/settings/${tab}`);
    
    // 延迟关闭骨架屏，确保展示足够时间
    setTimeout(() => {
      setIsLoading(false);
    }, minLoadingTime);
  };

  // 当路径变化时，检查是否需要显示加载状态
  useEffect(() => {
    const tabNames = {
      'profile': t('profile'),
      'notifications': t('notifications'),
      'security': t('security'),
      'preferences': t('preferences'),
      'subscription': t('subscription.title')
    };
    
    if (tabNames[currentTab]) {
      // 显示正在加载提示，4秒后自动消失
      toast.info(t('loading') + ` ${tabNames[currentTab]}`, {
        duration: 4000, // 4秒后自动消失
      });
    }
  }, [currentTab, t]);

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
                <TabsTrigger 
                  value="profile" 
                  className="w-full justify-start gap-2"
                  onClick={() => handleTabChange('profile')}
                >
                  <User className="h-4 w-4" />
                  {t('profile')}
                </TabsTrigger>
                <TabsTrigger 
                  value="notifications" 
                  className="w-full justify-start gap-2"
                  onClick={() => handleTabChange('notifications')}
                >
                  <Bell className="h-4 w-4" />
                  {t('notifications')}
                </TabsTrigger>
                <TabsTrigger 
                  value="security" 
                  className="w-full justify-start gap-2"
                  onClick={() => handleTabChange('security')}
                >
                  <Lock className="h-4 w-4" />
                  {t('security')}
                </TabsTrigger>
                <TabsTrigger 
                  value="preferences" 
                  className="w-full justify-start gap-2"
                  onClick={() => handleTabChange('preferences')}
                >
                  <Globe className="h-4 w-4" />
                  {t('preferences')}
                </TabsTrigger>
                <TabsTrigger 
                  value="subscription" 
                  className="w-full justify-start gap-2"
                  onClick={() => handleTabChange('subscription')}
                >
                  <Zap className="h-4 w-4" />
                  {t('subscription.title')}
                </TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="flex-1">
              {isLoading ? (
                <SettingsSkeletonPage type={currentTab} />
              ) : (
                children
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 