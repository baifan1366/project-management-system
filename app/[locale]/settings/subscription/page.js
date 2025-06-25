'use client';

import { useTranslations } from 'next-intl';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CreditCard, BarChart2, History, ArrowUpCircle } from 'lucide-react';
import { Elements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { useUserStatus } from '@/contexts/UserStatusContext';
import { useRouter, useSearchParams } from 'next/navigation';
// Import subscription components
import { SubscriptionCard, UsageStats, PaymentHistory, UpgradeOptions } from '@/components/subscription';
import { useEffect, useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';

// Initialize Stripe outside of component to avoid recreation on re-renders
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);

// Loading skeleton for the subscription card
const SubscriptionSkeleton = () => (
  <div className="space-y-6">
    <div className="p-5 bg-card rounded-lg border">
      <Skeleton className="h-6 w-48 mb-4" />
      <div className="space-y-3 mb-4">
        <div className="flex justify-between">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-5 w-40" />
        </div>
        <div className="flex justify-between">
          <Skeleton className="h-5 w-28" />
          <Skeleton className="h-5 w-36" />
        </div>
      </div>
      <div className="pt-4 border-t border-border flex justify-between items-center">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-6 w-12 rounded-full" />
      </div>
    </div>
    
    <div className="rounded-lg border">
      <div className="p-4 border-b">
        <Skeleton className="h-6 w-40 mb-2" />
        <Skeleton className="h-4 w-72" />
      </div>
      <div className="p-6">
        <Skeleton className="h-24 w-full rounded-md mb-4" />
        <Skeleton className="h-10 w-40 rounded-md" />
      </div>
    </div>
  </div>
);

export default function SubscriptionPage() {
  const t = useTranslations('profile');
  const [isClient, setIsClient] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { checkSubscriptionStatus, currentUser } = useUserStatus();
  const [refreshing, setRefreshing] = useState(false);
  const [defaultTab, setDefaultTab] = useState('current-plan');

  // Check for payment success param
  useEffect(() => {
    const payment_status = searchParams.get('payment_status');
    
    if (payment_status === 'success' || payment_status === 'completed') {
      // Force refresh subscription data
      if (currentUser?.id) {
        setRefreshing(true);
        
        toast.success(t('subscription.paymentSuccess') || 'Payment processed successfully', {
          description: t('subscription.updatingDetails') || 'Your subscription details are being updated'
        });
        
        // Refresh subscription status
        checkSubscriptionStatus(currentUser.id).then(() => {
          setRefreshing(false);
        });
      }
      
      // Clean URL params
      const newUrl = window.location.pathname;
      router.replace(newUrl);
      
      // Set active tab to current plan
      setDefaultTab('current-plan');
    }
  }, [searchParams, currentUser?.id, checkSubscriptionStatus, router, t]);

  // Ensure we're running in client context before rendering Stripe components
  useEffect(() => {
    setIsClient(true);
    
    // Refresh subscription status on every visit
    if (currentUser?.id) {
      checkSubscriptionStatus(currentUser.id);
    }
  }, [currentUser?.id, checkSubscriptionStatus]);

  return (
    <div className="space-y-6">
      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-xl font-semibold">{t('subscription.title')}</CardTitle>
          <CardDescription>{t('subscription.description')}</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue={defaultTab} className="space-y-6">
            <TabsList className="bg-muted/60">
              <TabsTrigger value="current-plan" className="flex items-center gap-2 data-[state=active]:font-medium">
                <CreditCard className="h-4 w-4" />
                {t('subscription.tabs.currentPlan')}
              </TabsTrigger>
              <TabsTrigger value="usage-stats" className="flex items-center gap-2 data-[state=active]:font-medium">
                <BarChart2 className="h-4 w-4" />
                {t('subscription.tabs.usageStats')}
              </TabsTrigger>
              <TabsTrigger value="payment-history" className="flex items-center gap-2 data-[state=active]:font-medium">
                <History className="h-4 w-4" />
                {t('subscription.tabs.paymentHistory')}
              </TabsTrigger>
              <TabsTrigger value="upgrade-options" className="flex items-center gap-2 data-[state=active]:font-medium">
                <ArrowUpCircle className="h-4 w-4" />
                {t('subscription.tabs.upgradeOptions')}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="current-plan" className="mt-6 space-y-0">
              {isClient && !refreshing ? <SubscriptionCard /> : <SubscriptionSkeleton />}
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