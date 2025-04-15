'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { format, addDays, startOfWeek, endOfWeek, eachHourOfInterval, isSameDay, parseISO, addHours, isBefore, isAfter, isSameHour } from 'date-fns';
import { cn } from '@/lib/utils';
import { Video, ExternalLink, UserIcon } from 'lucide-react';
import { toast } from 'sonner';

// Define time grid hours from 7am to 9pm (7:00 - 21:00)
const HOURS = Array.from({ length: 15 }, (_, i) => i + 7);

export default function WeekView({ 
  currentDate, 
  handleOpenCreateEvent, 
  t, 
  isGoogleConnected,
  handleConnectGoogle,
  googleEvents = [],
  personalEvents = [],
  tasks = [],
  googleCalendarColors,
}) {
  // Calculate week start based on currentDate
  const weekStart = useMemo(() => startOfWeek(currentDate), [currentDate]);
  const weekEnd = useMemo(() => endOfWeek(currentDate), [currentDate]);
  
  // Create array of days in the current week
  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }).map((_, index) => {
      return addDays(weekStart, index);
    });
  }, [weekStart]);

  // Process events into a format suitable for the week view
  const processedEvents = useMemo(() => {
    const events = [];
    
    // Process Google events
    if (googleEvents && googleEvents.length) {
      googleEvents.forEach(event => {
        try {
          // Parse dates
          const start = parseISO(event.start.dateTime || `${event.start.date}T00:00:00`);
          const end = parseISO(event.end.dateTime || `${event.end.date}T23:59:59`);
          
          // Skip if event is outside current week view
          if (isAfter(start, weekEnd) || isBefore(end, weekStart)) {
            return;
          }
          
          // Determine color
          let eventColor = '#4285F4'; // Default Google blue
          if (event.colorId && googleCalendarColors[event.colorId]) {
            eventColor = googleCalendarColors[event.colorId];
          }
          
          events.push({
            id: event.id,
            title: event.summary || t('untitledEvent'),
            start,
            end,
            color: eventColor,
            type: 'google',
            allDay: !event.start.dateTime,
            location: event.location || '',
            description: event.description || '',
            hangoutLink: event.hangoutLink,
            attendees: event.attendees || []
          });
        } catch (err) {
          console.error('Failed to process Google event:', err, event);
        }
      });
    }
    
    // Process personal events
    if (personalEvents && personalEvents.length) {
      personalEvents.forEach(event => {
        try {
          // Parse dates
          const start = parseISO(event.start_time);
          const end = parseISO(event.end_time);
          
          // Skip if event is outside current week view
          if (isAfter(start, weekEnd) || isBefore(end, weekStart)) {
            return;
          }
          
          events.push({
            id: event.id,
            title: event.title,
            start,
            end,
            color: event.color || '#9c27b0', // Default purple if no color
            type: 'personal',
            allDay: event.all_day || false,
            location: event.location || '',
            description: event.description || '',
          });
        } catch (err) {
          console.error('Failed to process personal event:', err, event);
        }
      });
    }
    
    // Process tasks with due dates as events
    if (tasks && tasks.length) {
      tasks.forEach(task => {
        if (task.due_date) {
          try {
            // Parse dates (tasks are all-day by default)
            const taskDate = parseISO(task.due_date);
            
            // Skip if task is outside current week view
            if (isAfter(taskDate, weekEnd) || isBefore(taskDate, weekStart)) {
              return;
            }
            
            events.push({
              id: `task-${task.id}`,
              title: task.title,
              start: taskDate,
              end: addHours(taskDate, 1), // Make it 1 hour duration
              color: '#FF9800', // Orange
              type: 'task',
              allDay: true
            });
          } catch (err) {
            console.error('Failed to process task:', err, task);
          }
        }
      });
    }
    
    return events;
  }, [googleEvents, personalEvents, tasks, weekStart, weekEnd, googleCalendarColors, t]);
  
  // Group all-day events
  const allDayEvents = useMemo(() => {
    return processedEvents.filter(event => event.allDay);
  }, [processedEvents]);
  
  // Group regular events by day
  const eventsByDay = useMemo(() => {
    const days = Array(7).fill().map(() => []);
    
    processedEvents
      .filter(event => !event.allDay)
      .forEach(event => {
        // An event can span multiple days
        weekDays.forEach((day, index) => {
          if (
            (isSameDay(day, event.start) || isAfter(day, event.start)) && 
            (isSameDay(day, event.end) || isBefore(day, event.end))
          ) {
            // For this day, get the correct start and end times
            const dayStart = isSameDay(day, event.start) ? event.start : new Date(day).setHours(0, 0, 0, 0);
            const dayEnd = isSameDay(day, event.end) ? event.end : new Date(day).setHours(23, 59, 59, 999);
            
            days[index].push({
              ...event,
              dayStart: new Date(dayStart),
              dayEnd: new Date(dayEnd)
            });
          }
        });
      });
      
    return days;
  }, [processedEvents, weekDays]);
  
  // Calculate event positions and prevent overlaps
  const positionedEventsByDay = useMemo(() => {
    return eventsByDay.map(dayEvents => {
      // Sort events by start time
      const sortedEvents = [...dayEvents].sort((a, b) => a.dayStart - b.dayStart);
      
      // Track columns for positioning
      const columns = [];
      
      sortedEvents.forEach(event => {
        // Calculate top position (percentage)
        const dayStartHour = 7; // 7am
        const minutes = event.dayStart.getHours() * 60 + event.dayStart.getMinutes();
        const startMinutesFromDayStart = minutes - (dayStartHour * 60);
        const topPercentage = (startMinutesFromDayStart / (15 * 60)) * 100;
        
        // Calculate height (duration as percentage)
        const durationMinutes = 
          (event.dayEnd.getHours() * 60 + event.dayEnd.getMinutes()) - 
          (event.dayStart.getHours() * 60 + event.dayStart.getMinutes());
        const heightPercentage = (durationMinutes / (15 * 60)) * 100;
        
        // Find a column position (to handle overlapping events)
        let columnIndex = 0;
        let positioned = false;
        
        while (!positioned) {
          // Check if this column is free for this time slot
          const isColumnFree = !columns[columnIndex]?.some(placedEvent => {
            const placedEventStart = placedEvent.dayStart;
            const placedEventEnd = placedEvent.dayEnd;
            
            // Check for overlap
            return (
              (isBefore(event.dayStart, placedEventEnd) || isSameHour(event.dayStart, placedEventEnd)) && 
              (isAfter(event.dayEnd, placedEventStart) || isSameHour(event.dayEnd, placedEventStart))
            );
          });
          
          if (isColumnFree) {
            // Place event in this column
            if (!columns[columnIndex]) {
              columns[columnIndex] = [];
            }
            columns[columnIndex].push({
              ...event,
              columnIndex,
              top: topPercentage,
              height: heightPercentage
            });
            positioned = true;
          } else {
            // Try next column
            columnIndex++;
          }
        }
      });
      
      // Flatten the columns back into a single array
      return columns.flatMap(column => column || []);
    });
  }, [eventsByDay]);
  
  // Handle event click
  const handleEventClick = (event) => {
    // For Google Meet events, open the hangout link
    if (event.type === 'google' && event.hangoutLink) {
      window.open(event.hangoutLink, '_blank');
      return;
    }
    
    // Show event details in a toast notification
    toast.info(
      <div>
        <div className="font-medium">{event.title}</div>
        <div className="text-sm mt-1">
          {format(event.start, 'MMM d, h:mm a')} - {format(event.end, 'h:mm a')}
        </div>
        {event.location && (
          <div className="text-sm mt-1">📍 {event.location}</div>
        )}
        {event.description && (
          <div className="text-sm mt-1 text-muted-foreground line-clamp-2">{event.description}</div>
        )}
        {event.attendees && event.attendees.length > 0 && (
          <div className="text-sm mt-1">
            <span className="inline-flex items-center">
              <UserIcon className="w-3 h-3 mr-1" /> {event.attendees.length} {t('attendees')}
            </span>
          </div>
        )}
      </div>
    );
  };

  // Render time grid for one day
  const renderTimeGrid = (dayIndex) => {
    return (
      <div className="relative h-full">
        {/* Time slots */}
        {HOURS.map((hour, idx) => (
          <div 
            key={`hour-${hour}`}
            className={cn(
              "border-t border-border/40 h-12",
              idx === 0 && "border-t-0"
            )}
            onClick={() => {
              const date = weekDays[dayIndex];
              const dateWithTime = new Date(date);
              dateWithTime.setHours(hour, 0, 0, 0);
              handleOpenCreateEvent(dateWithTime);
            }}
          >
            {/* Time slot content is empty for now */}
          </div>
        ))}
        
        {/* Events */}
        {positionedEventsByDay[dayIndex]?.map((event) => {
          const columnWidth = 98; // Percentage width of a column
          const columnCount = Math.max(...positionedEventsByDay[dayIndex].map(e => e.columnIndex + 1), 1);
          const width = columnWidth / columnCount;
          const left = (event.columnIndex / columnCount) * columnWidth;
          
          return (
            <div
              key={`${event.type}-${event.id}`}
              className={cn(
                "absolute rounded-md border left-0 p-1 text-xs overflow-hidden cursor-pointer transition-opacity hover:opacity-90",
                event.type === 'google' ? "border-green-300 dark:border-green-700" : "border-purple-300 dark:border-purple-700",
                event.hangoutLink && "border-emerald-400 dark:border-emerald-600"
              )}
              style={{
                top: `${event.top}%`,
                height: `${Math.max(event.height, 3)}%`, // Minimum height for very short events
                width: `${width}%`,
                left: `${left}%`,
                backgroundColor: `${event.color}20`,
                borderLeft: `3px solid ${event.color}`
              }}
              onClick={() => handleEventClick(event)}
            >
              <div className="flex flex-col h-full">
                <div className="font-medium leading-tight truncate flex items-center">
                  {event.title}
                  {event.hangoutLink && (
                    <Video className="h-3 w-3 ml-1 text-emerald-600" />
                  )}
                </div>
                
                {event.height > 8 && (
                  <div className="text-[10px] text-muted-foreground truncate">
                    {format(event.dayStart, 'h:mm a')} - {format(event.dayEnd, 'h:mm a')}
                  </div>
                )}
                
                {event.height > 12 && event.location && (
                  <div className="text-[10px] truncate mt-1">
                    {event.location}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };
  
  // Render all-day events
  const renderAllDayEvents = () => {
    if (allDayEvents.length === 0) return null;
    
    // Group by day
    const eventsByDay = Array(7).fill().map(() => []);
    
    allDayEvents.forEach(event => {
      weekDays.forEach((day, index) => {
        if (isSameDay(day, event.start)) {
          eventsByDay[index].push(event);
        }
      });
    });
    
    return (
      <div className="grid grid-cols-8 border-b border-b-border/60 bg-muted/30">
        <div className="py-1 px-2 text-xs text-muted-foreground">
          {t('allDay')}
        </div>
        
        {weekDays.map((day, index) => (
          <div key={`allday-${index}`} className="py-1 px-1 border-l border-l-border/40 min-h-[22px] text-xs">
            {eventsByDay[index].map(event => (
              <div
                key={`allday-${event.type}-${event.id}`}
                className="rounded mb-0.5 px-1 py-0.5 truncate cursor-pointer"
                style={{
                  backgroundColor: `${event.color}20`,
                  borderLeft: `2px solid ${event.color}`
                }}
                onClick={() => handleEventClick(event)}
              >
                {event.title}
              </div>
            ))}
          </div>
        ))}
      </div>
    );
  };

  return (
    <Card className="p-0 overflow-hidden">
      {/* Week header */}
      <div className="grid grid-cols-8 border-b">
        <div className="py-3 px-3"></div>
        {weekDays.map((day, index) => (
          <div 
            key={index} 
            className={cn(
              "py-3 px-3 text-center font-medium border-l border-l-border/40 cursor-pointer hover:bg-accent/5",
              isSameDay(day, new Date()) && "bg-accent/10"
            )}
            onClick={() => handleOpenCreateEvent(day)}
          >
            <div>{t(format(day, 'EEE').toLowerCase())}</div>
            <div className={cn(
              "inline-flex h-7 w-7 items-center justify-center rounded-full text-sm mx-auto mt-1",
              isSameDay(day, new Date()) && "bg-primary text-primary-foreground"
            )}>
              {format(day, 'd')}
            </div>
          </div>
        ))}
      </div>
      
      {/* All-day events row */}
      {renderAllDayEvents()}
      
      {/* Time grid and events */}
      <div className="grid grid-cols-8 overflow-y-auto" style={{ height: 'calc(100vh - 270px)' }}>
        {/* Time labels column */}
        <div className="border-r border-r-border/40">
          {HOURS.map((hour, idx) => (
            <div 
              key={`time-${hour}`}
              className={cn(
                "h-12 pr-2 text-right text-xs text-muted-foreground border-t border-t-border/40",
                idx === 0 && "border-t-0"
              )}
            >
              {format(new Date().setHours(hour, 0, 0, 0), 'h a')}
            </div>
          ))}
        </div>
        
        {/* Days columns */}
        {Array.from({ length: 7 }).map((_, dayIndex) => (
          <div 
            key={`day-${dayIndex}`} 
            className={cn(
              "border-l border-l-border/40",
              isSameDay(weekDays[dayIndex], new Date()) && "bg-accent/5"
            )}
          >
            {renderTimeGrid(dayIndex)}
          </div>
        ))}
      </div>
      
      {/* Google Calendar connection prompt */}
      {!isGoogleConnected && (
        <div className="p-4 text-center">
          <p className="mb-2 text-sm text-muted-foreground">{t('connectGoogleCalendarPrompt')}</p>
          <Button onClick={handleConnectGoogle} className="mr-2">
            {t('connectGoogle')}
          </Button>
        </div>
      )}
    </Card>
  );
} 