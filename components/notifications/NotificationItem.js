import { Button } from "@/components/ui/button";
import { useGetUser } from '@/lib/hooks/useGetUser';
import { formatDistanceToNow } from 'date-fns';
import { Check, X, Bell, Calendar, User, MessageSquare, Video, ExternalLink, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip';
import { Skeleton } from "@/components/ui/skeleton";

// Notification Item Skeleton Component
export const NotificationItemSkeleton = () => {
  // Randomly determine if we should show action buttons (like a meeting invitation)
  const showActions = Math.random() > 0.6;
  // Randomly determine if we should show a link
  const showLink = Math.random() > 0.7;

  return (
    <Card className="border bg-card/50 shadow-sm transition-all">
      <CardContent className="p-4">
        <div className="flex gap-3">
          {/* Icon placeholder */}
          <Skeleton className="w-8 h-8 rounded-full flex-shrink-0" />
          
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="w-full">
                {/* Title placeholder */}
                <Skeleton className="h-4 w-3/4 mb-2" />
                {/* Content placeholder - multi-line */}
                <Skeleton className="h-3 w-full mb-1.5" />
                <Skeleton className="h-3 w-5/6" />
              </div>
              
              {/* Action buttons */}
              <div className="flex flex-shrink-0 gap-1">
                <Skeleton className="h-7 w-7 rounded-md" />
                <Skeleton className="h-7 w-7 rounded-md" />
              </div>
            </div>
            
            {/* Meeting action buttons (randomly shown) */}
            {showActions && (
              <div className="mt-2 flex space-x-2">
                <Skeleton className="h-7 w-16 rounded-md" />
                <Skeleton className="h-7 w-16 rounded-md" />
              </div>
            )}
            
            {/* Link placeholder (randomly shown) */}
            {showLink && (
              <div className="mt-2">
                <Skeleton className="h-3 w-24 rounded-sm" />
              </div>
            )}
            
            {/* Timestamp placeholder */}
            <div className="mt-2">
              <Skeleton className="h-3 w-16 rounded-sm" />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default function NotificationItem({ notification, onAction, formatDateToUserTimezone, formatToUserTimezone }) {
  const t = useTranslations('notifications');
  const tCalendar = useTranslations('Calendar');
  const tNotif = useTranslations('notificationCenter');
  const { user } = useGetUser();
  const router = useRouter();
  
  // Add state to track meeting invitation status
  const [localMeetingData, setLocalMeetingData] = useState(null);
  const [localIsDeclined, setLocalIsDeclined] = useState(false);
  const [localIsAccepted, setLocalIsAccepted] = useState(false);
  const [isActioning, setIsActioning] = useState(false);
  
  // Initialize local state
  useEffect(() => {
    const data = getMeetingData();
    setLocalMeetingData(data);
    setLocalIsDeclined(data && data.declined);
    setLocalIsAccepted(data && data.accepted);
  }, [notification]);
  
  // Format using relative time (e.g. "2 hours ago")
  const formatDate = (date) => {
    if (!date) return '';
    
    try {
      // First adjust the timestamp according to user timezone
      // This ensures the relative time is calculated from the user's perspective
      const adjustedDate = formatDateToUserTimezone 
        ? new Date(formatDateToUserTimezone(date, { dateStyle: undefined, timeStyle: undefined })) 
        : new Date(date);
      
      return formatDistanceToNow(adjustedDate, { addSuffix: true });
    } catch (error) {
      console.error('Error formatting relative time:', error);
      return formatDistanceToNow(new Date(date), { addSuffix: true });
    }
  };

  // Format exact date and time using user's timezone
  const formatExactTime = (date) => {
    if (!formatDateToUserTimezone) {
      // Fallback if timezone formatting function isn't available
      return new Date(date).toLocaleString();
    }
    return formatDateToUserTimezone(date);
  };

  const handleMarkAsRead = async (e) => {
    e.stopPropagation();
    setIsActioning(true);
    try {
      const { error } = await supabase
        .from('notification')
        .update({ is_read: true })
        .eq('id', notification.id);
      
      if (error) throw error;
      
      // Notify parent component to update state
      if (onAction) onAction('read', notification.id);
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    } finally {
      setTimeout(() => setIsActioning(false), 500);
    }
  };

  // Get icon based on notification type
  const getIcon = (type) => {
    switch (type) {
      case 'TASK_ASSIGNED':
        return <div className="bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 p-2 rounded-full">{/* Task icon */}</div>;
      case 'COMMENT_ADDED':
        return <div className="bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300 p-2 rounded-full">{/* Comment icon */}</div>;
      case 'MENTION':
        return <div className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 p-2 rounded-full">{/* Mention icon */}</div>;
      case 'SYSTEM':
        // Check if this is a meeting invitation
        try {
          if (notification.data) {
            const data = typeof notification.data === 'string' 
              ? JSON.parse(notification.data) 
              : notification.data;
            
            if (data.isMeetingInvitation) {
              return <div className="bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 p-2 rounded-full">{/* System icon */}</div>;
            }
          }
        } catch (e) {
          console.error('Error parsing notification data', e);
        }
        return <div className="bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 p-2 rounded-full">{/* Default icon */}</div>;
      default:
        return <div className="bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 p-2 rounded-full">{/* Default icon */}</div>;
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

  // Send notification to the inviter when a user accepts or declines a meeting invitation
  // This creates a new notification in the database for the person who sent the original invitation
  // letting them know whether their invitation was accepted or declined
  const sendResponseNotification = async (meetData, isAccepted) => {
    if (!meetData || !meetData.inviterId) return;
    
    try {
      // Check if we have user information
      if (!user) throw new Error('Failed to get user information');
      
      // Prepare notification data
      const notificationData = {
        user_id: meetData.inviterId,  // Send notification to the inviter
        title: isAccepted 
          ? tNotif('meetingAccepted') 
          : tNotif('meetingDeclined'),
        content: `${user.name || user.email} ${isAccepted 
          ? tNotif('acceptedYourMeeting') 
          : tNotif('declinedYourMeeting')} "${meetData.eventTitle || 'meeting'}"`,
        type: 'SYSTEM',
        is_read: false,
        data: {
          responseToMeeting: true,
          meetingId: meetData.eventId,
          meetingTitle: meetData.eventTitle,
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
      
      
    } catch (error) {
      console.error('Failed to send meeting response notification:', error);
    }
  };

  // Accept meeting invitation
  const handleAcceptMeeting = async (e, id, meetData) => {
    e.stopPropagation();
    try {
      setIsActioning(true);
      
      // Mark as read
      await handleMarkAsRead(e);
      
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
      
      const toastId = toast.success(tNotif('meetingAccepted'));
      
      // Automatically dismiss the toast after 3 seconds
      setTimeout(() => {
        toast.dismiss(toastId);
      }, 3000);
    } catch (error) {
      console.error('Failed to accept meeting invitation:', error);
      toast.error(t('actionFailed'));
    } finally {
      setTimeout(() => setIsActioning(false), 500);
    }
  };

  // Decline meeting invitation
  const handleDeclineMeeting = async (e, id) => {
    e.stopPropagation();
    try {
      setIsActioning(true);
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
      
      const toastId = toast.success(tCalendar('meetingDeclined'));
      
      // Automatically dismiss the toast after 3 seconds
      setTimeout(() => {
        toast.dismiss(toastId);
      }, 3000);
    } catch (error) {
      console.error('Failed to decline meeting:', error);
      const toastId = toast.error(t('actionFailed'));
      setTimeout(() => toast.dismiss(toastId), 3000);
    } finally {
      setTimeout(() => setIsActioning(false), 500);
    }
  };

  // Parse meeting data
  const meetingData = localMeetingData || getMeetingData();
  const isMeeting = isMeetingInvitation();
  const isDeclined = localIsDeclined || isMeetingDeclined();
  const isAccepted = localIsAccepted || (meetingData && meetingData.accepted);

  // Handle notification click - for direct navigation
  const handleNotificationClick = () => {
    // For MENTION notifications, navigate directly to the chat
    if (notification.type === 'MENTION' && notification.data?.session_id) {
      router.push(`/chat?session=${notification.data.session_id}`);
      
      // Mark as read after click
      if (!notification.is_read) {
        onAction('read', notification.id);
      }
    }
  };

  // Handle meeting invite actions directly in this component
  const renderMeetingActions = () => {
    if (notification.type !== 'MEETING_INVITE' && !isMeeting) return null;
    
    if (isDeclined) {
      return (
        <div className="mt-2">
          <span className="text-xs text-muted-foreground">
            {tCalendar('meetingDeclined')}
          </span>
        </div>
      );
    }

    if (isAccepted) {
      return (
        <div className="mt-2 flex items-center gap-2">
          <span className="text-xs text-green-600 font-medium">
            {tNotif('meetingAccepted')}
          </span>
          {meetingData && meetingData.meetLink && (
            <Button 
              size="sm" 
              variant="outline" 
              className="h-7 text-xs"
              onClick={(e) => {
                e.stopPropagation();
                window.open(meetingData.meetLink, '_blank');
              }}
            >
              <Video className="h-3 w-3 mr-1" />
              {tCalendar('joinMeeting')}
            </Button>
          )}
        </div>
      );
    }

    // If not accepted or declined yet, show both options
    return (
      <div className="mt-2 flex space-x-2">
        <Button 
          size="sm" 
          variant="default" 
          className="h-7 text-xs"
          onClick={(e) => {
            handleAcceptMeeting(e, notification.id, meetingData);
          }}
          disabled={isActioning}
        >
          <Check className="h-3 w-3 mr-1" />
          {tCalendar('accept')}
        </Button>
        
        <Button 
          size="sm" 
          variant="outline" 
          className="h-7 text-xs"
          onClick={(e) => {
            handleDeclineMeeting(e, notification.id);
          }}
          disabled={isActioning}
        >
          <X className="h-3 w-3 mr-1" />
          {tCalendar('decline')}
        </Button>
      </div>
    );
  };

  return (
    <Card 
      className={`border ${notification.is_read ? 'bg-card' : 'bg-accent'} shadow-sm transition-all hover:shadow-md`}
      onClick={handleNotificationClick}
    >
      <CardContent className="p-4 cursor-pointer">
        <div className="flex gap-3">
          {getIcon(notification.type)}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h4 className="font-medium text-sm">{notification.title}</h4>
                <p className="text-sm text-muted-foreground line-clamp-2">{notification.content}</p>
              </div>
              <div className="flex flex-shrink-0 gap-1">
                {!notification.is_read && (
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-7 w-7" 
                    onClick={handleMarkAsRead}
                    disabled={isActioning}
                  >
                    <Check className="h-4 w-4" />
                    <span className="sr-only">{t('markAsRead')}</span>
                  </Button>
                )}
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-7 w-7 text-muted-foreground hover:text-destructive" 
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsActioning(true);
                    onAction('delete', notification.id);
                    setTimeout(() => setIsActioning(false), 500);
                  }}
                  disabled={isActioning}
                >
                  <Trash2 className="h-4 w-4" />
                  <span className="sr-only">{t('delete')}</span>
                </Button>
              </div>
            </div>
            
            {/* Handle meeting invitations directly in this component */}
            {renderMeetingActions()}
            
            {/* For other notifications with links */}
            {notification.link && notification.type !== 'MENTION' && (
              <div className="mt-2">
                <Link
                  href={notification.link}
                  className="text-xs inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!notification.is_read) {
                      onAction('read', notification.id);
                    }
                  }}
                >
                  <ExternalLink className="h-3 w-3" />
                  {t('common.viewDetails')}
                </Link>
              </div>
            )}
            
            <div className="text-xs text-muted-foreground mt-2">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span>{formatDate(notification.created_at)}</span>
                  </TooltipTrigger>
                  <TooltipContent>
                    {formatExactTime(notification.created_at)}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
} 