'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { format, parseISO } from 'date-fns';
import { Calendar as CalendarIcon, MapPin, Clock, Video, Trash2, Edit, ExternalLink, Users, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

export default function EventDetailsDialog({ isOpen, setIsOpen, event, eventType, onEdit, onDelete, onSuccess }) {
  const t = useTranslations('Calendar');
  const [isDeleting, setIsDeleting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  
  if (!event) return null;

  // Format event date/time based on event type
  const formatEventTime = () => {
    try {
      // Different date fields based on event type
      if (eventType === 'google') {
        const start = event.start?.dateTime || event.start?.date;
        const end = event.end?.dateTime || event.end?.date;
        const isAllDay = !event.start?.dateTime;
        
        if (isAllDay) {
          return `${format(parseISO(start), 'PP')}${
            end && start !== end ? ` - ${format(parseISO(end), 'PP')}` : ''
          } (${t('allDay')})`;
        }
        
        return `${format(parseISO(start), 'PPp')} - ${format(parseISO(end), 'PPp')}`;
      }
      else if (eventType === 'personal') {
        const start = event.start_time;
        const end = event.end_time;
        const isAllDay = event.is_all_day;
        
        if (isAllDay) {
          return `${format(parseISO(start), 'PP')}${
            end && start !== end ? ` - ${format(parseISO(end), 'PP')}` : ''
          } (${t('allDay')})`;
        }
        
        return `${format(parseISO(start), 'PPp')} - ${format(parseISO(end), 'PPp')}`;
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
    
    return '';
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
    if (eventType === 'google') {
      setIsEditing(true);
      // Handle Google Calendar event editing via CreateCalendarEvent component
      if (onEdit) {
        setIsOpen(false);
        onEdit(event, eventType);
      }
    } else {
      // For other event types
      setIsOpen(false);
      if (onEdit) onEdit(event, eventType);
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

  const participants = getParticipants();

  return (
    <>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center mb-2">
              <div 
                className="w-3 h-3 rounded-full mr-2" 
                style={{ backgroundColor: getEventColor() }}
              ></div>
              <DialogTitle className="text-xl">{getEventTitle()}</DialogTitle>
            </div>
            
            {eventType && (
              <DialogDescription className="text-xs uppercase tracking-wider font-medium text-muted-foreground">
                {eventType === 'google' ? t('googleCalendar') : 
                  eventType === 'personal' ? t('personalCalendar') : t('task')}
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
                <div>
                  <h4 className="font-medium text-sm">{t('location')}</h4>
                  <p className="text-sm mt-1">{getEventLocation()}</p>
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
                        <div>
                          <div className="flex items-center">
                            {getResponseStatus(attendee.responseStatus)}
                            <span>
                              {attendee.displayName || attendee.email}
                              {attendee.organizer && 
                                <span className="text-xs ml-1 text-muted-foreground">({t('organizer')})</span>
                              }
                            </span>
                          </div>
                          {attendee.displayName && <span className="text-xs text-muted-foreground">{attendee.email}</span>}
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
                <div>
                  <h4 className="font-medium text-sm">{t('description')}</h4>
                  <p className="text-sm mt-1 whitespace-pre-wrap">{getEventDescription()}</p>
                </div>
              </div>
            )}
          </div>
          
          <DialogFooter className="flex gap-2">
            {/* Delete button */}
            <Button 
              variant="destructive" 
              size="sm"
              onClick={showDeleteConfirmation}
              disabled={isDeleting}
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