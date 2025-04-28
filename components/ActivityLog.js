'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useTranslations } from 'use-intl';
import { formatDistanceToNow } from 'date-fns';
import { zhCN, enUS } from 'date-fns/locale';
import { useParams } from 'next/navigation';
import { Clock, FilePlus, FileText, MessageSquare, User, CheckCircle, XCircle, Edit, Trash2, Plus } from 'lucide-react';
import { useGetUser } from '@/lib/hooks/useGetUser';

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
  }, [params.id, userId]);
  
  // 获取活动图标
  const getActivityIcon = (actionType, entityType) => {
    if (entityType === 'task') {
      switch (actionType) {
        case 'CREATE':
          return <FilePlus className="h-4 w-4 text-green-500" />;
        case 'UPDATE':
          return <Edit className="h-4 w-4 text-blue-500" />;
        case 'DELETE':
          return <Trash2 className="h-4 w-4 text-red-500" />;
        case 'COMPLETE':
          return <CheckCircle className="h-4 w-4 text-green-500" />;
        case 'COMMENT':
          return <MessageSquare className="h-4 w-4 text-purple-500" />;
        default:
          return <FileText className="h-4 w-4 text-gray-500" />;
      }
    } else if (entityType === 'team') {
      switch (actionType) {
        case 'CREATE':
          return <Plus className="h-4 w-4 text-green-500" />;
        case 'UPDATE':
          return <Edit className="h-4 w-4 text-blue-500" />;
        case 'DELETE':
          return <Trash2 className="h-4 w-4 text-red-500" />;
        case 'JOIN':
          return <User className="h-4 w-4 text-blue-500" />;
        case 'LEAVE':
          return <XCircle className="h-4 w-4 text-red-500" />;
        default:
          return <FileText className="h-4 w-4 text-gray-500" />;
      }
    }
    
    return <Clock className="h-4 w-4 text-gray-500" />;
  };
  
  // 获取活动描述
  const getActivityDescription = (activity) => {
    const { action_type, entity_type, new_values } = activity;
    
    if (entity_type === 'task') {
      switch (action_type) {
        case 'CREATE':
          return `${tLog('createdTask')} ${new_values?.title || ''}`;
        case 'UPDATE':
          return `${tLog('updatedTask')} ${new_values?.title || ''}`;
        case 'DELETE':
          return `${tLog('deletedTask')} ${new_values?.title || ''}`;
        case 'COMPLETE':
          return `${tLog('completedTask')} ${new_values?.title || ''}`;
        case 'COMMENT':
          return `${tLog('addedComment')} ${new_values?.title || ''}`;
        case 'ASSIGN':
          return `${tLog('assignedTask')} ${new_values?.title || ''}`;
        default:
          return `${action_type?.toLowerCase()} ${entity_type?.toLowerCase()}`;
      }
    } else if (entity_type === 'team') {
      switch (action_type) {
        case 'CREATE':
          return `${tLog('createdTeam')} ${new_values?.name || ''}`;
        case 'UPDATE':
          return `${tLog('updatedTeam')} ${new_values?.name || ''}`;
        case 'JOIN':
          return `${tLog('joinedTeam')} ${new_values?.name || ''}`;
        case 'LEAVE':
          return `${tLog('leftTeam')} ${new_values?.name || ''}`;
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
    <Card className="h-full">
      <CardHeader>
        <CardTitle>{t('recentActivity')}</CardTitle>
      </CardHeader>
      <CardContent>
        {!userId || loading ? (
          <div className="flex justify-center items-center h-40">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
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