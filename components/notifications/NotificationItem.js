import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatDistanceToNow } from 'date-fns';
import { Check, X, Bell, Calendar, User, MessageSquare, Video } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

export default function NotificationItem({ notification, onAction }) {
  const t = useTranslations('notifications');
  const tCalendar = useTranslations('Calendar');
  const tNotif = useTranslations('notificationCenter');
  const formatDate = (date) => {
    const d = new Date(date);
    return formatDistanceToNow(d, { addSuffix: true });
  };

  const handleMarkAsRead = async (id) => {
    try {
      const { error } = await supabase
        .from('notification')
        .update({ is_read: true })
        .eq('id', id);
      
      if (error) throw error;
      
      // 通知父组件更新状态
      if (onAction) onAction('read', id);
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  // 根据通知类型获取图标
  const getIcon = (type) => {
    switch (type) {
      case 'TASK_ASSIGNED':
        return <Calendar className="h-4 w-4" />;
      case 'COMMENT_ADDED':
        return <MessageSquare className="h-4 w-4" />;  
      case 'MENTION':
        return <User className="h-4 w-4" />;
      case 'SYSTEM':
        // 检查是否是会议邀请
        try {
          if (notification.data) {
            const data = typeof notification.data === 'string' 
              ? JSON.parse(notification.data) 
              : notification.data;
            
            if (data.isMeetingInvitation) {
              return <Video className="h-4 w-4" />;
            }
          }
        } catch (e) {
          console.error('Error parsing notification data', e);
        }
        return <Bell className="h-4 w-4" />;
      default:
        return <Bell className="h-4 w-4" />;
    }
  };

  // 处理notification.data字段
  const getMeetingData = () => {
    try {
      if (notification.data) {
        // 判断data是对象还是字符串
        if (typeof notification.data === 'object' && notification.data !== null) {
          return notification.data;
        } else if (typeof notification.data === 'string') {
          return JSON.parse(notification.data);
        }
      }
      return null;
    } catch (e) {
      console.error('Error parsing notification data', e);
      return null;
    }
  };

  // 检查是否是会议邀请
  const isMeetingInvitation = () => {
    const data = getMeetingData();
    return data && data.isMeetingInvitation;
  };

  // 检查会议是否已被拒绝
  const isMeetingDeclined = () => {
    const data = getMeetingData();
    return data && data.declined;
  };

  // 向邀请人发送通知
  const sendResponseNotification = async (meetData, isAccepted) => {
    if (!meetData || !meetData.inviterId) return;
    
    try {
      // 获取当前用户信息
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('未获取到用户信息');
      
      // 准备通知数据
      const notificationData = {
        user_id: meetData.inviterId,  // 通知发送给邀请人
        title: isAccepted 
          ? tNotif('meetingAccepted') 
          : tNotif('meetingDeclined'),
        content: `${user.user_metadata?.name || user.email} ${isAccepted 
          ? tNotif('acceptedYourMeeting') 
          : tNotif('declinedYourMeeting')} "${meetData.meetingTitle || '会议'}"`,
        type: 'SYSTEM',
        is_read: false,
        data: {
          responseToMeeting: true,
          meetingId: meetData.meetingId,
          meetingTitle: meetData.meetingTitle,
          responderName: user.user_metadata?.name || user.email,
          responderEmail: user.email,
          accepted: isAccepted,
          respondedAt: new Date().toISOString()
        }
      };
      
      // 发送通知
      const { error } = await supabase
        .from('notification')
        .insert(notificationData);
      
      if (error) throw error;
      
      console.log(`已向邀请人 ${meetData.inviterId} 发送${isAccepted ? '接受' : '拒绝'}会议通知`);
    } catch (error) {
      console.error('发送会议响应通知失败:', error);
    }
  };

  // 接受会议邀请
  const handleAcceptMeeting = async (id, meetData) => {
    try {
      await handleMarkAsRead(id);
      
      // 更新通知状态为已接受
      const updatedData = { ...meetData, accepted: true };
      
      const { error } = await supabase
        .from('notification')
        .update({ 
          data: updatedData  // Supabase将自动处理JSON序列化
        })
        .eq('id', id);
      
      if (error) throw error;
      
      // 向邀请人发送接受通知
      await sendResponseNotification(meetData, true);
      
      // 打开Google Meet链接
      if (meetData && meetData.meetLink) {
        window.open(meetData.meetLink, '_blank');
      }
      
      if (onAction) onAction('accept', id);
      toast.success(tNotif('meetingAccepted'));
    } catch (error) {
      console.error('接受会议邀请失败:', error);
      toast.error(t('actionFailed'));
    }
  };

  // 拒绝会议邀请
  const handleDeclineMeeting = async (id) => {
    try {
      const data = getMeetingData();
      if (!data) return;

      const updatedData = { ...data, declined: true };
      
      // 直接更新data字段
      const { error } = await supabase
        .from('notification')
        .update({ 
          is_read: true, 
          data: updatedData  // Supabase将自动处理JSON序列化
        })
        .eq('id', id);
      
      if (error) throw error;
      
      // 向邀请人发送拒绝通知
      await sendResponseNotification(data, false);
      
      // 通知父组件更新状态
      if (onAction) onAction('decline', id);
      toast.success(tCalendar('meetingDeclined'));
    } catch (error) {
      console.error('Failed to decline meeting:', error);
      toast.error(t('actionFailed'));
    }
  };

  // 解析会议数据
  const meetingData = getMeetingData();
  const isMeeting = isMeetingInvitation();
  const isDeclined = isMeetingDeclined();
  const isAccepted = meetingData && meetingData.accepted;

  return (
    <div className={cn(
      "p-3 flex items-start space-x-3 border-b hover:bg-accent/5 transition-colors cursor-pointer",
      !notification.is_read && "bg-primary/5"
    )}>
      <div className={cn(
        "p-2 rounded-full",
        !notification.is_read ? "bg-primary text-primary-foreground" : "bg-muted"
      )}>
        {getIcon(notification.type)}
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <p className={cn(
            "text-sm font-medium truncate",
            !notification.is_read && "font-semibold"
          )}>
            {notification.title}
          </p>
          <span className="text-xs text-muted-foreground whitespace-nowrap ml-2">
            {formatDate(notification.created_at)}
          </span>
        </div>
        
        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
          {notification.content}
        </p>
        
        {/* 针对会议邀请显示接受/拒绝按钮 */}
        {isMeeting && meetingData && !isDeclined && !isAccepted && (
          <div className="mt-2 flex space-x-2">
            <Button 
              size="sm" 
              variant="default" 
              className="h-8"
              onClick={(e) => {
                e.stopPropagation();
                handleAcceptMeeting(notification.id, meetingData);
              }}
            >
              <Check className="h-4 w-4 mr-1" />
              {tCalendar('accept')}
            </Button>
            
            <Button 
              size="sm" 
              variant="outline" 
              className="h-8"
              onClick={(e) => {
                e.stopPropagation();
                handleDeclineMeeting(notification.id);
              }}
            >
              <X className="h-4 w-4 mr-1" />
              {tCalendar('decline')}
            </Button>
          </div>
        )}
        
        {/* 如果会议已被接受 */}
        {isMeeting && meetingData && isAccepted && (
          <div className="mt-2">
            <span className="text-xs text-green-600 font-medium">
              {tNotif('meetingAccepted')}
            </span>
            {meetingData.meetLink && (
              <Button 
                size="sm" 
                variant="outline" 
                className="h-8 ml-2"
                onClick={(e) => {
                  e.stopPropagation();
                  window.open(meetingData.meetLink, '_blank');
                }}
              >
                <Video className="h-4 w-4 mr-1" />
                {tNotif('joinMeeting')}
              </Button>
            )}
          </div>
        )}
        
        {/* 如果会议已被拒绝 */}
        {isMeeting && meetingData && isDeclined && (
          <div className="mt-2">
            <span className="text-xs text-muted-foreground">
              {tCalendar('meetingDeclined')}
            </span>
          </div>
        )}
      </div>
      
      {!notification.is_read && (
        <Button 
          size="icon" 
          variant="ghost" 
          className="h-6 w-6 rounded-full"
          onClick={(e) => {
            e.stopPropagation();
            handleMarkAsRead(notification.id);
          }}
        >
          <Check className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
} 