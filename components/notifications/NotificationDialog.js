'use client';

import { useState, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslations } from 'next-intl';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { 
  fetchNotifications, 
  markNotificationAsRead, 
  markAllNotificationsAsRead,
  deleteNotification,
  selectNotifications,
  selectUnreadCount,
  selectNotificationsLoading,
  selectIsSubscribed,
  unsubscribeFromNotifications,
  subscribeToNotifications,
  setForceRefresh
} from '@/lib/redux/features/notificationSlice';
import { formatDistanceToNow } from 'date-fns';
import { zhCN, enUS } from 'date-fns/locale';
import { Check, Trash, Bell, BellOff, Calendar, User, MessageSquare, Video } from 'lucide-react';
import { useGetUser } from '@/lib/hooks/useGetUser';
import { useUserTimezone } from '@/hooks/useUserTimezone';
import NotificationItem, { NotificationItemSkeleton } from '@/components/notifications/NotificationItem';

export function NotificationDialog({ open, onOpenChange, headerHandlesSubscription = false }) {
  const t = useTranslations();
  const dispatch = useDispatch();
  const notifications = useSelector(selectNotifications);
  const unreadCount = useSelector(selectUnreadCount);
  const loading = useSelector(selectNotificationsLoading);
  const isSubscribed = useSelector(selectIsSubscribed);
  const [activeTab, setActiveTab] = useState('all');
  const { user } = useGetUser();
  const [locale, setLocale] = useState('en');
  const dialogSubscriptionCreatedRef = useRef(false);
  const { formatDateToUserTimezone, formatToUserTimezone, hourFormat } = useUserTimezone();

  useEffect(() => {
    // Only take action when dialog opens and we have a user
    if (!open || !user) return;
    
    // If Header handles subscriptions, we only refresh data but don't manage subscriptions
    if (headerHandlesSubscription) {
      // Force refresh to bypass debounce
      dispatch(setForceRefresh(true));
      
      // Only refresh data, don't handle subscriptions
      dispatch(fetchNotifications(user.id))
        .finally(() => {
          // Reset force refresh flag
          dispatch(setForceRefresh(false));
        });
      return;
    }
    
    // If we get here, the dialog is managing its own subscriptions
    
    // Don't re-subscribe if already subscribed
    if (!isSubscribed) {
      dispatch(subscribeToNotifications(user.id));
      dialogSubscriptionCreatedRef.current = true;
    } else {
      // Just refresh the data if already subscribed
      // Force refresh to bypass debounce
      dispatch(setForceRefresh(true));
      
      dispatch(fetchNotifications(user.id))
        .finally(() => {
          // Reset force refresh flag
          dispatch(setForceRefresh(false));
        });
    }
    
    // Clean up when dialog closes, but only if we created the subscription
    return () => {
      if (!headerHandlesSubscription && dialogSubscriptionCreatedRef.current && isSubscribed) {
        
        dispatch(unsubscribeFromNotifications());
        dialogSubscriptionCreatedRef.current = false;
      }
      // Always reset force refresh flag when unmounting
      dispatch(setForceRefresh(false));
    };
  }, [dispatch, open, user, headerHandlesSubscription, isSubscribed, dialogSubscriptionCreatedRef]);

  const handleMarkAsRead = (notificationId) => {
    if (user) {
      dispatch(markNotificationAsRead({ notificationId, userId: user.id }));
    }
  };

  const handleMarkAllAsRead = () => {
    if (user) {
      dispatch(markAllNotificationsAsRead(user.id));
    }
  };

  const handleDeleteNotification = (notificationId) => {
    if (user) {
      dispatch(deleteNotification({ notificationId, userId: user.id }));
    }
  };

  const handleNotificationAction = (action, notificationId) => {
    switch (action) {
      case 'read':
        handleMarkAsRead(notificationId);
        break;
      case 'delete':
        handleDeleteNotification(notificationId);
        break;
      case 'accept':
        // Meeting invitation acceptance handled in NotificationItem
        break;
      case 'decline':
        // Meeting invitation rejection handled in NotificationItem
        break;
      default:
        break;
    }
  };

  // Format using relative time (e.g. "2 hours ago")
  const formatTime = (dateString) => {
    try {
      // First adjust the timestamp according to user timezone
      // This ensures the relative time is calculated from the user's perspective
      const adjustedDate = formatDateToUserTimezone 
        ? new Date(formatDateToUserTimezone(dateString, { dateStyle: undefined, timeStyle: undefined })) 
        : new Date(dateString);
      
      return formatDistanceToNow(adjustedDate, { 
        addSuffix: true,
        locale: locale === 'zh' ? zhCN : enUS
      });
    } catch (error) {
      console.error('Error formatting relative time:', error);
      return dateString;
    }
  };

  const getNotificationIcon = (type, notificationData) => {
    switch (type) {
      case 'TASK_ASSIGNED':
        return <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600"><Calendar className="h-4 w-4" /></div>;
      case 'COMMENT_ADDED':
        return <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-600"><MessageSquare className="h-4 w-4" /></div>;
      case 'MENTION':
        return <div className="w-8 h-8 rounded-full bg-yellow-100 flex items-center justify-center text-yellow-600"><User className="h-4 w-4" /></div>;
      case 'ADDED_TO_CHAT':
        return <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-600"><MessageSquare className="h-4 w-4" /></div>;
      case 'MEETING_INVITE':
        return <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-600"><Video className="h-4 w-4" /></div>;
      case 'TEAM_ANNOUNCEMENT':
        return <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600"><Bell className="h-4 w-4" /></div>;
      case 'SYSTEM':
        // Check if this is a meeting invitation
        try {
          if (notificationData) {
            const data = typeof notificationData === 'string' 
              ? JSON.parse(notificationData) 
              : notificationData;
            
            if (data.isMeetingInvitation) {
              return <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-600"><Video className="h-4 w-4" /></div>;
            }
          }
        } catch (e) {
          console.error('Error parsing notification data', e);
        }
        return <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-600"><Bell className="h-4 w-4" /></div>;
      default:
        return <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-600"><Bell className="h-4 w-4" /></div>;
    }
  };

  const filteredNotifications = activeTab === 'unread'
    ? notifications.filter(notification => !notification.is_read)
    : notifications;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md md:max-w-lg" hideCloseButton={true}>
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              {t('common.notifications')}
              {unreadCount > 0 && (
                <Badge variant="destructive" className="ml-2">
                  {unreadCount}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleMarkAllAsRead}
                  className="text-xs"
                >
                  <Check className="h-3 w-3 mr-1" />
                  {t('common.markAllAsRead')}
                </Button>
              )}
            </div>
          </DialogTitle>
        </DialogHeader>
        
        <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="all">{t('common.all')}</TabsTrigger>
            <TabsTrigger value="unread">
              {t('common.unread')}
              {unreadCount > 0 && ` (${unreadCount})`}
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="all" className="mt-2">
            <NotificationList 
              notifications={filteredNotifications}
              loading={loading}
              formatTime={formatTime}
              formatDateToUserTimezone={formatDateToUserTimezone}
              formatToUserTimezone={formatToUserTimezone}
              onAction={handleNotificationAction}
              t={t}
            />
          </TabsContent>
          
          <TabsContent value="unread" className="mt-2">
            <NotificationList 
              notifications={filteredNotifications}
              loading={loading}
              formatTime={formatTime}
              formatDateToUserTimezone={formatDateToUserTimezone}
              formatToUserTimezone={formatToUserTimezone}
              onAction={handleNotificationAction}
              t={t}
            />
          </TabsContent>
        </Tabs>
        
        <DialogFooter className="sm:justify-start">
          <Button 
            variant="secondary" 
            onClick={() => onOpenChange(false)}
          >
            {t('common.close')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Enhanced NotificationList with skeleton loading state
function NotificationList({ 
  notifications, 
  loading, 
  formatTime, 
  formatDateToUserTimezone,
  formatToUserTimezone,
  onAction,
  t
}) {
  if (loading) {
    return (
      <div className="space-y-4 py-2">
        {/* Show multiple skeletons with varying layouts */}
        {Array.from({ length: 3 }, (_, i) => (
          <NotificationItemSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (notifications.length === 0) {
    return (
      <div className="py-10 text-center">
        <BellOff className="h-10 w-10 mx-auto mb-2 text-muted-foreground" />
        <p className="text-muted-foreground">{t('common.noNotifications')}</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-[400px] pr-4">
      <div className="space-y-4 py-2">
        {notifications.map((notification) => (
          <NotificationItem 
            key={notification.id}
            notification={notification}
            onAction={onAction}
            formatDateToUserTimezone={formatDateToUserTimezone}
            formatToUserTimezone={formatToUserTimezone}
          />
        ))}
      </div>
    </ScrollArea>
  );
} 