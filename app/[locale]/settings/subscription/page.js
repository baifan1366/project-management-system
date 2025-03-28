'use client';

import { useTranslations } from 'next-intl';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CreditCard, BarChart2, History, ArrowUpCircle } from 'lucide-react';
// 导入订阅组件
import { SubscriptionCard, UsageStats, PaymentHistory, UpgradeOptions } from '@/components/subscription';

export default function SubscriptionPage() {
  const t = useTranslations('profile');

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>{t('subscription.title')}</CardTitle>
          <CardDescription>{t('subscription.description')}</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="current-plan" className="space-y-4">
            <TabsList>
              <TabsTrigger value="current-plan" className="flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                {t('subscription.tabs.currentPlan')}
              </TabsTrigger>
              <TabsTrigger value="usage-stats" className="flex items-center gap-2">
                <BarChart2 className="h-4 w-4" />
                {t('subscription.tabs.usageStats')}
              </TabsTrigger>
              <TabsTrigger value="payment-history" className="flex items-center gap-2">
                <History className="h-4 w-4" />
                {t('subscription.tabs.paymentHistory')}
              </TabsTrigger>
              <TabsTrigger value="upgrade-options" className="flex items-center gap-2">
                <ArrowUpCircle className="h-4 w-4" />
                {t('subscription.tabs.upgradeOptions')}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="current-plan">
              <SubscriptionCard />
            </TabsContent>

            <TabsContent value="usage-stats">
              <UsageStats />
            </TabsContent>

            <TabsContent value="payment-history">
              <PaymentHistory />
            </TabsContent>

            <TabsContent value="upgrade-options">
              <UpgradeOptions />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
} 