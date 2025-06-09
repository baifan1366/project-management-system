'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useUserStatus } from '@/contexts/UserStatusContext';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { AlertTriangle, Calendar, RefreshCw } from 'lucide-react';
import Link from 'next/link';

export default function ExpirationReminderModal() {
  const [open, setOpen] = useState(false);
  const t = useTranslations('profile');
  const c = useTranslations('common');
  const { subscriptionStatus, toggleAutoRenewal, checkSubscriptionStatus } = useUserStatus();
  const [isEnabling, setIsEnabling] = useState(false);
  
  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return c('notAvailable');
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };
  
  // Add a useEffect to check subscription status when component mounts
  useEffect(() => {
    // This ensures we check the subscription status when the page loads
    const checkSubscriptionOnMount = async () => {
      if (checkSubscriptionStatus && typeof checkSubscriptionStatus === 'function') {
        await checkSubscriptionStatus();
      }
    };
    
    checkSubscriptionOnMount();
  }, []);
  
  // Check if we should show the modal when subscription status changes
  useEffect(() => {
    // Only show for paid plans that are expiring soon and don't have auto-renewal enabled
    const shouldShowModal = 
      subscriptionStatus.isActive && 
      subscriptionStatus.isExpiringSoon && 
      !subscriptionStatus.autoRenewEnabled &&
      subscriptionStatus.plan?.type !== 'FREE';
    
    if (shouldShowModal) {
      // Check if the user was reminded recently
      const lastReminder = localStorage.getItem('subscription_reminder_timestamp');
      const now = Date.now();
      
      if (lastReminder) {
        const timeSinceLastReminder = now - parseInt(lastReminder, 10);
        const daysRemaining = getDaysRemaining();
        
        // Adjust reminder frequency based on how close to expiration
        let reminderInterval;
        if (daysRemaining <= 1) {
          // Last day: remind every 4 hours
          reminderInterval = 4 * 60 * 60 * 1000;
        } else if (daysRemaining <= 3) {
          // 2-3 days left: remind once a day
          reminderInterval = 24 * 60 * 60 * 1000;
        } else {
          // 4+ days left: remind every 2 days
          reminderInterval = 2 * 24 * 60 * 60 * 1000;
        }
        
        // If it's been less than the reminder interval, don't show the modal
        if (timeSinceLastReminder < reminderInterval) {
          return;
        }
      }
      
      // Show the modal and update the last reminder timestamp
      
      setOpen(true);
    }
  }, [subscriptionStatus]);
  
  // Calculate days remaining until expiration
  const getDaysRemaining = () => {
    if (!subscriptionStatus.expiresAt) return 0;
    
    const now = new Date();
    const expirationDate = new Date(subscriptionStatus.expiresAt);
    const diffTime = expirationDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return Math.max(0, diffDays); // Ensure we don't show negative days
  };
  
  // Handle enabling auto-renewal
  const handleEnableAutoRenewal = async () => {
    setIsEnabling(true);
    try {
      const success = await toggleAutoRenewal(true);
      
      if (success) {
        toast.success(t('subscription.autoRenewal.enabled'));
        setOpen(false);
      } else {
        throw new Error('Failed to enable auto-renewal');
      }
    } catch (error) {
      console.error('Error enabling auto-renewal:', error);
      
      let errorMessage = t('subscription.autoRenewal.error');
      if (error.message.includes('payment method')) {
        errorMessage = t('subscription.autoRenewal.needsPaymentMethod');
      }
      
      toast.error(errorMessage);
    } finally {
      setIsEnabling(false);
    }
  };

  // Handle the "remind me later" button
  const handleRemindLater = () => {
    // Store the current timestamp in localStorage
    localStorage.setItem('subscription_reminder_timestamp', Date.now().toString());
    setOpen(false);
  };

  // Developer helper for testing the modal
  useEffect(() => {
    // Add a global helper for testing the modal
    if (typeof window !== 'undefined') {
      window.testExpirationModal = {
        show: () => setOpen(true),
        clearLastReminder: () => {
          localStorage.removeItem('subscription_reminder_timestamp');
          
        },
        simulateExpiringSoon: () => {
          const fakeDaysRemaining = 3;
          
          
          // Override the getDaysRemaining function temporarily
          const originalGetDaysRemaining = getDaysRemaining;
          window.getDaysRemaining = () => fakeDaysRemaining;
          
          // Show the modal
          setOpen(true);
          
          // Restore the original function after 1 minute
          setTimeout(() => {
            window.getDaysRemaining = originalGetDaysRemaining;
            
          }, 60000);
        }
      };
      
    }
    
    // Cleanup
    return () => {
      if (typeof window !== 'undefined') {
        delete window.testExpirationModal;
      }
    };
  }, [getDaysRemaining]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center text-amber-600">
            <AlertTriangle className="h-5 w-5 mr-2" />
            {t('subscription.expirationReminder.title')}
          </DialogTitle>
          <DialogDescription>
            {t('subscription.expirationReminder.description')}
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4 space-y-4">
          <div className="bg-amber-50 p-4 rounded-md border border-amber-200">
            <div className="flex items-center mb-2 text-amber-800 font-medium">
              <Calendar className="h-4 w-4 mr-2" />
              {t('subscription.expirationReminder.expirationDate')}
            </div>
            <div className="flex justify-between items-center">
              <p className="text-amber-700 font-bold">
                {formatDate(subscriptionStatus.expiresAt)}
              </p>
              <span className="bg-amber-100 text-amber-800 text-xs font-medium px-2.5 py-0.5 rounded">
                {t('subscription.expirationReminder.daysRemaining', { days: getDaysRemaining() })}
              </span>
            </div>
            <p className="text-amber-600 mt-2 text-sm">
              {t('subscription.expirationReminder.expirationWarning')}
            </p>
          </div>
          
          <div className="bg-primary/10 p-4 rounded-md border border-primary/20">
            <div className="flex items-center mb-2 text-primary font-medium">
              <RefreshCw className="h-4 w-4 mr-2" />
              {t('subscription.expirationReminder.autoRenewalBenefit')}
            </div>
            <p className="text-muted-foreground text-sm">
              {t('subscription.expirationReminder.renewalDescription')}
            </p>
          </div>
        </div>
        
        <DialogFooter className="flex flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={handleRemindLater}
            className="sm:order-1"
          >
            {t('subscription.expirationReminder.remindLater')}
          </Button>
          
          <Button
            variant="default"
            onClick={handleEnableAutoRenewal}
            disabled={isEnabling}
            className="sm:order-2"
          >
            {isEnabling ? c('processing') : t('subscription.expirationReminder.enableAutoRenewal')}
          </Button>
          
          <Link href="/pricing" className="sm:order-3 w-full sm:w-auto">
            <Button variant="secondary" className="w-full">
              {t('subscription.expirationReminder.viewPlans')}
            </Button>
          </Link>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 