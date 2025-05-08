import { Button } from "@/components/ui/button";
import { useGetUser } from '@/lib/hooks/useGetUser';
import { formatDistanceToNow } from 'date-fns';
import { Check, X, Bell, Calendar, User, MessageSquare, Video } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { useState, useEffect } from 'react';

export default function NotificationItem({ notification, onAction }) {
  const t = useTranslations('notifications');
  const tCalendar = useTranslations('Calendar');
  const tNotif = useTranslations('notificationCenter');
  
  // Add state to track meeting invitation status
  const [localMeetingData, setLocalMeetingData] = useState(null);
  const [localIsDeclined, setLocalIsDeclined] = useState(false);
  const [localIsAccepted, setLocalIsAccepted] = useState(false);
  
  // Initialize local state
  useEffect(() => {
    const data = getMeetingData();
    setLocalMeetingData(data);
    setLocalIsDeclined(data && data.declined);
    setLocalIsAccepted(data && data.accepted);
  }, [notification]);
  
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
      
      // Notify parent component to update state
      if (onAction) onAction('read', id);
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  // Get icon based on notification type
  const getIcon = (type) => {
    switch (type) {
      case 'TASK_ASSIGNED':
        return <Calendar className="h-4 w-4" />;
      case 'COMMENT_ADDED':
        return <MessageSquare className="h-4 w-4" />;  
      case 'MENTION':
        return <User className="h-4 w-4" />;
      case 'SYSTEM':
        // Check if this is a meeting invitation
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

  // Process notification.data field
  const getMeetingData = () => {
    try {
      if (notification.data) {
        // Determine if data is an object or string
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

  // Check if this is a meeting invitation
  const isMeetingInvitation = () => {
    const data = getMeetingData();
    return data && data.isMeetingInvitation;
  };

  // Check if meeting has been declined
  const isMeetingDeclined = () => {
    const data = getMeetingData();
    return data && data.declined;
  };

  // Send notification to the inviter
  const sendResponseNotification = async (meetData, isAccepted) => {
    if (!meetData || !meetData.inviterId) return;
    
    try {
      // Get current user information
      const { user } = useGetUser();
      if (!user) throw new Error('Failed to get user information');
      
      // Prepare notification data
      const notificationData = {
        user_id: meetData.inviterId,  // Send notification to the inviter
        title: isAccepted 
          ? tNotif('meetingAccepted') 
          : tNotif('meetingDeclined'),
        content: `${user.name || user.email} ${isAccepted 
          ? tNotif('acceptedYourMeeting') 
          : tNotif('declinedYourMeeting')} "${meetData.meetingTitle || 'meeting'}"`,
        type: 'SYSTEM',
        is_read: false,
        data: {
          responseToMeeting: true,
          meetingId: meetData.meetingId,
          meetingTitle: meetData.meetingTitle,
          responderName: user.name || user.email,
          responderEmail: user.email,
          accepted: isAccepted,
          respondedAt: new Date().toISOString()
        }
      };
      
      // Send notification
      const { error } = await supabase
        .from('notification')
        .insert(notificationData);
      
      if (error) throw error;
      
      console.log(`Sent ${isAccepted ? 'acceptance' : 'decline'} notification to inviter ${meetData.inviterId}`);
    } catch (error) {
      console.error('Failed to send meeting response notification:', error);
    }
  };

  // Accept meeting invitation
  const handleAcceptMeeting = async (id, meetData) => {
    try {
      await handleMarkAsRead(id);
      
      // Update notification status to accepted
      const updatedData = { ...meetData, accepted: true };
      
      const { error } = await supabase
        .from('notification')
        .update({ 
          data: updatedData  // Supabase will handle JSON serialization automatically
        })
        .eq('id', id);
      
      if (error) throw error;
      
      // Update local state
      setLocalMeetingData(updatedData);
      setLocalIsAccepted(true);
      
      // Send acceptance notification to the inviter
      await sendResponseNotification(meetData, true);
      
      // Open Google Meet link
      if (meetData && meetData.meetLink) {
        window.open(meetData.meetLink, '_blank');
      }
      
      if (onAction) onAction('accept', id);
      toast.success(tNotif('meetingAccepted'));
    } catch (error) {
      console.error('Failed to accept meeting invitation:', error);
      toast.error(t('actionFailed'));
    }
  };

  // Decline meeting invitation
  const handleDeclineMeeting = async (id) => {
    try {
      const data = getMeetingData();
      if (!data) return;

      const updatedData = { ...data, declined: true };
      
      // Update data field directly
      const { error } = await supabase
        .from('notification')
        .update({ 
          is_read: true, 
          data: updatedData  // Supabase will handle JSON serialization automatically
        })
        .eq('id', id);
      
      if (error) throw error;
      
      // Update local state
      setLocalMeetingData(updatedData);
      setLocalIsDeclined(true);
      
      // Send decline notification to the inviter
      await sendResponseNotification(data, false);
      
      // Notify parent component to update state
      if (onAction) onAction('decline', id);
      toast.success(tCalendar('meetingDeclined'));
    } catch (error) {
      console.error('Failed to decline meeting:', error);
      toast.error(t('actionFailed'));
    }
  };

  // Parse meeting data
  const meetingData = localMeetingData || getMeetingData();
  const isMeeting = isMeetingInvitation();
  const isDeclined = localIsDeclined || isMeetingDeclined();
  const isAccepted = localIsAccepted || (meetingData && meetingData.accepted);

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
        
        {/* For meeting invitation display accept/decline buttons */}
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
        
        {/* If meeting has been accepted */}
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
        
        {/* If meeting has been declined */}
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