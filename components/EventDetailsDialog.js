'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { format, parseISO } from 'date-fns';
import { Calendar as CalendarIcon, MapPin, Clock, Video, Trash2, Edit, ExternalLink, Users, AlertTriangle, Share2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useChat } from '@/contexts/ChatContext';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function EventDetailsDialog({ isOpen, setIsOpen, event, eventType, onEdit, onDelete, onSuccess }) {
  const t = useTranslations('Calendar');
  const [isDeleting, setIsDeleting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const { sessions, sendMessage } = useChat();
  const [isShareMenuOpen, setIsShareMenuOpen] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  
  if (!event) return null;

  // Check if event is in the past
  const isEventInPast = () => {
    try {
      const now = new Date();
      now.setHours(0, 0, 0, 0); // Set to start of day
      
      let eventEndDate;
      if (eventType === 'google') {
        const endDateString = event.end?.dateTime || event.end?.date;
        eventEndDate = endDateString ? parseISO(endDateString) : null;
      } else if (eventType === 'personal') {
        eventEndDate = event.end_time ? parseISO(event.end_time) : null;
      } else if (eventType === 'task') {
        const dueDate = event.due_date || event.expected_completion_date;
        eventEndDate = dueDate ? parseISO(dueDate) : null;
      }
      
      return eventEndDate && eventEndDate < now;
    } catch (error) {
      console.error('Error checking if event is in past:', error);
      return false;
    }
  };
  
  const isPastEvent = isEventInPast();

  // Format event date/time based on event type
  const formatEventTime = () => {
    try {
      // Different date fields based on event type
      if (eventType === 'google') {
        const start = event.start?.dateTime || event.start?.date;
        const end = event.end?.dateTime || event.end?.date;
        
        if (!start) return t('invalidDate');
        
        const isAllDay = !event.start?.dateTime;
        
        if (isAllDay) {
          return `${format(parseISO(start), 'PP')}${
            end && start !== end ? ` - ${format(parseISO(end), 'PP')}` : ''
          } (${t('allDay')})`;
        }
        
        return `${format(parseISO(start), 'PPp')}${end ? ` - ${format(parseISO(end), 'PPp')}` : ''}`;
      }
      else if (eventType === 'personal') {
        const start = event.start_time;
        const end = event.end_time;
        
        if (!start) return t('invalidDate');
        
        const isAllDay = event.is_all_day;
        
        if (isAllDay) {
          return `${format(parseISO(start), 'PP')}${
            end && start !== end ? ` - ${format(parseISO(end), 'PP')}` : ''
          } (${t('allDay')})`;
        }
        
        return `${format(parseISO(start), 'PPp')}${end ? ` - ${format(parseISO(end), 'PPp')}` : ''}`;
      }
      else if (eventType === 'task') {
        const dueDate = event.due_date || event.expected_completion_date;
        if (!dueDate) return t('noDueDate');
        return format(parseISO(dueDate), 'PPp');
      }
    } catch (error) {
      console.error('Error formatting date:', error);
      return t('invalidDate');
    }
    
    return t('invalidDate');
  };

  // Get event title based on event type
  const getEventTitle = () => {
    if (eventType === 'google') return event.summary || t('untitledEvent');
    if (eventType === 'personal') return event.title || t('untitledEvent');
    if (eventType === 'task') return event.title || t('untitledTask');
    return t('untitledEvent');
  };

  // Get event description based on event type
  const getEventDescription = () => {
    if (eventType === 'google') return event.description;
    if (eventType === 'personal') return event.description;
    if (eventType === 'task') return event.description;
    return null;
  };

  // Get event location based on event type
  const getEventLocation = () => {
    if (eventType === 'google') return event.location;
    if (eventType === 'personal') return event.location;
    return null;
  };

  // Get event color based on event type
  const getEventColor = () => {
    if (eventType === 'google') {
      const googleCalendarColors = {
        '1': '#7986cb', '2': '#33b679', '3': '#8e24aa', '4': '#e67c73',
        '5': '#f6c026', '6': '#f5511d', '7': '#039be5', '8': '#616161',
        '9': '#3f51b5', '10': '#0b8043', '11': '#d60000',
      };
      return event.colorId ? googleCalendarColors[event.colorId] : '#4285F4';
    }
    if (eventType === 'personal') return event.color || '#9c27b0';
    if (eventType === 'task') return '#4285F4';
    return '#757575';
  };

  // Show delete confirmation
  const showDeleteConfirmation = () => {
    setConfirmDeleteOpen(true);
  };

  // Handle delete event
  const handleDeleteEvent = async () => {
    // Check if event is in the past
    if (isPastEvent) {
      toast.error(t('cannotModifyPastEvents') || "Cannot modify events in the past");
      setConfirmDeleteOpen(false);
      return;
    }
    
    try {
      setIsDeleting(true);
      setConfirmDeleteOpen(false);
      
      if (eventType === 'personal') {
        const { error } = await supabase
          .from('personal_calendar_event')
          .delete()
          .eq('id', event.id);
          
        if (error) throw error;
        
        toast.success(t('eventDeleted'));
        setIsOpen(false);
        if (onSuccess) onSuccess();
      }
      else if (eventType === 'google') {
        // Get access token
        const response = await fetch('/api/users/tokens?provider=google');
        if (!response.ok) {
          throw new Error(t('failedToGetToken'));
        }
        
        const tokens = await response.json();
        const accessToken = tokens.access_token;
        const refreshToken = tokens.refresh_token;
        
        if (!accessToken && !refreshToken) {
          throw new Error(t('noGoogleToken'));
        }
        
        // Delete Google Calendar event
        const deleteResponse = await fetch(`/api/google-calendar/events/${event.id}`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            accessToken,
            refreshToken
          }),
        });
        
        if (!deleteResponse.ok) {
          const errorData = await deleteResponse.json();
          throw new Error(errorData.error || t('deleteEventFailed'));
        }
        
        toast.success(t('eventDeleted'));
        setIsOpen(false);
        if (onSuccess) onSuccess();
      }
      else if (eventType === 'task') {
        const { error } = await supabase
          .from('mytasks')
          .delete()
          .eq('id', event.my_task_id);
          
        if (error) throw error;
        
        toast.success(t('taskDeleted'));
        setIsOpen(false);
        if (onSuccess) onSuccess();
      }
    } catch (error) {
      console.error('Error deleting event:', error);
      toast.error(error.message || t('deleteEventFailed'));
    } finally {
      setIsDeleting(false);
    }
  };

  // Handle edit event
  const handleEditEvent = () => {
    // Check if event is in the past
    if (isPastEvent) {
      toast.error(t('cannotModifyPastEvents') || "Cannot modify events in the past");
      return;
    }
    
    // Prepare event with safely parsed dates for editing
    try {
      let eventForEdit = {...event};
      
      if (eventType === 'google') {
        // Handle Google Calendar event editing
        const startDateTime = event.start?.dateTime || event.start?.date;
        const endDateTime = event.end?.dateTime || event.end?.date;
        
        if (onEdit) {
          setIsOpen(false);
          onEdit(event, eventType);
        }
      } else if (eventType === 'personal' || eventType === 'task') {
        // For other event types
        setIsOpen(false);
        if (onEdit) onEdit(event, eventType);
      }
    } catch (error) {
      console.error("Error preparing event for editing:", error);
      toast.error(t('editError') || "Error preparing event for editing");
    }
  };

  // Get event participants (for Google events)
  const getParticipants = () => {
    if (eventType === 'google' && event.attendees && event.attendees.length > 0) {
      return event.attendees;
    }
    return null;
  };
  
  // Get participant response status icon/text
  const getResponseStatus = (responseStatus) => {
    switch (responseStatus) {
      case 'accepted':
        return <span className="h-2 w-2 rounded-full bg-green-500 inline-block mr-1"></span>;
      case 'declined':
        return <span className="h-2 w-2 rounded-full bg-red-500 inline-block mr-1"></span>;
      case 'tentative':
        return <span className="h-2 w-2 rounded-full bg-yellow-500 inline-block mr-1"></span>;
      case 'needsAction':
      default:
        return <span className="h-2 w-2 rounded-full bg-gray-300 dark:bg-gray-600 inline-block mr-1"></span>;
    }
  };

  // Share event to a chat session
  const shareEventToChat = async (sessionId, sessionName) => {
    setIsSharing(true);
    try {
      // Format event details as a message
      const eventTitle = getEventTitle();
      const eventTime = formatEventTime();
      const eventLocation = getEventLocation();
      const eventDescription = getEventDescription();
      
      // Create message content with event details
      let messageContent = `📅 *${t('sharedEvent')}: ${eventTitle}*\n`;
      messageContent += `⏰ ${t('dateAndTime')}: ${eventTime}\n`;
      
      if (eventLocation) {
        messageContent += `📍 ${t('location')}: ${eventLocation}\n`;
      }
      
      if (eventDescription) {
        messageContent += `\n${eventDescription}`;
      }
      
      // Add event type information
      messageContent += `\n\n${t('eventType')}: ${
        eventType === 'google' ? t('googleCalendar') : 
        eventType === 'personal' ? t('personalCalendar') : t('task')
      }`;
      
      // Send the message to the selected chat session
      await sendMessage(sessionId, messageContent);
      
      toast.success(t('eventShared') || `Event shared to ${sessionName}`);
      setIsShareMenuOpen(false);
    } catch (error) {
      console.error('Error sharing event:', error);
      toast.error(t('shareEventFailed') || "Failed to share event");
    } finally {
      setIsSharing(false);
    }
  };

  const participants = getParticipants();

  return (
    <>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center mb-2">
              <div 
                className="w-3 h-3 rounded-full mr-2 flex-shrink-0" 
                style={{ backgroundColor: getEventColor() }}
              ></div>
              <DialogTitle className="text-xl break-words">{getEventTitle()}</DialogTitle>
            </div>
            
            {eventType && (
              <DialogDescription className="text-xs uppercase tracking-wider font-medium text-muted-foreground">
                {eventType === 'google' ? t('googleCalendar') : 
                  eventType === 'personal' ? t('personalCalendar') : t('task')}
                {isPastEvent && <span className="ml-2 text-amber-500">({t('pastEvent') || 'Past Event'})</span>}
              </DialogDescription>
            )}
          </DialogHeader>
          
          <div className="py-4 space-y-4">
            {/* Date and time */}
            <div className="flex items-start gap-3">
              <CalendarIcon className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-medium text-sm">{t('dateAndTime')}</h4>
                <p className="text-sm mt-1">{formatEventTime()}</p>
              </div>
            </div>
            
            {/* Location if available */}
            {getEventLocation() && (
              <div className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                <div className="w-full">
                  <h4 className="font-medium text-sm">{t('location')}</h4>
                  <p className="text-sm mt-1 break-words">{getEventLocation()}</p>
                </div>
              </div>
            )}
            
            {/* Participants for Google events */}
            {participants && (
              <div className="flex items-start gap-3">
                <Users className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-medium text-sm">{t('participants')}</h4>
                  <ul className="text-sm mt-2 space-y-2">
                    {participants.map((attendee, index) => (
                      <li key={index} className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarFallback className="text-xs">
                            {attendee.email?.charAt(0).toUpperCase() || '?'}
                          </AvatarFallback>
                        </Avatar>
                                                  <div className="overflow-hidden max-w-[300px]">
                            <div className="flex items-center">
                              {getResponseStatus(attendee.responseStatus)}
                              <span className="truncate">
                                {attendee.displayName || attendee.email}
                                {attendee.organizer && 
                                  <span className="text-xs ml-1 text-muted-foreground">({t('organizer')})</span>
                                }
                              </span>
                            </div>
                            {attendee.displayName && <span className="text-xs text-muted-foreground truncate">{attendee.email}</span>}
                          </div>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
            
            {/* Meeting link for Google events */}
            {eventType === 'google' && event.hangoutLink && (
              <div className="flex items-start gap-3">
                <Video className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-medium text-sm">{t('meetingLink')}</h4>
                  <a 
                    href={event.hangoutLink} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-sm mt-1 text-blue-600 dark:text-blue-400 hover:underline flex items-center"
                  >
                    {t('joinMeeting')}
                    <ExternalLink className="ml-1 h-3 w-3" />
                  </a>
                </div>
              </div>
            )}
            
            {/* Description if available */}
            {getEventDescription() && (
              <div className="flex items-start gap-3">
                <div className="h-5 w-5 flex-shrink-0" /> {/* Spacer to align with icons */}
                <div className="w-full">
                  <h4 className="font-medium text-sm">{t('description')}</h4>
                  <p className="text-sm mt-1 whitespace-pre-wrap break-words">{getEventDescription()}</p>
                </div>
              </div>
            )}
          </div>
          
          <DialogFooter className="flex gap-2">
            {/* Share dropdown */}
            <DropdownMenu open={isShareMenuOpen} onOpenChange={setIsShareMenuOpen}>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="outline"
                  size="sm"
                  className="gap-1"
                  disabled={isSharing}
                >
                  <Share2 className="h-4 w-4" />
                  {isSharing ? t('sharing') || "Sharing..." : t('share') || "Share"}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end">
                <DropdownMenuLabel>{t('shareWith') || "Share with"}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <ScrollArea className="max-h-[200px]">
                  {sessions && sessions.length > 0 ? (
                    sessions.map(session => (
                      <DropdownMenuItem
                        key={session.id}
                        disabled={isSharing}
                        className="cursor-pointer"
                        onClick={() => shareEventToChat(session.id, session.name || (session.participants?.[0]?.name || t('chat')))}
                      >
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs overflow-hidden bg-primary text-primary-foreground">
                            {session.type === 'GROUP' ? (
                              <Users className="h-3 w-3" />
                            ) : session.participants?.[0]?.avatar_url ? (
                              <img src={session.participants[0].avatar_url} alt={session.participants[0].name} className="w-full h-full object-cover" />
                            ) : (
                              <span>{(session.name || session.participants?.[0]?.name || '?').charAt(0)}</span>
                            )}
                          </div>
                          <span className="truncate">
                            {session.type === 'GROUP' 
                              ? session.name || t('groupChat') 
                              : session.participants?.[0]?.name || t('chat')}
                          </span>
                        </div>
                      </DropdownMenuItem>
                    ))
                  ) : (
                    <div className="text-center py-2 text-muted-foreground text-sm">
                      {t('noChats') || "No chats available"}
                    </div>
                  )}
                </ScrollArea>
              </DropdownMenuContent>
            </DropdownMenu>
            
            {/* Delete button */}
            <Button 
              variant="destructive" 
              size="sm"
              onClick={showDeleteConfirmation}
              disabled={isDeleting || isPastEvent}
              className="gap-1"
            >
              <Trash2 className="h-4 w-4" />
              {isDeleting ? t('deleting') : t('delete')}
            </Button>
            
            {/* Edit button */}
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleEditEvent}
              disabled={isPastEvent}
              className="gap-1"
            >
              <Edit className="h-4 w-4" />
              {t('edit')}
            </Button>
            
            {/* Close button */}
            <Button 
              variant="secondary" 
              onClick={() => setIsOpen(false)}
            >
              {t('close')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('deleteConfirmationTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              <div className="flex flex-col gap-4">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0" />
                  <p>{t('deleteConfirmationMessage')}</p>
                </div>
                <div className="bg-muted/50 p-3 rounded-md">
                  <p className="font-medium">{getEventTitle()}</p>
                  <p className="text-sm text-muted-foreground mt-1">{formatEventTime()}</p>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteEvent} 
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t('confirmDelete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
} 