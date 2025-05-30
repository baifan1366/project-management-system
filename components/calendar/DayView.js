'use client';

import { useState, useMemo, useCallback } from 'react';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { format, addHours, parseISO, isSameDay, isBefore, isAfter, isSameHour, addMinutes, differenceInMinutes, set } from 'date-fns';
import { cn } from '@/lib/utils';
import { Video, UserIcon, MapPin, Clock } from 'lucide-react';
import { toast } from 'sonner';

// Define time grid hours from 7am to 9pm (7:00 - 21:00)
const HOURS = Array.from({ length: 15 }, (_, i) => i + 7);

export default function DayView({
  currentDate,
  handleOpenCreateEvent,
  t,
  isGoogleConnected,
  handleConnectGoogle,
  googleEvents = [],
  personalEvents = [],
  tasks = [],
  googleCalendarColors,
  handleEventClick,
  onEventUpdate, // Keeping the prop for compatibility
}) {
  // Format the current date for display
  const formattedDate = format(currentDate, 'EEEE, MMMM d, yyyy');
  
  // Process events for the selected day
  const dayEvents = useMemo(() => {
    const events = [];
    
    // Process Google events
    if (googleEvents && googleEvents.length) {
      googleEvents.forEach(event => {
        try {
          // Parse dates
          const start = parseISO(event.start.dateTime || `${event.start.date}T00:00:00`);
          const end = parseISO(event.end.dateTime || `${event.end.date}T23:59:59`);
          
          // Only include events for this day
          if (!isSameDay(start, currentDate) && !isSameDay(end, currentDate)) {
            // If the event spans multiple days, check if current date falls within the range
            if (!(isBefore(currentDate, end) && isAfter(currentDate, start))) {
              return;
            }
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
            attendees: event.attendees || [],
            originalEvent: event, // Keep original event data for updates
            uniqueId: `google-${event.id}` // Keep unique ID for identification
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
          
          // Only include events for this day
          if (!isSameDay(start, currentDate) && !isSameDay(end, currentDate)) {
            // If the event spans multiple days, check if current date falls within the range
            if (!(isBefore(currentDate, end) && isAfter(currentDate, start))) {
              return;
            }
          }
          
          events.push({
            id: event.id,
            title: event.title,
            start,
            end,
            color: event.color || '#9c27b0', // Default purple
            type: 'personal',
            allDay: event.all_day || false,
            location: event.location || '',
            description: event.description || '',
            originalEvent: event, // Keep original event data for updates
            uniqueId: `personal-${event.id}` // Keep unique ID for identification
          });
        } catch (err) {
          console.error('Failed to process personal event:', err, event);
        }
      });
    }
    
    // Process tasks with due dates
    if (tasks && tasks.length) {
      tasks.forEach(task => {
        // 跳过没有日期的任务
        if (!task.due_date && !task.expected_completion_date) return null;
        
        // 确定日期（优先使用due_date，然后是expected_completion_date）
        const taskDate = task.due_date || task.expected_completion_date;
        const taskDay = parseISO(taskDate);
        
        // 如果不是当前显示的日期，则跳过
        if (!isSameDay(taskDay, currentDate)) {
          return null;
        }
        
        // 确定任务的开始时间（优先使用expected_start_time，否则使用当天开始时间）
        const startTime = task.expected_start_time 
          ? parseISO(task.expected_start_time)
          : set(taskDay, { hours: 0, minutes: 0, seconds: 0 });
        
        // 确定任务的结束时间（使用due_date或expected_completion_date）
        const endTime = parseISO(taskDate);
        
        // 任务的ID（用于标识）
        const taskId = `task-${task.my_task_id || task.id}`;
        
        // 原始事件数据
        const originalEvent = {
          ...task,
          id: taskId,
          type: 'task'
        };
        
        events.push({
          id: taskId,
          title: task.title || t('noTitle'),
          start: startTime,
          end: endTime,
          color: '#FF9800', // Orange
          type: 'task',
          allDay: false, // Changed to false to show as a timed event
          originalEvent: originalEvent,
          uniqueId: taskId
        });
      });
    }
    
    return events;
  }, [googleEvents, personalEvents, tasks, currentDate, googleCalendarColors, t]);
  
  // Separate all-day events
  const allDayEvents = useMemo(() => {
    return dayEvents.filter(event => event.allDay);
  }, [dayEvents]);
  
  // Sort timed events by start time
  const timedEvents = useMemo(() => {
    return dayEvents
      .filter(event => !event.allDay)
      .sort((a, b) => a.start - b.start);
  }, [dayEvents]);
  
  // Position events to handle overlaps
  const positionedEvents = useMemo(() => {
    // Sort events by start time
    const sortedEvents = [...timedEvents];
    
    // Group overlapping events
    const columns = [];
    
    sortedEvents.forEach(event => {
      // Calculate top position (percentage)
      const dayStartHour = 7; // 7am
      const minutes = event.start.getHours() * 60 + event.start.getMinutes();
      const startMinutesFromDayStart = minutes - (dayStartHour * 60);
      const topPercentage = Math.max(0, (startMinutesFromDayStart / (15 * 60)) * 100);
      
      // Calculate height (duration as percentage)
      const durationMinutes = 
        (event.end.getHours() * 60 + event.end.getMinutes()) - 
        (event.start.getHours() * 60 + event.start.getMinutes());
      const heightPercentage = Math.min(100 - topPercentage, (durationMinutes / (15 * 60)) * 100);
      
      // Find a column position (to handle overlapping events)
      let columnIndex = 0;
      let positioned = false;
      
      while (!positioned) {
        // Check if this column is free for this time slot
        const isColumnFree = !columns[columnIndex]?.some(placedEvent => {
          // Check for overlap
          return (
            (isBefore(event.start, placedEvent.end) || isSameHour(event.start, placedEvent.end)) && 
            (isAfter(event.end, placedEvent.start) || isSameHour(event.end, placedEvent.start))
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
            height: Math.max(heightPercentage, 3) // Minimum height for very short events
          });
          positioned = true;
        } else {
          // Try next column
          columnIndex++;
        }
      }
    });
    
    // Calculate total columns and assign final positions
    const totalColumns = columns.length;
    
    return columns.flatMap((column, colIndex) => {
      return column.map(event => ({
        ...event,
        width: totalColumns ? (1 / totalColumns) * 100 : 100,
        left: totalColumns ? (colIndex / totalColumns) * 100 : 0
      }));
    });
  }, [timedEvents]);
  
  // Update the handleEventClick function
  const onEventClick = (event) => {
    // Call the parent component's handler if provided
    if (handleEventClick) {
      handleEventClick(event, event.type);
      return;
    }
    
    // Fallback to old behavior if no handler is provided
    // For Google Meet events, open the hangout link
    if (event.type === 'google' && event.hangoutLink) {
      window.open(event.hangoutLink, '_blank');
      return;
    }
    
    // Show event details in toast
    toast.info(
      <div>
        <div className="font-medium">{event.title}</div>
        <div className="flex items-center text-sm mt-1">
          <Clock className="h-3 w-3 mr-1" />
          {format(event.start, 'h:mm a')} - {format(event.end, 'h:mm a')}
        </div>
        {event.location && (
          <div className="flex items-center text-sm mt-1">
            <MapPin className="h-3 w-3 mr-1" />
            {event.location}
          </div>
        )}
        {event.description && (
          <div className="text-sm mt-1 text-muted-foreground line-clamp-2">{event.description}</div>
        )}
        {event.attendees && event.attendees.length > 0 && (
          <div className="text-sm mt-1">
            <span className="inline-flex items-center">
              <UserIcon className="h-3 w-3 mr-1" /> 
              {event.attendees.length} {t('attendees')}
            </span>
          </div>
        )}
      </div>
    );
  };
  
  // Render all-day events section
  const renderAllDayEvents = () => {
    if (allDayEvents.length === 0) return null;
    
    return (
      <div className="border-b pb-2 mb-3">
        <div className="text-xs font-medium text-muted-foreground mb-1">
          {t('allDay')}
        </div>
        <div className="space-y-1">
          {allDayEvents.map(event => (
            <div
              key={`allday-${event.type}-${event.id}`}
              className="rounded px-2 py-1 text-sm truncate cursor-pointer hover:opacity-90 transition-opacity"
              style={{
                backgroundColor: `${event.color}15`,
                borderLeft: `3px solid ${event.color}`
              }}
              onClick={() => onEventClick(event)}
            >
              <div className="flex items-center">
                <span className="truncate">{event.title}</span>
                {event.type === 'google' && event.hangoutLink && (
                  <Video className="h-3 w-3 ml-1 text-emerald-600" />
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };
  
  // Render the time grid with events
  const renderTimeGrid = () => {
    return (
      <div className="relative">
        {/* Time slots */}
        {HOURS.map((hour, idx) => (
          <div 
            key={`hour-${hour}`}
            className={cn(
              "grid grid-cols-[80px_1fr] border-t border-t-border/40",
              idx === 0 && "border-t-0"
            )}
          >
            <div className="h-14 pr-3 text-right text-xs text-muted-foreground py-1">
              {format(new Date().setHours(hour, 0, 0, 0), 'h a')}
            </div>
            <div 
              className="h-14 relative"
              onClick={() => {
                const dateWithTime = new Date(currentDate);
                dateWithTime.setHours(hour, 0, 0, 0);
                handleOpenCreateEvent(dateWithTime);
              }}
            ></div>
          </div>
        ))}
        
        {/* Events */}
        {positionedEvents.map((event) => (
          <div
            key={event.uniqueId}
            className={cn(
              "absolute rounded-md border p-2 text-sm overflow-hidden cursor-pointer transition-opacity hover:opacity-90",
              event.type === 'google' ? "border-green-300 dark:border-green-700" : "border-purple-300 dark:border-purple-700",
              event.hangoutLink && "border-emerald-400 dark:border-emerald-600"
            )}
            style={{
              top: `calc(${event.top}% + 0px)`,
              height: `${event.height}%`,
              width: `calc(${event.width}% - 6px)`,
              left: `calc(80px + ${event.left}% + 3px)`,
              backgroundColor: `${event.color}15`,
              borderLeft: `4px solid ${event.color}`
            }}
            onClick={() => onEventClick(event)}
          >
            <div className="h-full flex flex-col">
              <div className="font-medium leading-tight truncate flex items-center">
                {event.title}
                {event.hangoutLink && (
                  <Video className="h-3 w-3 ml-1 text-emerald-600" />
                )}
              </div>
              
              {event.height > 10 && (
                <div className="text-xs text-muted-foreground truncate mt-1">
                  {format(event.start, 'h:mm a')} - {format(event.end, 'h:mm a')}
                </div>
              )}
              
              {event.height > 15 && event.location && (
                <div className="text-xs truncate mt-1 flex items-center">
                  <MapPin className="h-2.5 w-2.5 mr-1" />
                  {event.location}
                </div>
              )}
              
              {event.height > 20 && event.attendees && event.attendees.length > 0 && (
                <div className="text-xs truncate mt-1 flex items-center">
                  <UserIcon className="h-2.5 w-2.5 mr-1" />
                  {event.attendees.length} {t('attendees')}
                </div>
              )}
            </div>
          </div>
        ))}
        
        {/* Current time indicator */}
        {isSameDay(currentDate, new Date()) && (
          <div 
            className="absolute left-0 right-0 border-t border-red-500 z-10"
            style={{
              top: `calc(${((new Date().getHours() - 7) * 60 + new Date().getMinutes()) / (15 * 60) * 100}%)`
            }}
          >
            <div className="absolute -mt-1 -ml-1 w-2 h-2 rounded-full bg-red-500"></div>
          </div>
        )}
      </div>
    );
  };
  
  // Sidebar with day schedule summary
  const renderSidebar = () => {
    return (
      <div className="space-y-4">
        <div className="text-lg font-bold">
          {formattedDate}
        </div>
        
        {dayEvents.length > 0 ? (
          <>
            <div className="text-sm font-medium mb-2">
              {t('schedule')}
            </div>
            
            <div className="space-y-2">
              {dayEvents
                .sort((a, b) => a.start - b.start)
                .map(event => (
                  <div 
                    key={`sidebar-${event.type}-${event.id}`}
                    className="p-2 rounded-md text-sm cursor-pointer hover:bg-accent/5 transition-colors"
                    onClick={() => onEventClick(event)}
                  >
                    <div className="flex items-center">
                      <div 
                        className="w-3 h-3 rounded-full flex-shrink-0 mr-2" 
                        style={{ backgroundColor: event.color }}
                      ></div>
                      <span className="font-medium truncate">{event.title}</span>
                      {event.hangoutLink && (
                        <Video className="h-3 w-3 ml-1 text-emerald-600" />
                      )}
                    </div>
                    <div className="ml-5 text-xs text-muted-foreground mt-1">
                      {event.allDay 
                        ? t('allDay')
                        : `${format(event.start, 'h:mm a')} - ${format(event.end, 'h:mm a')}`
                      }
                    </div>
                  </div>
                ))
              }
            </div>
          </>
        ) : (
          <div className="text-sm text-muted-foreground">
            {t('noEvents')}
          </div>
        )}
        
        <Button 
          onClick={() => handleOpenCreateEvent(currentDate)}
          className="w-full mt-4"
        >
          {t('addEvent')}
        </Button>
      </div>
    );
  };

  return (
    <Card className="p-5 overflow-hidden">
      <div className="grid grid-cols-[250px_1fr] gap-6 h-[calc(100vh-200px)]">
        {/* Left sidebar */}
        <div className="border-r pr-4">
          {renderSidebar()}
        </div>
        
        {/* Main time grid */}
        <div className="overflow-y-auto">
          {renderAllDayEvents()}
          {renderTimeGrid()}
          
          {/* Google Calendar connection prompt */}
          {!isGoogleConnected && (
            <div className="mt-8 text-center py-6 border border-dashed rounded-md">
              <p className="mb-3 text-sm text-muted-foreground">{t('connectGoogleCalendarPrompt')}</p>
              <Button onClick={handleConnectGoogle} className="mr-2">
                {t('connectGoogle')}
              </Button>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
} 