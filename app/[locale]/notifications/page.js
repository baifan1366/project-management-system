'use client';

import { useState, useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Bell, 
  BellOff, 
  Settings, 
  CheckCircle, 
  AlertCircle, 
  Info, 
  Calendar,
  MessageSquare,
  User,
  Video
} from "lucide-react";
import useGetUser from '@/lib/hooks/useGetUser';
import { useUserTimezone } from '@/hooks/useUserTimezone';
import { useDispatch, useSelector } from 'react-redux';
import {
  markAllNotificationsAsRead,
  markNotificationAsRead,
  deleteNotification,
  selectNotifications,
  selectUnreadCount,
  selectNotificationsLoading
} from '@/lib/redux/features/notificationSlice';
import NotificationItem, { NotificationItemSkeleton } from '@/components/notifications/NotificationItem';
import { useRouter } from 'next/navigation';
import { Skeleton } from '@/components/ui/skeleton';

export default function NotificationsPage() {
  const t = useTranslations();
  const dispatch = useDispatch();
  const router = useRouter();
  const notifications = useSelector(selectNotifications);
  const unreadCount = useSelector(selectUnreadCount);
  const loading = useSelector(selectNotificationsLoading);
  const [activeTab, setActiveTab] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const { user, error } = useGetUser();
  const hasInitiatedFetchRef = useRef(false);
  const { formatDateToUserTimezone, formatToUserTimezone } = useUserTimezone();

  // Reset fetch flag on component mount
  useEffect(() => {
    hasInitiatedFetchRef.current = false;
    return () => {
      // Ensure flag is reset when component unmounts
      hasInitiatedFetchRef.current = false;
    };
  }, []);

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
        // Meeting invite acceptance handled in NotificationItem
        break;
      case 'decline':
        // Meeting invite rejection handled in NotificationItem
        break;
      default:
        break;
    }
  };

  // First filter by read status
  let filteredByReadStatus = activeTab === 'unread'
    ? notifications.filter(notification => !notification.is_read)
    : notifications;

  // Then filter by type
  const filteredNotifications = filterType === 'all' 
    ? filteredByReadStatus 
    : filteredByReadStatus.filter(notification => notification.type === filterType);

  // Get available notification types
  const notificationTypes = Array.from(
    new Set(notifications.map(notification => notification.type))
  );

  // Display error message
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

  // Get icon for notification type
  const getTypeIcon = (type) => {
    switch(type) {
      case 'task': return <div className="flex items-center justify-center"><CheckCircle className="h-4 w-4" /></div>;
      case 'meeting': return <div className="flex items-center justify-center"><Calendar className="h-4 w-4" /></div>;
      case 'alert': return <div className="flex items-center justify-center"><AlertCircle className="h-4 w-4" /></div>;
      case 'TASK_ASSIGNED': return <div className="flex items-center justify-center"><CheckCircle className="h-4 w-4" /></div>;
      case 'COMMENT_ADDED': return <div className="flex items-center justify-center"><MessageSquare className="h-4 w-4" /></div>;
      case 'MENTION': return <div className="flex items-center justify-center"><User className="h-4 w-4" /></div>;
      case 'ADDED_TO_CHAT': return <div className="flex items-center justify-center"><MessageSquare className="h-4 w-4" /></div>;
      case 'MEETING_INVITE': return <div className="flex items-center justify-center"><Video className="h-4 w-4" /></div>;
      case 'TEAM_ANNOUNCEMENT': return <div className="flex items-center justify-center"><Bell className="h-4 w-4" /></div>;
      case 'SYSTEM': return <div className="flex items-center justify-center"><Info className="h-4 w-4" /></div>;
      default: return <div className="flex items-center justify-center"><Info className="h-4 w-4" /></div>;
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
        {/* Side filters */}
        <div className="md:col-span-3">
          <Card className="border shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-medium">
                {t('common.filters')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                // Skeleton for filters while loading
                <div className="space-y-4 animate-pulse">
                  <div>
                    <Skeleton className="h-4 w-24 mb-2" />
                    <div className="grid grid-cols-2 gap-2">
                      <Skeleton className="h-8 w-full rounded-md" />
                      <Skeleton className="h-8 w-full rounded-md" />
                    </div>
                  </div>
                  
                  <div>
                    <Skeleton className="h-4 w-16 mb-2" />
                    <div className="space-y-1">
                      <Skeleton className="h-8 w-full rounded-md" />
                      <Skeleton className="h-8 w-full rounded-md" />
                      <Skeleton className="h-8 w-full rounded-md" />
                    </div>
                  </div>
                  
                  <Skeleton className="h-8 w-full rounded-md mt-4" />
                </div>
              ) : (
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
                        className="justify-start dark:text-white"
                      >
                        <Badge variant="outline" className="mr-2 dark:text-white">{unreadCount}</Badge>
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
              )}
            </CardContent>
          </Card>
        </div>

        {/* Main content area */}
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
                  formatDateToUserTimezone={formatDateToUserTimezone}
                  formatToUserTimezone={formatToUserTimezone}
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

// Enhanced NotificationList with skeleton loading
function NotificationList({ notifications, loading, onAction, t, formatDateToUserTimezone, formatToUserTimezone }) {
  if (loading) {
    return (
      <div className="space-y-4 pr-2">
        {/* Show multiple skeletons to simulate a list of notifications */}
        {Array.from({ length: 8 }, (_, i) => (
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
    <ScrollArea className="h-full pr-4">
      <div className="space-y-3 pb-4 pr-2">
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