'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Bell, 
  BellOff, 
  Settings, 
  Filter,
  CheckCircle, 
  AlertCircle, 
  Info, 
  Calendar
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { supabase } from '@/lib/supabase';
import { useDispatch, useSelector } from 'react-redux';
import Link from 'next/link';
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
  const [filterType, setFilterType] = useState('all');
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

  // 首先按未读/全部筛选
  let filteredByReadStatus = activeTab === 'unread'
    ? notifications.filter(notification => !notification.is_read)
    : notifications;

  // 然后按类型筛选
  const filteredNotifications = filterType === 'all' 
    ? filteredByReadStatus 
    : filteredByReadStatus.filter(notification => notification.type === filterType);

  // 获取可用的通知类型
  const notificationTypes = Array.from(
    new Set(notifications.map(notification => notification.type))
  );

  // 显示错误信息
  if (error) {
    return (
      <div className="container py-4 md:py-8">
        <Card className="border shadow-sm">
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

  // 获取通知类型对应的图标
  const getTypeIcon = (type) => {
    switch(type) {
      case 'task': return <CheckCircle className="h-4 w-4" />;
      case 'meeting': return <Calendar className="h-4 w-4" />;
      case 'alert': return <AlertCircle className="h-4 w-4" />;
      case 'TASK_ASSIGNED': return <CheckCircle className="h-4 w-4" />;
      case 'COMMENT_ADDED': return <Info className="h-4 w-4" />;
      case 'MENTION': return <Info className="h-4 w-4" />;
      case 'SYSTEM': return <Info className="h-4 w-4" />;
      default: return <Info className="h-4 w-4" />;
    }
  };

  return (
    <div className="container p-6 md:py-8">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">{t('common.notifications')}</h1>
        <Button variant="outline" size="sm" onClick={() => router.push('/settings/notifications')}>
          <Settings className="mr-2 h-4 w-4" />
          {t('common.settings')}
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-12">
        {/* 侧边过滤器 */}
        <div className="md:col-span-3">
          <Card className="border shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-medium">
                {t('common.filters')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium mb-2">{t('common.status')}</h3>
                  <div className="grid grid-cols-2 gap-2">
                    <Button 
                      variant={activeTab === 'all' ? 'default' : 'outline'} 
                      size="sm" 
                      onClick={() => setActiveTab('all')}
                      className="justify-start"
                    >
                      <Bell className="mr-2 h-4 w-4" />
                      {t('common.all')}
                    </Button>
                    <Button 
                      variant={activeTab === 'unread' ? 'default' : 'outline'} 
                      size="sm" 
                      onClick={() => setActiveTab('unread')}
                      className="justify-start"
                    >
                      <Badge variant="outline" className="mr-2">{unreadCount}</Badge>
                      {t('common.unread')}
                    </Button>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-medium mb-2">{t('common.type')}</h3>
                  <div className="space-y-1">
                    <Button 
                      variant={filterType === 'all' ? 'default' : 'outline'} 
                      size="sm" 
                      onClick={() => setFilterType('all')}
                      className="w-full justify-start"
                    >
                      <Info className="mr-2 h-4 w-4" />
                      {t('common.all')}
                    </Button>
                    
                    {notificationTypes.map(type => (
                      <Button 
                        key={type}
                        variant={filterType === type ? 'default' : 'outline'} 
                        size="sm" 
                        onClick={() => setFilterType(type)}
                        className="w-full justify-start"
                      >
                        {getTypeIcon(type)}
                        <span className="ml-2 capitalize">
                          {t(`notifications.types.${type}`, { fallback: type })}
                        </span>
                      </Button>
                    ))}
                  </div>
                </div>

                {unreadCount > 0 && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleMarkAllAsRead}
                    className="w-full"
                  >
                    {t('common.markAllAsRead')}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 主要内容区 */}
        <div className="md:col-span-9">
          <Card className="border shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle className="flex items-center gap-2">
                  {activeTab === 'unread' ? t('common.unread') : t('common.notifications')}
                  {unreadCount > 0 && activeTab !== 'unread' && (
                    <Badge variant="destructive">
                      {unreadCount}
                    </Badge>
                  )}
                </CardTitle>
                <CardDescription>
                  {filterType !== 'all' ? (
                    <>
                      {t('notificationCenter.filterDescription')} 
                      <span className="font-medium capitalize"> 
                        {t(`notifications.types.${filterType}`, { fallback: filterType })}
                      </span>
                    </>
                  ) : (
                    t('notificationCenter.description')
                  )}
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-[calc(100vh-280px)] overflow-hidden">
                <NotificationList 
                  notifications={filteredNotifications}
                  loading={loading}
                  onAction={handleNotificationAction}
                  t={t}
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
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