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
import { useState, useEffect } from 'react';
import { ProfilePopover } from './ui/ProfilePopover';
import { Popover, PopoverTrigger } from '@/components/ui/popover';
import { NotificationDialog } from './notifications/NotificationDialog';
import { useSelector, useDispatch } from 'react-redux';
import { 
  selectUnreadCount, 
  fetchNotifications,
  subscribeToNotifications,
  unsubscribeFromNotifications
} from '@/lib/redux/features/notificationSlice';
import { Badge } from './ui/badge';
import { useGetUser } from '@/lib/hooks/useGetUser';
import { useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';

export function Header() {
  const t = useTranslations();
  const dispatch = useDispatch();
  const router = useRouter();
  const locale = useLocale();
  const [isProfileOpen, setProfileOpen] = useState(false);
  const [isNotificationOpen, setNotificationOpen] = useState(false);
  const unreadCount = useSelector(selectUnreadCount);
  const { user } = useGetUser();

  useEffect(() => {
    if (!user) return;
    
    // Initial fetch of notifications
    dispatch(fetchNotifications(user.id));
    
    // Subscribe to realtime notifications
    console.log('Header: Starting realtime subscription for notifications');
    dispatch(subscribeToNotifications(user.id));
    
    // Cleanup subscription on unmount
    return () => {
      console.log('Header: Cleaning up notification subscription');
      dispatch(unsubscribeFromNotifications());
    };
  }, [dispatch, user]); // Added user dependency

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
                        className="absolute -top-1 -right-1 h-5 min-w-[20px] flex items-center justify-center p-0 text-xs"
                      >
                        {unreadCount > 99 ? '99+' : unreadCount}
                      </Badge>
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">
                  {t('common.notifications')} <span className="text-xs opacity-70">(Shift+点击查看快速预览)</span>
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
      />
    </div>
  );
}
