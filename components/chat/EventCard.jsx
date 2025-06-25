'use client';

import { useState } from 'react';
import { CalendarIcon, MapPin, Clock } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

/**
 * EventCard component for displaying shared events in chat
 * This component parses event details from chat message content and displays them as a card
 */
export default function EventCard({ messageContent }) {
  const t = useTranslations('Calendar');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  // Parse event details from message content
  const parseEventDetails = () => {
    if (!messageContent) return null;
    
    try {
      let title = '';
      let dateTime = '';
      let location = '';
      let description = '';
      let eventType = '';
      
      // Check if this is a Google calendar format
      const isGoogleFormat = messageContent.includes('*Shared Event:') || 
                            (messageContent.includes('Google Calendar') && messageContent.includes('📅'));
      
      if (isGoogleFormat) {
        // Parse Google calendar format
        
        // Extract title - try multiple patterns
        let titleMatch = messageContent.match(/\*Shared Event: (.*?)\*/);
        if (titleMatch && titleMatch[1]) {
          title = titleMatch[1];
        } else {
          // Try to extract the first line as title if it doesn't have a date format
          const firstLine = messageContent.split('\n')[0].trim();
          if (firstLine && !firstLine.match(/\d{1,2}\/\d{1,2}\/\d{4}/) && !firstLine.match(/\d{1,2}:\d{2}/)) {
            title = firstLine.replace(/📅|🗓️|Google Calendar/, '').trim();
          }
        }
        
        // Extract date and time - try multiple patterns
        const dateTimePatterns = [
          /Date and Time: (.*?)(?=📍|Location:|Event Type:|$)/,
          /📅\s*(.*?)(?=📍|🏢|🕒|Location:|Event Type:|$)/,
          // Look for date patterns like MM/DD/YYYY or Jun 9, 2025
          /(?:📅\s*|🗓️\s*|\s)(\w+\s+\d{1,2},?\s+\d{4}(?:,?\s+\d{1,2}:\d{2}\s*(?:AM|PM))?(?:\s*-\s*\w+\s+\d{1,2},?\s+\d{4}(?:,?\s+\d{1,2}:\d{2}\s*(?:AM|PM))?)?)/
        ];
        
        for (const pattern of dateTimePatterns) {
          const match = messageContent.match(pattern);
          if (match && match[1]) {
            dateTime = match[1].trim();
            break;
          }
        }
        
        // If we still don't have a date, look for any date-like format in the message
        if (!dateTime) {
          const anyDateMatch = messageContent.match(/(\d{1,2}\/\d{1,2}\/\d{4}|\w+\s+\d{1,2},?\s+\d{4})/);
          if (anyDateMatch && anyDateMatch[1]) {
            dateTime = anyDateMatch[1];
            
            // Try to find time near the date
            const timeMatch = messageContent.match(/(\d{1,2}:\d{2}\s*(?:AM|PM))/);
            if (timeMatch && timeMatch[1]) {
              dateTime += " " + timeMatch[1];
            }
          }
        }
        
        // Extract location - try multiple patterns
        const locationPatterns = [
          /Location: (.*?)(?=Event Type:|$)/,
          /📍\s*(.*?)(?=🕒|Event Type:|$)/
        ];
        
        for (const pattern of locationPatterns) {
          const match = messageContent.match(pattern);
          if (match && match[1]) {
            location = match[1].trim();
            break;
          }
        }
        
        // Extract event type - try multiple patterns
        const eventTypePatterns = [
          /Event Type: (.*?)(\n|$)/,
          /(?:Google Calendar|calendar)(?: type)?\s*[:：]?\s*(.*?)(\n|$)/i
        ];
        
        for (const pattern of eventTypePatterns) {
          const match = messageContent.match(pattern);
          if (match && match[1]) {
            eventType = match[1].trim();
            break;
          }
        }
        
        // If no event type found but "Google Calendar" appears in the message
        if (!eventType && messageContent.includes("Google Calendar")) {
          eventType = "Google Calendar";
        }
      } else {
        // Original emoji format
        
        // Extract event title
        const titleMatch = messageContent.match(/📅 \*.*?: (.*?)\*/);
        if (titleMatch && titleMatch[1]) {
          title = titleMatch[1];
        }
        
        // Extract date and time
        const dateTimeMatch = messageContent.match(/⏰ .*?: (.*?)(\n|$)/);
        if (dateTimeMatch && dateTimeMatch[1]) {
          dateTime = dateTimeMatch[1];
        }
        
        // Extract location if available
        const locationMatch = messageContent.match(/📍 .*?: (.*?)(\n|$)/);
        if (locationMatch && locationMatch[1]) {
          location = locationMatch[1];
        }
        
        // Extract description (any text between location/date and event type)
        const descStart = locationMatch 
          ? messageContent.indexOf(locationMatch[0]) + locationMatch[0].length 
          : dateTimeMatch 
            ? messageContent.indexOf(dateTimeMatch[0]) + dateTimeMatch[0].length
            : -1;
            
        const eventTypeIndex = messageContent.lastIndexOf(t('eventType') || 'Event Type');
        
        if (descStart > -1 && eventTypeIndex > descStart) {
          description = messageContent.substring(descStart, eventTypeIndex).trim();
        }
        
        // Improved event type extraction
        if (eventTypeIndex !== -1) {
          const typeStartIndex = eventTypeIndex + (t('eventType') || 'Event Type').length;
          // Look for the value after the colon
          const eventTypeMatch = messageContent.substring(typeStartIndex).match(/:\s*(.*?)(\n|$)/);
          if (eventTypeMatch && eventTypeMatch[1]) {
            eventType = eventTypeMatch[1].trim();
          } else {
            // Try alternative approach to extract anything after "Event Type: "
            const fullTypeMatch = messageContent.match(new RegExp(`${t('eventType') || 'Event Type'}:\\s*(.*?)(\n|$)`));
            if (fullTypeMatch && fullTypeMatch[1]) {
              eventType = fullTypeMatch[1].trim();
            }
          }
        }
      }
      
      // Set default event type if not found
      if (!eventType) {
        eventType = t('personalEvent') || 'Personal Event';
      }
      
      return { title, dateTime, location, description, eventType };
    } catch (error) {
      console.error('Error parsing event details:', error);
      return { 
        title: t('untitledEvent') || 'Untitled Event',
        dateTime: '',
        location: '',
        description: '',
        eventType: t('personalEvent') || 'Personal Event'
      };
    }
  };
  
  const eventDetails = parseEventDetails();
  
  if (!eventDetails) return null;
  
  const getEventColor = () => {
    if (!eventDetails.eventType) return '#757575';
    
    if (eventDetails.eventType.toLowerCase().includes('google')) {
      return '#4285F4';
    } else if (eventDetails.eventType.toLowerCase().includes('personal')) {
      return '#9c27b0';
    } else if (eventDetails.eventType.toLowerCase().includes('task')) {
      return '#4285F4';
    } else {
      return '#757575';
    }
  };
  
  return (
    <>
      <div 
        className="mt-2 border rounded-md overflow-hidden shadow-sm hover:shadow-md transition-shadow cursor-pointer bg-card text-card-foreground"
        onClick={() => setIsDialogOpen(true)}
      >
        <div className="border-l-4" style={{ borderLeftColor: getEventColor() }}>
          <div className="p-3 space-y-2">
            <div className="flex justify-between items-center">
              <h4 className="font-medium text-sm">{eventDetails.title || t('untitledEvent') || 'Untitled Event'}</h4>
              <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-medium">{eventDetails.eventType}</span>
            </div>
            
            <div className="flex items-start gap-2 text-xs text-foreground">
              <CalendarIcon className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
              <span>{eventDetails.dateTime}</span>
            </div>
            
            {eventDetails.location && (
              <div className="flex items-start gap-2 text-xs text-foreground">
                <MapPin className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
                <span>{eventDetails.location}</span>
              </div>
            )}
            
            {eventDetails.description && (
              <div className="text-xs text-foreground border-t border-border pt-2 mt-2">
                <p className="line-clamp-2">{eventDetails.description}</p>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Event Details Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <div className="flex items-center mb-2">
              <div 
                className="w-3 h-3 rounded-full mr-2" 
                style={{ backgroundColor: getEventColor() }}
              ></div>
              <DialogTitle className="text-xl">{eventDetails.title || t('untitledEvent') || 'Untitled Event'}</DialogTitle>
            </div>
          </DialogHeader>
          
          <div className="py-4 space-y-4">
            {/* Date and time */}
            <div className="flex items-start gap-3">
              <CalendarIcon className="h-5 w-5 text-foreground flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-medium text-sm">{t('dateAndTime') || 'Date and Time'}</h4>
                <p className="text-sm mt-1">{eventDetails.dateTime}</p>
              </div>
            </div>
            
            {/* Location if available */}
            {eventDetails.location && (
              <div className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-foreground flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-medium text-sm">{t('location') || 'Location'}</h4>
                  <p className="text-sm mt-1">{eventDetails.location}</p>
                </div>
              </div>
            )}
            
            {/* Description if available */}
            {eventDetails.description && (
              <div className="flex items-start gap-3">
                <div className="h-5 w-5 flex-shrink-0" /> {/* Spacer to align with icons */}
                <div>
                  <h4 className="font-medium text-sm">{t('description') || 'Description'}</h4>
                  <p className="text-sm mt-1 whitespace-pre-wrap">{eventDetails.description}</p>
                </div>
              </div>
            )}
            
            {/* Event type */}
            <div className="flex items-start gap-3">
              <Clock className="h-5 w-5 text-foreground flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-medium text-sm">{t('eventType') || 'Event Type'}</h4>
                <p className="text-sm mt-1">{eventDetails.eventType}</p>
              </div>
            </div>
          </div>
          
          <div className="mt-4 flex justify-end">
            <Button onClick={() => setIsDialogOpen(false)}>
              {t('close') || 'Close'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
} 