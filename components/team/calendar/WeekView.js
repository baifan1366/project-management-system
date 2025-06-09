'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { format, addDays, startOfWeek, endOfWeek, eachHourOfInterval, isSameDay, parseISO, addHours, isBefore, isAfter, isSameHour, setHours, setMinutes, addMinutes, differenceInMinutes, differenceInDays, set } from 'date-fns';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// Define time grid hours from 7am to 9pm (7:00 - 21:00)
const HOURS = Array.from({ length: 15 }, (_, i) => i + 7);

export default function WeekView({ 
  currentDate, 
  handleOpenCreateEvent, 
  t, 
  tasks = [],
  handleEventClick,
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
    
    // Process tasks with due dates as events
    if (tasks && tasks.length) {
      tasks.forEach(task => {
        // 跳过没有截止日期的任务
        if (!task.due_date) return;
        
        // 解析任务日期
        const taskDueDate = task.due_date;
        const taskDueDay = parseISO(taskDueDate);
        
        // 确定任务的开始时间
        let startTime;
        let startDay;
        
        if (task.start_date) {
          // 如果提供了开始日期，使用它
          startDay = parseISO(task.start_date);
          // 设置为上午9点开始
          startTime = set(startDay, { hours: 9, minutes: 0, seconds: 0 });
        } else {
          // 如果没有开始日期，使用截止日期前一天
          startDay = addDays(taskDueDay, -1);
          startTime = set(startDay, { hours: 9, minutes: 0, seconds: 0 });
        }
        
        // 确定任务的结束时间（截止日期下午5点）
        const endTime = set(taskDueDay, { hours: 17, minutes: 0, seconds: 0 });
        
        // 如果不是当前显示的周，则跳过
        if (taskDueDay < weekStart || taskDueDay > weekEnd) {
          return;
        }
        
        // 获取任务在周中的位置
        const taskDayIndex = differenceInDays(taskDueDay, weekStart);
        
        if (taskDayIndex < 0 || taskDayIndex > 6) return;
        
        // 任务的ID
        const taskId = `task-${task.id}`;
        
        // 原始事件数据
        const originalEvent = {
          ...task,
          id: task.id,
          title: task.title,
          type: 'task',
          dueDate: taskDueDate,
          name: task.title || t('noTitle')
        };
        
        events.push({
          id: taskId,
          title: task.title || t('noTitle'),
          start: startTime,
          end: endTime,
          color: '#FF9800', // 橙色，与DayView保持一致
          type: 'task',
          allDay: false,
          originalEvent: originalEvent,
          uniqueId: taskId
        });
      });
    }
    
    return events;
  }, [tasks, weekStart, weekEnd, t]);
  
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
              dayEnd: new Date(dayEnd),
              dayIndex: index,
              uniqueId: `${event.type}-${event.id}-day${index}` // Keep ID format for consistency
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
  const onEventClick = (event) => {
    // Call the parent component's handler if provided
    if (handleEventClick) {
      handleEventClick(event);
      return;
    }
    
    // 展示任务详情
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
              key={event.uniqueId}
              className="absolute rounded-md border left-0 p-1 text-xs overflow-hidden cursor-pointer transition-opacity hover:opacity-90 border-amber-300 dark:border-amber-700"
              style={{
                top: `${event.top}%`,
                height: `${Math.max(event.height, 3)}%`, // Minimum height for very short events
                width: `${width}%`,
                left: `${left}%`,
                backgroundColor: `${event.color}20`,
                borderLeft: `3px solid ${event.color}`
              }}
              onClick={() => onEventClick(event)}
            >
              <div className="flex flex-col h-full">
                <div className="font-medium leading-tight truncate flex items-center">
                  {event.title}
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
                onClick={() => onEventClick(event)}
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
    </Card>
  );
} 