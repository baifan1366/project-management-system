'use client';

import { useState } from 'react';
import { useUserStatus } from '@/contexts/UserStatusContext';
import { toast } from 'sonner';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, CreditCard, Check, AlertCircle, Zap, Clock, RefreshCw, Bookmark, Globe, History } from 'lucide-react';

export default function SubscriptionStatus() {
  const t = useTranslations('profile');
  const c = useTranslations('common');
  const { subscriptionStatus, toggleAutoRenewal } = useUserStatus();
  const [isUpdating, setIsUpdating] = useState(false);
  const [showTestExpiration, setShowTestExpiration] = useState(false);

  const handleToggleAutoRenewal = async () => {
    setIsUpdating(true);
    try {
      const newValue = !subscriptionStatus.autoRenewEnabled;
      console.log('Current auto-renewal status:', subscriptionStatus.autoRenewEnabled);
      console.log('Setting auto-renewal to:', newValue);
      
      // If enabling auto-renewal, first check if user has a payment method
      if (newValue) {
        try {
          const paymentMethodResponse = await fetch('/api/payment-methods');
          const paymentMethodData = await paymentMethodResponse.json();
          
          if (!paymentMethodResponse.ok) {
            throw new Error('Failed to fetch payment methods');
          }
          
          console.log('Payment methods check:', paymentMethodData);
          
          if (!paymentMethodData.payment_methods || paymentMethodData.payment_methods.length === 0) {
            toast.error(t('subscription.autoRenewal.needsPaymentMethod'));
            // Redirect to add payment method
            toast.info(t('subscription.autoRenewal.redirectingToPayment'));
            setTimeout(() => {
              window.scrollTo({
                top: document.querySelector('.payment-methods-section')?.offsetTop || 0,
                behavior: 'smooth'
              });
            }, 1000);
            return;
          }
        } catch (paymentError) {
          console.error('Error checking payment methods:', paymentError);
          toast.error(t('subscription.autoRenewal.paymentMethodCheckFailed'));
          return;
        }
      }
      
      const success = await toggleAutoRenewal(newValue);
      
      if (success) {
        console.log('Auto-renewal update successful, new value:', newValue);
        toast.success(
          newValue 
            ? t('subscription.autoRenewal.enabled') 
            : t('subscription.autoRenewal.disabled')
        );
      } else {
        throw new Error('Failed to update auto-renewal setting');
      }
    } catch (error) {
      console.error('Error toggling auto-renewal:', error);
      
      // Show a more user-friendly error message
      let errorMessage = t('subscription.autoRenewal.error');
      
      // If we have more specific error information, show it
      if (error.message.includes('payment method')) {
        errorMessage = t('subscription.autoRenewal.needsPaymentMethod');
      }
      
      toast.error(errorMessage);
    } finally {
      setIsUpdating(false);
    }
  };

  const toggleExpirationWarning = () => {
    setShowTestExpiration(prev => !prev);
    toast.info(showTestExpiration 
      ? 'Test expiration warning hidden' 
      : 'Test expiration warning shown');
  };

  const formatDate = (dateString) => {
    if (!dateString) return c('notAvailable');
    
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return c('notAvailable');
    
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatCurrency = (amount) => {
    if (!amount && amount !== 0) return c('notAvailable');
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount / 100); // Assuming amount is in cents
  };

  // Check if the plan is a free plan
  const isFreePlan = subscriptionStatus.plan?.type === 'FREE' || 
                    !subscriptionStatus.plan?.billing_interval;

  const getBillingIntervalText = (interval) => {
    if (!interval) return c('notAvailable');
    return interval.charAt(0).toUpperCase() + interval.slice(1).toLowerCase();
  };

  const getStatusBadge = (status) => {
    if (!status) return null;
    
    const normalizedStatus = status.toUpperCase();
    
    let color = "bg-muted text-muted-foreground";
    if (normalizedStatus === 'ACTIVE') {
      color = "bg-green-100 text-green-800";
    } else if (normalizedStatus === 'CANCELED' || normalizedStatus === 'EXPIRED') {
      color = "bg-red-100 text-red-800";
    } else if (normalizedStatus === 'PENDING') {
      color = "bg-yellow-100 text-yellow-800";
    }
    
    return (
      <Badge variant="outline" className={`${color} font-medium text-xs px-2 py-0.5 rounded-full`}>
        {status}
      </Badge>
    );
  };

  // Get renewal status badge
  const getRenewalStatusBadge = (status) => {
    if (!status) return null;
    
    let color = "bg-muted text-muted-foreground";
    let text = "Pending";
    
    if (status === 'PROCESSING') {
      color = "bg-blue-100 text-blue-800";
      text = "Processing";
    } else if (status === 'FAILED') {
      color = "bg-red-100 text-red-800";
      text = "Failed";
    } else if (status === 'COMPLETED') {
      color = "bg-green-100 text-green-800";
      text = "Completed";
    }
    
    return (
      <Badge variant="outline" className={`${color} font-medium text-xs px-2 py-0.5 rounded-full`}>
        {text}
      </Badge>
    );
  };

  // Add a debug log to check subscription status values
  console.log('Subscription status in component:', {
    ...subscriptionStatus,
    isExpiringSoon: subscriptionStatus.isExpiringSoon,
    autoRenewEnabled: subscriptionStatus.autoRenewEnabled,
    planAutoRenew: subscriptionStatus.plan?.auto_renew,
    userAutoRenewEnabled: subscriptionStatus.userAutoRenewEnabled,
    lastRenewalAttempt: subscriptionStatus.lastRenewalAttempt,
    renewalStatus: subscriptionStatus.renewalStatus,
    isFreePlan
  });

  if (!subscriptionStatus.isActive) {
    return (
      <div className="p-6 bg-card rounded-lg border shadow-sm">
        <h3 className="text-lg font-semibold text-foreground mb-3 flex items-center">
          <AlertCircle className="h-5 w-5 mr-2 text-amber-500" />
          {t('subscription.status.title')}
        </h3>
        <p className="text-muted-foreground mb-4">{t('subscription.status.noActive')}</p>
        <Link href="/pricing">
          <Button variant="default" size="sm">
            {t('subscription.viewPlans')}
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="p-6 bg-card rounded-lg border shadow-sm">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-foreground flex items-center">
          <CreditCard className="h-5 w-5 mr-2 text-primary" />
          {t('subscription.status.title')}
        </h3>
        {subscriptionStatus.plan?.status && getStatusBadge(subscriptionStatus.plan.status)}
      </div>
      
      <div className="bg-muted/40 p-5 rounded-lg mb-6">
        <div className="flex justify-between items-center mb-4">
          <span 
            className="text-2xl font-bold text-foreground flex items-center cursor-pointer" 
            onClick={toggleExpirationWarning} 
            title="Click to test expiration warning"
          >
            {subscriptionStatus.plan?.name || c('unknown')}
            {isFreePlan && (
              <Badge variant="secondary" className="ml-2 text-xs px-2 bg-primary/10 text-primary">
                Free
              </Badge>
            )}
          </span>
          <span className="text-xl font-bold text-foreground">
            {subscriptionStatus.plan?.price !== undefined ? formatCurrency(subscriptionStatus.plan.price) : c('notAvailable')}
            {subscriptionStatus.plan?.billing_interval && (
              <span className="text-sm font-normal text-muted-foreground ml-1">
                /{getBillingIntervalText(subscriptionStatus.plan.billing_interval)}
              </span>
            )}
          </span>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div className="flex items-start">
            <Bookmark className="h-4 w-4 mr-2 mt-0.5 text-muted-foreground" />
            <div>
              <p className="text-muted-foreground">{t('subscription.planType')}</p>
              <p className="font-medium text-foreground">
                {subscriptionStatus.plan?.type || c('unknown')}
              </p>
            </div>
          </div>
          
          <div className="flex items-start">
            <Globe className="h-4 w-4 mr-2 mt-0.5 text-muted-foreground" />
            <div>
              <p className="text-muted-foreground">{t('subscription.timezone')}</p>
              <p className="font-medium text-foreground">
                {subscriptionStatus.timezone || 'UTC+0'}
              </p>
            </div>
          </div>
          
          <div className="flex items-start">
            <Zap className="h-4 w-4 mr-2 mt-0.5 text-muted-foreground" />
            <div>
              <p className="text-muted-foreground">{t('subscription.billingInterval')}</p>
              <p className="font-medium text-foreground">
                {subscriptionStatus.plan?.billing_interval 
                  ? getBillingIntervalText(subscriptionStatus.plan.billing_interval) 
                  : isFreePlan ? t('subscription.noRecurring') : c('notAvailable')}
              </p>
            </div>
          </div>
          
          {!isFreePlan && (
            <>
              <div className="flex items-start">
                <Calendar className="h-4 w-4 mr-2 mt-0.5 text-muted-foreground" />
                <div>
                  <p className="text-muted-foreground">{t('subscription.status.expiresOn')}</p>
                  <p className="font-medium text-foreground">{formatDateTime(subscriptionStatus.expiresAt)}</p>
                </div>
              </div>
              
              <div className="flex items-start">
                <RefreshCw className="h-4 w-4 mr-2 mt-0.5 text-muted-foreground" />
                <div>
                  <p className="text-muted-foreground">{t('subscription.nextPaymentDate')}</p>
                  <p className="font-medium text-foreground">
                    {subscriptionStatus.autoRenewEnabled ? formatDateTime(subscriptionStatus.expiresAt) : t('subscription.noRenewal')}
                  </p>
                </div>
              </div>
              
              {/* Last renewal attempt info */}
              {subscriptionStatus.lastRenewalAttempt && (
                <div className="flex items-start">
                  <History className="h-4 w-4 mr-2 mt-0.5 text-muted-foreground" />
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-muted-foreground">Last Renewal Attempt</p>
                      {subscriptionStatus.renewalStatus && getRenewalStatusBadge(subscriptionStatus.renewalStatus)}
                    </div>
                    <p className="font-medium text-foreground">{formatDateTime(subscriptionStatus.lastRenewalAttempt)}</p>
                    {subscriptionStatus.renewalFailureCount > 0 && (
                      <p className="text-xs text-red-500 mt-1">
                        Failed attempts: {subscriptionStatus.renewalFailureCount}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
      
      {/* Show expiration warning if subscription is expiring soon or test mode is on */}
      {!isFreePlan && (subscriptionStatus.isExpiringSoon || showTestExpiration) && !subscriptionStatus.autoRenewEnabled && (
        <div className="mb-6 p-3 bg-amber-50 text-amber-700 rounded-md text-sm border border-amber-200 flex items-center">
          <AlertCircle className="h-4 w-4 mr-2 flex-shrink-0" />
          <span>{t('subscription.status.expiringSoon')}</span>
        </div>
      )}
      
      {!isFreePlan && (
        <div className="bg-background border rounded-lg p-4 mb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Clock className="h-4 w-4 mr-2 text-muted-foreground" />
              <span className="font-medium">{t('subscription.autoRenewal.title')}</span>
            </div>
            
            <div className="flex items-center">
              <span className={`mr-3 text-sm font-medium ${subscriptionStatus.autoRenewEnabled ? 'text-emerald-600' : 'text-muted-foreground'}`}>
                {subscriptionStatus.autoRenewEnabled ? t('subscription.autoRenewal.enabled') : t('subscription.autoRenewal.disabled')}
              </span>
              
              <button
                onClick={handleToggleAutoRenewal}
                disabled={isUpdating}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
                  subscriptionStatus.autoRenewEnabled ? 'bg-primary' : 'bg-muted'
                }`}
                role="switch"
                aria-checked={subscriptionStatus.autoRenewEnabled}
              >
                <span className="sr-only">{t('subscription.autoRenewal.toggle')}</span>
                <span
                  aria-hidden="true"
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    subscriptionStatus.autoRenewEnabled ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>
          
          <div className="mt-2 text-xs text-muted-foreground ml-6">
            {subscriptionStatus.autoRenewEnabled 
              ? t('subscription.autoRenewal.willRenew', { date: formatDateTime(subscriptionStatus.expiresAt) })
              : t('subscription.autoRenewal.willNotRenew')}
          </div>
        </div>
      )}
      
      {isFreePlan && (
        <div className="bg-background border rounded-lg p-4 flex items-start">
          <Check className="h-4 w-4 mr-2 mt-0.5 text-emerald-500" />
          <p className="text-sm text-muted-foreground">
            {t('subscription.status.freePlan')}
          </p>
        </div>
      )}
    </div>
  );
} 