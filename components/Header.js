'use client';

import { useTranslations } from 'next-intl';
import { MainNav } from './MainNav';
import { Button } from './ui/button';
import { Bell, User } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useState, useEffect, useRef } from 'react';
import { ProfilePopover } from './ui/ProfilePopover';
import { Popover, PopoverTrigger } from '@/components/ui/popover';
import { NotificationDialog } from './notifications/NotificationDialog';
import { useSelector, useDispatch } from 'react-redux';
import { 
  selectUnreadCount, 
  fetchNotifications,
  subscribeToNotifications,
  unsubscribeFromNotifications,
  selectIsSubscribed,
} from '@/lib/redux/features/notificationSlice';
import { Badge } from './ui/badge';
import { useGetUser } from '@/lib/hooks/useGetUser';
import { useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';

// Singleton flag to track if Header has mounted - prevents multiple instances from competing
let headerHasMounted = false;
// Keep track of the last user ID to avoid redundant subscription changes
let lastSubscribedUserId = null;

export function Header() {
  const t = useTranslations();
  const dispatch = useDispatch();
  const router = useRouter();
  const locale = useLocale();
  const [isProfileOpen, setProfileOpen] = useState(false);
  const [isNotificationOpen, setNotificationOpen] = useState(false);
  const unreadCount = useSelector(selectUnreadCount);
  const isSubscribed = useSelector(selectIsSubscribed);
  const { user } = useGetUser();
  const headerSubscriptionRef = useRef(false);
  const initialFetchDoneRef = useRef(false);
  const isMountedRef = useRef(false);
  const previousUnreadCountRef = useRef(unreadCount);
  const [shouldAnimate, setShouldAnimate] = useState(false);
  const setupAttemptedRef = useRef(false);

  // Handle subscriptions to notifications
  useEffect(() => {
    // Set mounted flag on component mount
    isMountedRef.current = true;
    
    // Skip if no user available
    if (!user || !user.id) {
      return;
    }
    
    // Prevent duplicate setup attempts in the same render cycle
    if (setupAttemptedRef.current) {
      return;
    }
    
    setupAttemptedRef.current = true;
    
    // Only one Header component should handle notifications
    if (headerHasMounted && !headerSubscriptionRef.current) {
      console.log('Another Header component is already managing notifications');
      return;
    }
    
    // Claim header management responsibility
    headerHasMounted = true;
    
    const setupNotifications = async () => {
      try {
        // Avoid redundant subscription setup for the same user
        if (lastSubscribedUserId === user.id && isSubscribed) {
          console.log('Header: Already subscribed for this user, skipping setup');
          headerSubscriptionRef.current = true;
          return;
        }
        
        // Only fetch notifications once on initial mount or when user changes
        if (!initialFetchDoneRef.current || lastSubscribedUserId !== user.id) {
          console.log('Header: Performing initial notification fetch');
          await dispatch(fetchNotifications(user.id));
          initialFetchDoneRef.current = true;
        }
        
        // Subscribe to realtime notifications if not already subscribed
        if (!isSubscribed && isMountedRef.current) {
          console.log('Header: Starting realtime subscription for notifications');
          await dispatch(subscribeToNotifications(user.id));
          headerSubscriptionRef.current = true;
          lastSubscribedUserId = user.id;
        }
      } catch (error) {
        console.error('Error setting up notifications:', error);
      }
    };
    
    setupNotifications();
    
    // Cleanup on unmount
    return () => {
      if (isMountedRef.current) {
        isMountedRef.current = false;
        
        // Only unsubscribe if this component created the subscription
        if (headerSubscriptionRef.current) {
          console.log('Header: Cleaning up notification subscription on unmount');
          dispatch(unsubscribeFromNotifications());
          headerSubscriptionRef.current = false;
          initialFetchDoneRef.current = false;
          headerHasMounted = false;
          lastSubscribedUserId = null;
        }
        
        setupAttemptedRef.current = false;
      }
    };
  }, [user, isSubscribed, dispatch]);

  // Effect to detect new notifications and trigger animation
  useEffect(() => {
    // If unreadCount increased, trigger animation
    if (unreadCount > previousUnreadCountRef.current && initialFetchDoneRef.current) {
      setShouldAnimate(true);
      
      // Reset animation after 1.5 seconds
      const timer = setTimeout(() => {
        setShouldAnimate(false);
      }, 1500);
      
      return () => clearTimeout(timer);
    }
    
    // Update previous count reference
    previousUnreadCountRef.current = unreadCount;
  }, [unreadCount]);

  const handleNotificationClick = (event) => {
    // Hold Shift key to open dialog instead of navigation
    if (event.shiftKey) {
      setNotificationOpen(true);
    } else {
      // Normal click navigates to notifications page
      router.push(`/${locale}/notifications`);
    }
  };

  return (
    <div className="fixed top-0 bottom-0 left-0 z-50 w-16 border-r bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 flex flex-col">
      <div className="flex flex-col h-full">
        <div className="px-3 pt-3">
          <div className="flex items-center justify-center">
            <span className="text-xl font-bold">TS</span>
          </div>
        </div>
        <MainNav />
        <div className="mt-auto p-3 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="flex flex-col items-center gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    size="icon" 
                    variant="ghost" 
                    className="w-10 h-10 relative"
                    onClick={handleNotificationClick}
                  >
                    <Bell size={20} />
                    {unreadCount > 0 && (
                      <Badge 
                        variant="destructive" 
                        className={`absolute -top-1 -right-1 h-5 min-w-[20px] flex items-center justify-center p-0 text-xs
                          ${shouldAnimate ? 'animate-notification-pulse' : ''}`}
                      >
                        {unreadCount > 99 ? '99+' : unreadCount}
                      </Badge>
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">
                  {t('common.notifications')} <span className="text-xs opacity-70">(Shift+Click to preview)</span>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <TooltipProvider>
              <Tooltip>
                <Popover open={isProfileOpen} onOpenChange={setProfileOpen}>
                  <PopoverTrigger asChild>
                    <Button size="icon" variant="ghost" className="w-10 h-10">
                      <User size={20} />
                    </Button>
                  </PopoverTrigger>
                  <ProfilePopover onClose={() => setProfileOpen(false)} />
                </Popover>
                <TooltipContent side="right">
                  {t('common.profile')}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </div>
      
      <NotificationDialog 
        open={isNotificationOpen} 
        onOpenChange={setNotificationOpen} 
        headerHandlesSubscription={true}
      />
      
      <style jsx global>{`
        @keyframes notificationPulse {
          0% { transform: scale(1); }
          50% { transform: scale(1.5); }
          100% { transform: scale(1); }
        }
        
        .animate-notification-pulse {
          animation: notificationPulse 1.5s ease-in-out;
        }
      `}</style>
    </div>
  );
}
