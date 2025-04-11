'use client';

import { useMemo } from 'react';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { format, addDays, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, startOfWeek, getDay, isSameDay, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import { Video, MoreHorizontal } from 'lucide-react';
import { toast } from 'sonner';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

export default function MonthView({
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
  // 计算月份的开始和结束日期
  const monthStart = useMemo(() => startOfMonth(currentDate), [currentDate]);
  const monthEnd = useMemo(() => endOfMonth(currentDate), [currentDate]);
  const startDate = useMemo(() => startOfWeek(monthStart), [monthStart]);
  
  // 创建日期数组
  const days = useMemo(() => {
    return eachDayOfInterval({ start: startDate, end: addDays(startDate, 41) });
  }, [startDate]);
  
  // 处理多天事件
  const processMultiDayEvents = useMemo(() => {
    const allEvents = [];
    
    // 处理Google事件
    if (googleEvents && googleEvents.length > 0) {
      googleEvents.forEach(event => {
        try {
          const startDateTime = parseISO(event.start.dateTime || event.start.date);
          const endDateTime = parseISO(event.end.dateTime || event.end.date);
          const duration = Math.ceil((endDateTime - startDateTime) / (1000 * 60 * 60 * 24));
          
          // 只处理跨越多天的事件
          if (duration > 1) {
            let eventColor = '#4285F4'; // 默认蓝色
            if (event.colorId && googleCalendarColors[event.colorId]) {
              eventColor = googleCalendarColors[event.colorId];
            }
            
            allEvents.push({
              id: event.id,
              title: event.summary || '无标题事件',
              start: startDateTime,
              end: endDateTime,
              color: eventColor,
              type: 'google',
              hangoutLink: event.hangoutLink
            });
          }
        } catch (err) {
          console.error('处理多天Google事件出错:', err);
        }
      });
    }
    
    // 处理个人事件
    if (personalEvents && personalEvents.length > 0) {
      personalEvents.forEach(event => {
        try {
          const startDateTime = parseISO(event.start_time);
          const endDateTime = parseISO(event.end_time);
          const duration = Math.ceil((endDateTime - startDateTime) / (1000 * 60 * 60 * 24));
          
          // 只处理跨越多天的事件
          if (duration > 1) {
            allEvents.push({
              id: event.id,
              title: event.title,
              start: startDateTime,
              end: endDateTime,
              color: event.color || '#9c27b0',
              type: 'personal'
            });
          }
        } catch (err) {
          console.error('处理多天个人事件出错:', err);
        }
      });
    }
    
    // 根据开始日期排序
    return allEvents.sort((a, b) => a.start - b.start);
  }, [googleEvents, personalEvents, googleCalendarColors]);
  
  // 创建一个更好的数据结构来存储每周的事件
  const weekEventsList = useMemo(() => {
    const list = Array(6).fill().map(() => []);
    
    // 将多天事件分配到各个受影响的周
    processMultiDayEvents.forEach(event => {
      // 计算事件跨越的周
      const eventStart = event.start < startDate ? startDate : event.start;
      // 修正：结束日期减去1天，因为Google日历的结束日期通常是事件后的第一天
      const eventEnd = new Date(Math.min(
        event.end.getTime() - 1, // 减去1毫秒确保不会多出一天
        addDays(startDate, 41).getTime()
      ));
      const startWeekIndex = Math.floor((eventStart - startDate) / (7 * 24 * 60 * 60 * 1000));
      const endWeekIndex = Math.floor((eventEnd - startDate) / (7 * 24 * 60 * 60 * 1000));
      
      // 确保索引有效
      if (startWeekIndex >= 0 && startWeekIndex < 6) {
        // 遍历每一周
        for (let weekIdx = startWeekIndex; weekIdx <= Math.min(endWeekIndex, 5); weekIdx++) {
          // 计算在当前周的开始和结束日期
          const weekStart = addDays(startDate, weekIdx * 7);
          const weekEnd = addDays(weekStart, 6);
          const displayStart = eventStart < weekStart ? weekStart : eventStart;
          const displayEnd = eventEnd > weekEnd ? weekEnd : eventEnd;
          // 修正计算持续时间的方法
          const durationMs = displayEnd.getTime() - displayStart.getTime();
          const days = Math.floor(durationMs / (1000 * 60 * 60 * 24));
          const daysDuration = Math.min(
            days + 1,
            7 - getDay(displayStart)
          );
          
          if (daysDuration > 0) {
            list[weekIdx].push({
              ...event,
              displayStart,
              displayEnd,
              isStart: isSameDay(displayStart, event.start),
              isEnd: isSameDay(displayEnd, event.end) || isSameDay(displayEnd, weekEnd),
              startOffset: getDay(displayStart),
              duration: daysDuration
            });
          }
        }
      }
    });
    
    // 为每周的事件分配行号
    list.forEach((weekEvents, weekIdx) => {
      // 按开始时间排序
      weekEvents.sort((a, b) => a.displayStart - b.displayStart);
      
      // 用于跟踪已分配的行
      const occupiedRows = [];
      
      // 为每个事件分配行
      weekEvents.forEach(event => {
        let rowIndex = 0;
        
        // 找到一个可用的行
        while (
          occupiedRows.some(
            item => 
              item.rowIndex === rowIndex && 
              !(item.end < event.displayStart || item.start > event.displayEnd)
          )
        ) {
          rowIndex++;
        }
        
        // 标记这一行被占用
        occupiedRows.push({
          rowIndex,
          start: event.displayStart,
          end: event.displayEnd
        });
        
        // 设置事件的行号
        event.rowIndex = rowIndex;
      });
    });
    
    return list;
  }, [processMultiDayEvents, startDate]);
  
  // 渲染月视图
  const renderMonthView = () => {
    const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    
    // 创建日历头部 (星期几)
    const calendarHeader = (
      <div className="grid grid-cols-7 gap-px">
        {daysOfWeek.map(day => (
          <div key={day} className="h-8 flex items-center justify-center font-medium text-sm">
            {t(day.toLowerCase())}
          </div>
        ))}
      </div>
    );

    // 获取当前月份的所有日期
    let day = startDate;
    let weekRows = [];
    let currentWeekDays = [];
    
    for (let i = 0; i < 42; i++) {
      const formattedDate = format(day, 'yyyy-MM-dd');
      const isCurrentMonth = isSameMonth(day, currentDate);
      const isToday = isSameDay(day, new Date());
      const currentDay = new Date(day);
      
      // 获取该日期的任务
      const dayTasks = tasks.filter(task => 
        task.due_date && isSameDay(parseISO(task.due_date), day)
      );

      // 获取该日期的单日Google事件
      const dayEvents = googleEvents.filter(event => {
        try {
          const eventStart = parseISO(event.start.dateTime || event.start.date);
          const eventEnd = parseISO(event.end.dateTime || event.end.date);
          const duration = Math.ceil((eventEnd - eventStart) / (1000 * 60 * 60 * 24));
          
          // 只处理单日事件
          if (duration <= 1) {
            return isSameDay(eventStart, day);
          }
          return false;
        } catch (err) {
          console.error('解析事件日期出错:', err, '事件:', event);
          return false;
        }
      });

      // 获取该日期的单日个人事件
      const dayPersonalEvents = personalEvents.filter(event => {
        try {
          const eventStart = parseISO(event.start_time);
          const eventEnd = parseISO(event.end_time);
          const duration = Math.ceil((eventEnd - eventStart) / (1000 * 60 * 60 * 24));
          
          // 只处理单日事件
          if (duration <= 1) {
            return isSameDay(eventStart, day);
          }
          return false;
        } catch (err) {
          console.error('解析个人事件日期出错:', err);
          return false;
        }
      });

      const dayCellContent = (
        <div className="flex flex-col h-full">
          <div className="flex justify-between items-start mb-2">
            <span className={cn(
              "inline-flex h-5 w-5 items-center justify-center rounded-full text-xs",
              isToday && "bg-primary text-primary-foreground font-medium"
            )}>
              {format(day, 'd')}
            </span>
            {(isCurrentMonth && (dayTasks.length > 0 || dayEvents.length > 0 || dayPersonalEvents.length > 0)) && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-5 w-5">
                    <MoreHorizontal className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={(e) => {
                    e.stopPropagation();
                    handleOpenCreateEvent(currentDay);
                  }}>
                    {t('addEvent')}
                  </DropdownMenuItem>
                  <DropdownMenuItem>{t('viewAll')}</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>

          <div className="space-y-0.5 mt-10 max-h-[75px] overflow-y-auto">
            {dayTasks.map((task) => (
              <div 
                key={`task-${task.id}`} 
                className="text-xs py-0.5 px-1 bg-blue-100 dark:bg-blue-900/30 rounded truncate"
                title={task.title}
              >
                {task.title}
              </div>
            ))}

            {dayEvents.map((event) => (
              <div 
                key={`event-${event.id}`} 
                className={cn(
                  "text-xs py-0.5 px-1 rounded truncate group cursor-pointer hover:bg-green-200 dark:hover:bg-green-800/30",
                  event.hangoutLink 
                    ? "bg-emerald-100 dark:bg-emerald-900/40" 
                    : "bg-green-100 dark:bg-green-900/30"
                )}
                title={`${event.summary}${event.hangoutLink ? ` (${t('hasMeetLink')})` : ''}`}
                onClick={(e) => {
                  e.stopPropagation();
                  if (event.hangoutLink) {
                    window.open(event.hangoutLink, '_blank');
                  }
                }}
              >
                <div className="flex items-center justify-between">
                  <span className="truncate">{event.summary || '无标题事件'}</span>
                  {event.hangoutLink && (
                    <Video className="h-2.5 w-2.5 ml-1 text-emerald-600 dark:text-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                  )}
                </div>
              </div>
            ))}

            {dayPersonalEvents.map((event) => (
              <div 
                key={`personal-${event.id}`} 
                className="text-xs py-0.5 px-1 bg-purple-100 dark:bg-purple-900/30 rounded truncate"
                style={event.color ? {backgroundColor: `${event.color}20`} : {}}
                title={event.title}
              >
                {event.title}
              </div>
            ))}
          </div>
        </div>
      );

      currentWeekDays.push(
        <div 
          key={formattedDate}
          className={cn(
            "min-h-[120px] p-1.5 pt-1 border border-border/50 cursor-pointer transition-colors relative",
            !isCurrentMonth && "bg-muted/30 text-muted-foreground",
            isToday && "bg-accent/10",
            "hover:bg-accent/5"
          )}
          onClick={() => handleOpenCreateEvent(currentDay)}
        >
          {dayCellContent}
        </div>
      );

      // 如果一周结束或到最后一天，处理这一周
      const isLastDay = i === 41;
      const isWeekEnd = getDay(day) === 6;
      
      if (isWeekEnd || isLastDay) {
        const weekIndex = Math.floor(i / 7);
        
        // 将当前周的日期添加到周行
        weekRows.push(
          <div key={`week-${weekIndex}`} className="relative grid grid-cols-7 gap-px">
            {currentWeekDays}
            
            {/* 渲染这一周的多天事件 */}
            {weekEventsList[weekIndex] && weekEventsList[weekIndex].map((event, idx) => {
              if (!event) return null;
              
              // 只有在当前周有显示的部分时才渲染
              return (
                <div
                  key={`multi-${event.id}-${weekIndex}-${idx}`}
                  className={cn(
                    "absolute text-xs py-0.5 px-1 z-10 rounded-md truncate whitespace-nowrap",
                    event.type === 'google' ? "bg-green-100/80 dark:bg-green-900/50" : "bg-purple-100/80 dark:bg-purple-900/50",
                    !event.isStart && "rounded-l-none border-l-0",
                    !event.isEnd && "rounded-r-none border-r-0",
                    "hover:opacity-90 hover:shadow transition-all cursor-pointer"
                  )}
                  style={{
                    left: `calc(${event.startOffset / 7 * 100}% + 3px)`,
                    width: `calc(${event.duration / 7 * 100}% - 6px)`,
                    top: `${25 + event.rowIndex * 16}px`,
                    height: '15px',
                    backgroundColor: event.color ? `${event.color}30` : undefined,
                    borderLeft: event.isStart ? `3px solid ${event.color}` : 'none',
                    borderRight: event.isEnd ? `1px solid ${event.color}40` : 'none',
                    zIndex: 20
                  }}
                  title={`${event.title} (${format(event.start, 'yyyy/MM/dd')} - ${format(event.end, 'yyyy/MM/dd')})`}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (event.type === 'google' && event.hangoutLink) {
                      window.open(event.hangoutLink, '_blank');
                    } else {
                      // 可以在此添加点击事件的其他处理
                      toast.info(`${event.title} (${format(event.start, 'yyyy/MM/dd')} - ${format(event.end, 'yyyy/MM/dd')})`);
                    }
                  }}
                >
                  <div className="flex items-center h-full">
                    <span className="truncate text-[10px]">{event.title}</span>
                    {event.type === 'google' && event.hangoutLink && (
                      <Video className="h-2 w-2 ml-1 flex-shrink-0" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        );
        
        // 重置当前周
        currentWeekDays = [];
      }
      
      day = addDays(day, 1);
    }

    return (
      <Card className="p-2">
        {calendarHeader}
        <div className="mt-px">
          {weekRows}
        </div>
      </Card>
    );
  };

  return (
    <>
      {renderMonthView()}
      
      {/* Google Calendar connection prompt */}
      {!isGoogleConnected && (
        <div className="p-4 text-center">
          <p className="mb-2 text-sm text-muted-foreground">{t('connectGoogleCalendarPrompt')}</p>
          <Button onClick={handleConnectGoogle} className="mr-2">
            {t('connectGoogle')}
          </Button>
        </div>
      )}
    </>
  );
} 