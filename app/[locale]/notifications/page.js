'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bell, BellOff } from "lucide-react";
import { supabase } from '@/lib/supabase';
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
  deleteNotification,
  selectNotifications,
  selectUnreadCount,
  selectNotificationsLoading,
  selectIsSubscribed,
  unsubscribeFromNotifications
} from '@/lib/redux/features/notificationSlice';
import NotificationItem from '@/components/notifications/NotificationItem';
import { useRouter } from 'next/navigation';

export default function NotificationsPage() {
  const t = useTranslations();
  const dispatch = useDispatch();
  const router = useRouter();
  const notifications = useSelector(selectNotifications);
  const unreadCount = useSelector(selectUnreadCount);
  const loading = useSelector(selectNotificationsLoading);
  const isSubscribed = useSelector(selectIsSubscribed);
  const [activeTab, setActiveTab] = useState('all');
  const [user, setUser] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const getUser = async () => {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          throw sessionError;
        }
        
        if (!session || !session.user) {
          console.warn('用户未登录，重定向到登录页面');
          router.push('/login');
          return;
        }
        
        console.log('获取到用户ID:', session.user.id);
        setUser(session.user);
        
        // 直接获取通知，同时会建立订阅
        dispatch(fetchNotifications(session.user.id));
      } catch (err) {
        console.error('获取用户会话失败:', err);
        setError(err.message);
      }
    };
    
    getUser();
    
    // 组件卸载时清理订阅
    return () => {
      console.log('通知页面卸载，清理订阅');
      dispatch(unsubscribeFromNotifications());
    };
  }, [dispatch, router]);

  const handleMarkAllAsRead = () => {
    if (user) {
      dispatch(markAllNotificationsAsRead(user.id));
    }
  };

  const handleNotificationAction = (action, notificationId) => {
    if (!user) return;
    
    switch (action) {
      case 'read':
        dispatch(markNotificationAsRead({ notificationId, userId: user.id }));
        break;
      case 'delete':
        dispatch(deleteNotification({ notificationId, userId: user.id }));
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

  const filteredNotifications = activeTab === 'unread'
    ? notifications.filter(notification => !notification.is_read)
    : notifications;

  // 显示错误信息
  if (error) {
    return (
      <div className="container max-w-5xl py-8">
        <Card className="h-[calc(100vh-120px)] flex flex-col">
          <CardHeader>
            <CardTitle>{t('common.error')}</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 flex items-center justify-center">
            <p>{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container max-w-5xl py-8">
      <Card className="h-[calc(100vh-120px)] flex flex-col overflow-hidden">
        <CardHeader className="flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                {t('common.notifications')}
                {unreadCount > 0 && (
                  <Badge variant="destructive">
                    {unreadCount}
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>
                {t('notificationCenter.description')}
                {isSubscribed && (
                  <Badge variant="outline" className="ml-2 text-xs bg-green-50">
                    {t('common.connected')}
                  </Badge>
                )}
              </CardDescription>
            </div>
            <div>
              {unreadCount > 0 && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleMarkAllAsRead}
                >
                  <Badge variant="outline" className="mr-1">{unreadCount}</Badge>
                  {t('common.markAllAsRead')}
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex-1 overflow-hidden">
          <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
            <TabsList className="grid w-full grid-cols-2 mb-4 flex-shrink-0">
              <TabsTrigger value="all">{t('common.all')}</TabsTrigger>
              <TabsTrigger value="unread">
                {t('common.unread')}
                {unreadCount > 0 && ` (${unreadCount})`}
              </TabsTrigger>
            </TabsList>
            
            <div className="flex-1 overflow-hidden">
              <NotificationList 
                notifications={filteredNotifications}
                loading={loading}
                onAction={handleNotificationAction}
                t={t}
              />
            </div>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

function NotificationList({ notifications, loading, onAction, t }) {
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
    <ScrollArea className="h-full pr-2">
      <div className="space-y-3 pb-4">
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