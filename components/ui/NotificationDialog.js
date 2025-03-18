'use client';

import { useState, useEffect } from 'react';
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
  selectNotificationsLoading
} from '@/lib/redux/features/notificationSlice';
import { formatDistanceToNow } from 'date-fns';
import { zhCN, enUS } from 'date-fns/locale';
import { Check, Trash, Bell, BellOff } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export function NotificationDialog({ open, onOpenChange }) {
  const t = useTranslations();
  const dispatch = useDispatch();
  const notifications = useSelector(selectNotifications);
  const unreadCount = useSelector(selectUnreadCount);
  const loading = useSelector(selectNotificationsLoading);
  const [activeTab, setActiveTab] = useState('all');
  const [user, setUser] = useState(null);
  const [locale, setLocale] = useState('zh');

  useEffect(() => {
    if (open) {
      const getUser = async () => {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (session?.user) {
          setUser(session.user);
          setLocale(session.user.user_metadata?.language || 'zh');
          if (notifications.length === 0) {
            dispatch(fetchNotifications(session.user.id));
          }
        }
      };
      
      getUser();
    }
  }, [dispatch, open, notifications.length]);

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

  const formatTime = (dateString) => {
    try {
      const date = new Date(dateString);
      return formatDistanceToNow(date, { 
        addSuffix: true,
        locale: locale === 'zh' ? zhCN : enUS
      });
    } catch (error) {
      return dateString;
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'TASK_ASSIGNED':
        return <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">📋</div>;
      case 'COMMENT_ADDED':
        return <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-600">💬</div>;
      case 'MENTION':
        return <div className="w-8 h-8 rounded-full bg-yellow-100 flex items-center justify-center text-yellow-600">@</div>;
      case 'DUE_DATE':
        return <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center text-red-600">⏰</div>;
      case 'TEAM_INVITATION':
        return <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-600">👥</div>;
      case 'SYSTEM':
      default:
        return <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-600">🔔</div>;
    }
  };

  const filteredNotifications = activeTab === 'unread'
    ? notifications.filter(notification => !notification.is_read)
    : notifications;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md md:max-w-lg">
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
              getNotificationIcon={getNotificationIcon}
              onMarkAsRead={handleMarkAsRead}
              onDelete={handleDeleteNotification}
              t={t}
            />
          </TabsContent>
          
          <TabsContent value="unread" className="mt-2">
            <NotificationList 
              notifications={filteredNotifications}
              loading={loading}
              formatTime={formatTime}
              getNotificationIcon={getNotificationIcon}
              onMarkAsRead={handleMarkAsRead}
              onDelete={handleDeleteNotification}
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

function NotificationList({ 
  notifications, 
  loading, 
  formatTime, 
  getNotificationIcon, 
  onMarkAsRead, 
  onDelete,
  t
}) {
  if (loading) {
    return (
      <div className="py-10 text-center">
        <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full mx-auto mb-2"></div>
        <p className="text-muted-foreground">{t('common.loading')}</p>
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
          <div 
            key={notification.id} 
            className={`flex items-start gap-3 p-3 rounded-lg transition-colors ${
              notification.is_read ? 'bg-background' : 'bg-muted/50'
            }`}
          >
            {getNotificationIcon(notification.type)}
            
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <h4 className={`font-medium text-sm ${!notification.is_read && 'font-semibold'}`}>
                  {notification.title}
                </h4>
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  {formatTime(notification.created_at)}
                </span>
              </div>
              <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                {notification.content}
              </p>
            </div>
            
            <div className="flex flex-col gap-1">
              {!notification.is_read && (
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-7 w-7" 
                  onClick={() => onMarkAsRead(notification.id)}
                  title={t('common.markAsRead')}
                >
                  <Check className="h-4 w-4" />
                </Button>
              )}
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-7 w-7 text-destructive" 
                onClick={() => onDelete(notification.id)}
                title={t('common.delete')}
              >
                <Trash className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
} 