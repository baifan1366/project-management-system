'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useTranslations } from 'use-intl';
import { formatDistanceToNow } from 'date-fns';
import { zhCN, enUS } from 'date-fns/locale';
import { useParams } from 'next/navigation';
import { Clock, FilePlus, FileText, MessageSquare, User, CheckCircle, XCircle, Edit, Trash2, Plus } from 'lucide-react';
import { useGetUser } from '@/lib/hooks/useGetUser';
import { Skeleton } from '@/components/ui/skeleton';
import globalEventBus, { createEventBus } from '@/lib/eventBus';

// 使用全局事件总线，如果不存在则创建一个空的事件处理器
const eventBus = globalEventBus || (typeof window !== 'undefined' ? createEventBus() : {
  on: () => () => {},
  emit: () => {}
});

// 定义事件名称常量
const TEAM_CREATED_EVENT = 'team:created';

export default function ActivityLog() {
  const t = useTranslations('Projects');
  const tLog = useTranslations('Projects.activityLog');
  const params = useParams();
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const locale = params.locale || 'en';
  const [userId, setUserId] = useState(null);
  const { user } = useGetUser(); 
  // 添加刷新触发器状态
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  
  // 监听团队创建事件
  useEffect(() => {
    // 监听团队创建事件，当事件触发时刷新活动日志
    const unsubscribe = eventBus.on(TEAM_CREATED_EVENT, () => {
      // 通过更新trigger状态值来触发活动日志刷新
      setRefreshTrigger(prev => prev + 1);
    });
    
    // 组件卸载时取消订阅
    return () => {
      unsubscribe();
    };
  }, []);
  
  // 获取当前用户ID
  useEffect(() => {
    async function getCurrentUser() {
      try {
        if (user) {
          setUserId(user.id);
        }
      } catch (err) {
        console.error('Error getting current user:', err);
      }
    }
    
    getCurrentUser();
  }, []);
  
  // 获取活动数据
  useEffect(() => {
    async function fetchActivities() {
      if (!userId) return;
      
      setLoading(true);
      try {
        const response = await fetch(`/api/projects/${params.id}/activity?userId=${userId}`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch activities');
        }
        
        const data = await response.json();
        setActivities(data.activities || []);
      } catch (err) {
        console.error('Error fetching activities:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    
    if (userId) {
      fetchActivities();
    }
  }, [params.id, userId, refreshTrigger]); // 添加refreshTrigger作为依赖项，以便在创建新团队时刷新
  
  // 获取活动图标
  const getActivityIcon = (actionType, entityType) => {
    if (entityType === 'projects') {
      switch (actionType) {
        case 'createProject':
          return <FilePlus className="h-4 w-4 text-green-500" />;
        default:
          return <FileText className="h-4 w-4 text-gray-500" />;
      }
    } else if (entityType === 'teams') {
      switch (actionType) {
        case 'createteam':
        case 'createTeam':
          return <Plus className="h-4 w-4 text-green-500" />;
        case 'updateTeam':
          return <Edit className="h-4 w-4 text-blue-500" />;
        default:
          return <FileText className="h-4 w-4 text-gray-500" />;
      }
    } else if (entityType === 'teamUserInv') {
      switch (actionType) {
        case 'create':
          return <Plus className="h-4 w-4 text-green-500" />;
        case 'updateStatus':
          return <Edit className="h-4 w-4 text-blue-500" />;
        default:
          return <FileText className="h-4 w-4 text-gray-500" />;
      }
    }
    
    return <Clock className="h-4 w-4 text-gray-500" />;
  };
  
  // 获取活动描述
  const getActivityDescription = (activity) => {
    const { action_type, entity_type, new_values } = activity;
    
    if (entity_type === 'projects') {
      switch (action_type) {
        case 'createProject':
          return `${tLog('project')} ${new_values?.project_name || ''} ${tLog('hasBeenCreated')}`;
        default:
          return `${action_type?.toLowerCase()} ${entity_type?.toLowerCase()}`;
      }
    } else if (entity_type === 'teams') {
      switch (action_type) {
        case 'createTeam':
          return `${tLog('team')} ${new_values?.name || ''} ${tLog('hasBeenCreated')}`;
        case 'updateTeam':
          return `${tLog('team')} ${new_values?.name || ''} ${tLog('detailsHasBeenUpdated')}`;
        default:
          return `${action_type?.toLowerCase()} ${entity_type?.toLowerCase()}`;
      }
    } else if (entity_type === 'teamUserInv') {
      switch (action_type) {
        case 'create':
          return `${tLog('teamInvitationSentTo')} ${new_values?.user_email || ''}.`;
        case 'updateStatus':
          return `${tLog('teamInvitationFor')} ${new_values?.user_email || ''} ${tLog('hasBeenUpdated')}`;
        default:
          return `${action_type?.toLowerCase()} ${entity_type?.toLowerCase()}`;
      }
    }
    
    return `${action_type?.toLowerCase()} ${entity_type?.toLowerCase()}`;
  };
  
  // 格式化时间
  const formatTime = (timestamp) => {
    try {
      const dateLocale = locale === 'zh' ? zhCN : enUS;
      
      // Get user's timezone-adjusted date if available through props
      // This would require adding a formatDateToUserTimezone prop to ActivityLog
      // For now, we'll use the raw timestamp which will show server time
      // In a future PR, we should pass the timezone utilities to this component
      
      return formatDistanceToNow(new Date(timestamp), { 
        addSuffix: true,
        locale: dateLocale
      });
    } catch (err) {
      console.error('Error formatting time:', err);
      return timestamp;
    }
  };
  
  // 获取用户头像显示
  const getUserInitials = (user) => {
    if (!user) return '?';
    if (user.avatar_url) return null; // 有头像时不显示缩写
    
    const name = user.name || '';
    return name.charAt(0).toUpperCase();
  };
  
  return (
    <Card className="max-h-[550px] overflow-y-auto">
      <CardHeader>
        <CardTitle>{t('recentActivity')}</CardTitle>
      </CardHeader>
      <CardContent>
        {!userId || loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-start gap-3">
                <Skeleton className="w-8 h-8 rounded-full" />
                <div className="flex-1">
                  <Skeleton className="h-4 w-3/4 mb-2" />
                  <Skeleton className="h-3 w-1/3" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="text-center text-red-500 py-4">{error}</div>
        ) : activities.length === 0 ? (
          <div className="text-center text-muted-foreground py-4">{t('noActivity')}</div>
        ) : (
          <div className="space-y-4">
            {activities.map((activity) => (
              <div key={activity.id} className="flex items-start gap-3">
                <div className="relative">
                  {activity.user?.avatar_url ? (
                    <img 
                      src={activity.user.avatar_url} 
                      alt={activity.user?.name || ''} 
                      className="w-8 h-8 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-medium text-primary">
                      {getUserInitials(activity.user)}
                    </div>
                  )}
                  <div className="absolute -right-1 -bottom-1 bg-white rounded-full p-0.5">
                    {getActivityIcon(activity.action_type, activity.entity_type)}
                  </div>
                </div>
                <div className="flex-1">
                  <p className="text-sm">
                    <span className="font-medium">{activity.user?.name || 'Unknown User'}</span>{' '}
                    {getActivityDescription(activity)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatTime(activity.created_at)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
} 