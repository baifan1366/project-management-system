'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useTranslations } from 'next-intl';
import { Check } from 'lucide-react';

export default function SubscriptionCard({ userId }) {
  const t = useTranslations('profile.subscription');
  const [subscription, setSubscription] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchSubscription = async () => {
      try {
        // 模拟 API 调用
        const data = {
          plan: 'free',
          status: 'active',
          validUntil: '2024-12-31',
          features: [
            'Basic Project Management',
            'Up to 3 Projects',
            'Basic Collaboration',
            '1GB Storage',
            'Community Support'
          ]
        };
        setSubscription(data);
      } catch (error) {
        console.error('Error fetching subscription:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSubscription();
  }, []);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t('currentPlan.title')}</CardTitle>
          <CardDescription>Loading...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (!subscription) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t('currentPlan.title')}</CardTitle>
          <CardDescription>No subscription data available</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>{t('currentPlan.title')}</CardTitle>
            <CardDescription>
              {t('currentPlan.validUntil')}: {subscription.validUntil}
            </CardDescription>
          </div>
          <Badge 
            variant={subscription.status === 'active' ? 'success' : 'destructive'}
            className="capitalize"
          >
            {subscription.status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <h3 className="text-xl font-semibold capitalize mb-4">
            {subscription.plan} Plan
          </h3>
          <div className="space-y-2">
            {subscription.features.map((feature, index) => (
              <div key={index} className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-500" />
                <span>{feature}</span>
              </div>
            ))}
          </div>
        </div>
        
        <div className="flex justify-end">
          <Button 
            onClick={() => {
              /* 处理升级计划 */


            }}
            variant="default"
          >
            {t('currentPlan.upgrade')}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
