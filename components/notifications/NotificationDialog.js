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
  selectNotificationsLoading,
  selectIsSubscribed,
  unsubscribeFromNotifications
} from '@/lib/redux/features/notificationSlice';
import { formatDistanceToNow } from 'date-fns';
import { zhCN, enUS } from 'date-fns/locale';
import { Check, Trash, Bell, BellOff, Calendar, User, MessageSquare, Video } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import NotificationItem from '@/components/notifications/NotificationItem';

export function NotificationDialog({ open, onOpenChange }) {
  const t = useTranslations();
  const dispatch = useDispatch();
  const notifications = useSelector(selectNotifications);
  const unreadCount = useSelector(selectUnreadCount);
  const loading = useSelector(selectNotificationsLoading);
  const isSubscribed = useSelector(selectIsSubscribed);
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
          
          // 只在没有数据或订阅时获取通知
          if (notifications.length === 0 || !isSubscribed) {
            dispatch(fetchNotifications(session.user.id));
          }
        }
      };
      
      getUser();
    } else if (!open && isSubscribed) {
      // 对话框关闭后取消订阅，但不清除通知数据
      // 这样通知图标上的数字仍然会显示正确的未读数量
      dispatch(unsubscribeFromNotifications());
    }
  }, [dispatch, open, notifications.length, isSubscribed]);

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
        // 会议邀请接受后已在NotificationItem中处理
        break;
      case 'decline':
        // 会议邀请拒绝后已在NotificationItem中处理
        break;
      default:
        break;
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

  const getNotificationIcon = (type, notificationData) => {
    switch (type) {
      case 'TASK_ASSIGNED':
        return <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600"><Calendar className="h-4 w-4" /></div>;
      case 'COMMENT_ADDED':
        return <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-600"><MessageSquare className="h-4 w-4" /></div>;
      case 'MENTION':
        return <div className="w-8 h-8 rounded-full bg-yellow-100 flex items-center justify-center text-yellow-600"><User className="h-4 w-4" /></div>;
      case 'SYSTEM':
        // 检查是否是会议邀请
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
              onAction={handleNotificationAction}
              t={t}
            />
          </TabsContent>
          
          <TabsContent value="unread" className="mt-2">
            <NotificationList 
              notifications={filteredNotifications}
              loading={loading}
              formatTime={formatTime}
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

function NotificationList({ 
  notifications, 
  loading, 
  formatTime, 
  onAction,
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
          <NotificationItem 
            key={notification.id}
            notification={notification}
            onAction={onAction}
          />
        ))}
      </div>
    </ScrollArea>
  );
} 