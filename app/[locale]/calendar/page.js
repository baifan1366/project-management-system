'use client';

import { useState, useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { Calendar as CalendarIcon, Plus, ChevronLeft, ChevronRight, MoreHorizontal, Filter, Video } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { supabase } from '@/lib/supabase';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, startOfWeek, addDays, getDay, isSameDay, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import { useDispatch, useSelector } from 'react-redux';
//import { fetchTasksByUserId } from '@/lib/redux/features/taskSlice';
import CreateCalendarEvent from '@/components/CreateCalendarEvent';
import { toast } from 'sonner';
import { FaGoogle } from 'react-icons/fa';

export default function CalendarPage() {
  const t = useTranslations('Calendar');
  const dispatch = useDispatch();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState('month'); // month, week, day
  const [googleEvents, setGoogleEvents] = useState([]);
  const [isLoadingGoogle, setIsLoadingGoogle] = useState(false);
  const [isGoogleConnected, setIsGoogleConnected] = useState(false);
  const { tasks = [] } = useSelector((state) => state.tasks);
  const calendarRef = useRef(null);
  const [isCreateEventOpen, setIsCreateEventOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [personalEvents, setPersonalEvents] = useState([]);
  const [isLoadingPersonal, setIsLoadingPersonal] = useState(false);

  // Google日历颜色对应表
  const googleCalendarColors = {
    '1': '#7986cb', // 淡蓝/薰衣草色
    '2': '#33b679', // 绿色
    '3': '#8e24aa', // 紫色
    '4': '#e67c73', // 红色
    '5': '#f6c026', // 黄色
    '6': '#f5511d', // 橙色
    '7': '#039be5', // 蓝色
    '8': '#616161', // 灰色
    '9': '#3f51b5', // 蓝靛色
    '10': '#0b8043', // 青绿色
    '11': '#d60000', // 红褐色
  };

  // 检查用户是否已经连接Google账号
  useEffect(() => {
    async function checkGoogleConnection() {
      try {
        // 获取当前会话
        const { data: { session } } = await supabase.auth.getSession();
        
        // 检查是否登录和provider是否为google
        if (!session) {
          console.log('用户未登录');
          setIsGoogleConnected(false);
          return;
        }
        
        if (session?.user?.app_metadata?.provider === 'google') {
          console.log('检测到Google提供商，正在检查令牌...');
          const accessToken = session?.provider_token;
          const refreshToken = session?.provider_refresh_token;
          
          if (accessToken || refreshToken) {
            console.log('Google令牌可用，连接已建立');
            
            // 尝试调用API验证令牌有效性
            try {
              const testResponse = await fetch(`/api/check-calendar-scope`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  access_token: accessToken,
                  refresh_token: refreshToken,
                }),
              });
              
              const testData = await testResponse.json();
              
              // 更新连接状态
              if (testData.hasCalendarScope) {
                console.log('成功验证Google日历访问权限');
                setIsGoogleConnected(true);
              } else {
                console.log('Google令牌有效但缺少日历权限');
                toast.error(t('googleAuthExpired'), {
                  action: {
                    label: t('goToSettings'),
                    onClick: () => window.location.href = `/${window.location.pathname.split('/')[1]}/settings`
                  }
                });
                setIsGoogleConnected(false);
              }
            } catch (error) {
              console.error('验证Google令牌失败:', error);
              setIsGoogleConnected(false);
            }
          } else {
            console.log('尽管使用Google提供商，但没有可用的Google令牌');
            setIsGoogleConnected(false);
          }
        } else {
          console.log('未使用Google连接');
          setIsGoogleConnected(false);
        }
      } catch (error) {
        console.error('检查Google连接时出错:', error);
        setIsGoogleConnected(false);
      }
    }
    
    checkGoogleConnection();
  }, [t]);

  // 加载任务数据
  // useEffect(() => {
  //   dispatch(fetchTasksByUserId());
  // }, [dispatch]);

  // 获取个人日历事件
  useEffect(() => {
    async function fetchPersonalEvents() {
      setIsLoadingPersonal(true);
      try {
        const startDate = format(startOfMonth(currentDate), 'yyyy-MM-dd');
        const endDate = format(endOfMonth(currentDate), 'yyyy-MM-dd');
        
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          console.error(t('notLoggedIn'));
          return;
        }
        
        const { data, error } = await supabase
          .from('personal_calendar_event')
          .select('*')
          .gte('start_time', `${startDate}T00:00:00`)
          .lte('end_time', `${endDate}T23:59:59`)
          .eq('user_id', session.user.id);
        
        if (error) {
          console.error(t('getPersonalEventsFailed'), error);
          throw error;
        }
        
        setPersonalEvents(data || []);
      } catch (error) {
        console.error(t('getPersonalEventsFailed'), error);
        toast.error(t('getPersonalEventsFailed'));
      } finally {
        setIsLoadingPersonal(false);
      }
    }
    
    fetchPersonalEvents();
  }, [currentDate, t]);

  // 获取Google日历事件
  useEffect(() => {
    if (!isGoogleConnected) return;
    
    async function fetchGoogleEvents() {
      setIsLoadingGoogle(true);
      try {
        const startDate = format(startOfMonth(currentDate), 'yyyy-MM-dd');
        const endDate = format(endOfMonth(currentDate), 'yyyy-MM-dd');
        
        // 获取当前会话信息
        const { data: { session } } = await supabase.auth.getSession();
        const accessToken = session?.provider_token;
        const refreshToken = session?.provider_refresh_token;
        
        if (!accessToken && !refreshToken) {
          console.error(t('noGoogleToken'));
          // 显示一个通知而不是立即设置未连接
          toast.error(t('noGoogleToken'), {
            action: {
              label: t('goToSettings'),
              onClick: () => window.location.href = `/${window.location.pathname.split('/')[1]}/settings`
            }
          });
          return;
        }
        
        const response = await fetch(`/api/google-calendar?start=${startDate}&end=${endDate}&access_token=${accessToken || ''}&refresh_token=${refreshToken || ''}`);
        
        if (response.status === 401) {
          console.error(t('googleAuthExpired'));
          toast.error(t('googleAuthExpired'), {
            action: {
              label: t('goToSettings'),
              onClick: () => window.location.href = `/${window.location.pathname.split('/')[1]}/settings`
            }
          });
          // 不要立即设置未连接，给用户机会刷新权限
          return;
        }
        
        if (!response.ok) {
          const errorData = await response.json();
          console.error(t('getGoogleEventsFailed'), errorData);
          throw new Error(errorData.error || t('getGoogleEventsFailed'));
        }
        
        const data = await response.json();
        console.log('收到Google日历数据:', data);
        console.log('事件列表:', data.items);
        setGoogleEvents(data.items || []);
        console.log('设置到状态后的googleEvents:', data.items?.length);
      } catch (error) {
        console.error(t('getGoogleEventsFailed'), error);
        // 使用更好的错误处理，只显示一次toast
        if (!window.calendarErrorToastShown) {
          window.calendarErrorToastShown = true;
          toast.error(t('getGoogleEventsFailed'), {
            action: {
              label: t('goToSettings'),
              onClick: () => window.location.href = `/${window.location.pathname.split('/')[1]}/settings`
            }
          });
          // 5秒后重置toast状态，允许未来的错误显示
          setTimeout(() => {
            window.calendarErrorToastShown = false;
          }, 5000);
        }
      } finally {
        setIsLoadingGoogle(false);
      }
    }
    
    fetchGoogleEvents();
  }, [currentDate, isGoogleConnected, t]);

  const handlePrevMonth = () => {
    setCurrentDate(prev => subMonths(prev, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(prev => addMonths(prev, 1));
  };

  const handleConnectGoogle = async () => {
    try {
      // 总是请求日历权限
      const scopes = 'https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/calendar.readonly';
      
      // 显示正在连接的通知
      const toastId = toast.loading(t('connectingGoogle') || 'Connecting to Google...');
      
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/${window.location.pathname.split('/')[1]}/calendar`,
          scopes: scopes,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
            include_granted_scopes: 'true'
          },
        },
      });
      
      if (error) {
        console.error(t('connectGoogleFailed'), error);
        toast.dismiss(toastId);
        throw error;
      }
      
      // OAuth流程会自动重定向，不需要处理成功情况
    } catch (err) {
      console.error(t('connectGoogleFailed'), err);
      toast.error(t('connectGoogleFailed'), {
        action: {
          label: t('goToSettings'),
          onClick: () => window.location.href = `/${window.location.pathname.split('/')[1]}/settings`
        }
      });
    }
  };

  const handleOpenCreateEvent = (date = new Date()) => {
    setSelectedDate(date);
    setIsCreateEventOpen(true);
  };

  const handleEventCreated = () => {
    // 刷新数据
    //dispatch(fetchTasksByUserId());
    
    // 刷新个人日历事件
    const fetchPersonalEvents = async () => {
      try {
        setIsLoadingPersonal(true);
        const startDate = format(startOfMonth(currentDate), 'yyyy-MM-dd');
        const endDate = format(endOfMonth(currentDate), 'yyyy-MM-dd');
        
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          console.error(t('notLoggedIn'));
          return;
        }
        
        const { data, error } = await supabase
          .from('personal_calendar_event')
          .select('*')
          .gte('start_time', `${startDate}T00:00:00`)
          .lte('end_time', `${endDate}T23:59:59`)
          .eq('user_id', session.user.id);
        
        if (error) {
          console.error(t('getPersonalEventsFailed'), error);
          throw error;
        }
        
        setPersonalEvents(data || []);
      } catch (error) {
        console.error(t('getPersonalEventsFailed'), error);
        toast.error(t('getPersonalEventsFailed'));
      } finally {
        setIsLoadingPersonal(false);
      }
    };
    
    fetchPersonalEvents();
    
    if (isGoogleConnected) {
      // 刷新Google日历事件
      const fetchGoogleEvents = async () => {
        try {
          setIsLoadingGoogle(true);
          const startDate = format(startOfMonth(currentDate), 'yyyy-MM-dd');
          const endDate = format(endOfMonth(currentDate), 'yyyy-MM-dd');
          
          // 获取当前会话信息
          const { data: { session } } = await supabase.auth.getSession();
          const accessToken = session?.provider_token;
          const refreshToken = session?.provider_refresh_token;
          
          if (!accessToken && !refreshToken) {
            console.error(t('noGoogleToken'));
            return;
          }
          
          const response = await fetch(`/api/google-calendar?start=${startDate}&end=${endDate}&access_token=${accessToken || ''}&refresh_token=${refreshToken || ''}`);
          
          if (response.status === 401) {
            console.error(t('googleAuthExpired'));
            toast.error(t('googleAuthExpired'), {
              action: {
                label: t('goToSettings'),
                onClick: () => window.location.href = `/${window.location.pathname.split('/')[1]}/settings`
              }
            });
            setIsGoogleConnected(false);
            return;
          }
          
          if (!response.ok) {
            const errorData = await response.json();
            console.error(t('getGoogleEventsFailed'), errorData);
            throw new Error(errorData.error || t('getGoogleEventsFailed'));
          }
          
          const data = await response.json();
          setGoogleEvents(data.items || []);
        } catch (error) {
          console.error(t('getGoogleEventsFailed'), error);
          // 使用一个静态变量记录是否显示过toast，避免重复显示
          if (!window.calendarErrorToastShown) {
            window.calendarErrorToastShown = true;
            toast.error(t('getGoogleEventsFailed'), {
              action: {
                label: t('goToSettings'),
                onClick: () => window.location.href = `/${window.location.pathname.split('/')[1]}/settings`
              }
            });
          }
        } finally {
          setIsLoadingGoogle(false);
        }
      };
      
      fetchGoogleEvents();
    }
  };

  const renderCalendarHeader = () => (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center space-x-2">
        <CalendarIcon className="h-5 w-5" />
        <h1 className="text-2xl font-bold">{t('calendar')}</h1>
      </div>
      
      <div className="flex items-center space-x-2">
        <Tabs value={view} onValueChange={setView} className="mr-2">
          <TabsList>
            <TabsTrigger value="month">{t('month')}</TabsTrigger>
            <TabsTrigger value="week">{t('week')}</TabsTrigger>
            <TabsTrigger value="day">{t('day')}</TabsTrigger>
          </TabsList>
        </Tabs>
        
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="icon" onClick={handlePrevMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="font-medium">
            {format(currentDate, 'MMMM yyyy')}
          </div>
          <Button variant="outline" size="icon" onClick={handleNextMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        
        <Button variant="outline">
          <Filter className="h-4 w-4 mr-2" />
          {t('filter')}
        </Button>
        
        <Button onClick={() => handleOpenCreateEvent()}>
          <Plus className="h-4 w-4 mr-2" />
          {t('newEvent')}
        </Button>
      </div>
    </div>
  );

  // 渲染月视图
  const renderMonthView = () => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const startDate = startOfWeek(monthStart);
    const days = [];

    const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    
    // 添加调试日志
    console.log('月视图渲染，总Google事件数:', googleEvents?.length);
    console.log('当前月份:', format(currentDate, 'yyyy-MM'));

    // 处理多天事件
    const processMultiDayEvents = () => {
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
    };
    
    const multiDayEvents = processMultiDayEvents();
    
    // 创建一个更好的数据结构来存储每周的事件
    const weekEventsList = Array(6).fill().map(() => []);

    // 将多天事件分配到各个受影响的周
    multiDayEvents.forEach(event => {
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
            weekEventsList[weekIdx].push({
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
    weekEventsList.forEach((weekEvents, weekIdx) => {
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
            const isSame = isSameDay(eventStart, day);
            // 调试特定日期
            if (format(day, 'yyyy-MM-dd') === '2025-04-04') {
              console.log('检查2025-04-04的事件:', event.summary, '日期:', event.start.dateTime || event.start.date, '匹配:', isSame);
            }
            return isSame;
          }
          return false;
        } catch (err) {
          console.error('解析事件日期出错:', err, '事件:', event);
          return false;
        }
      });

      // 输出特定日期的事件数量
      if (isCurrentMonth && dayEvents.length > 0) {
        console.log(`${formattedDate}有${dayEvents.length}个Google事件`);
      }

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

  // 渲染周视图
  const renderWeekView = () => {
    // 周视图实现（基本结构）
    return (
      <Card className="p-3">
        <div className="min-h-[600px] flex flex-col">
          <div className="grid grid-cols-8 border-b">
            <div className="py-2 px-3 text-center font-medium"></div>
            {Array.from({ length: 7 }).map((_, index) => {
              const date = addDays(startOfWeek(currentDate), index);
              return (
                <div 
                  key={index} 
                  className="py-2 px-3 text-center font-medium border-l cursor-pointer hover:bg-accent/5"
                  onClick={() => handleOpenCreateEvent(date)}
                >
                  <div>{t(format(date, 'EEE').toLowerCase())}</div>
                  <div className={cn(
                    "inline-flex h-7 w-7 items-center justify-center rounded-full text-sm mx-auto mt-1",
                    isSameDay(date, new Date()) && "bg-primary text-primary-foreground"
                  )}>
                    {format(date, 'd')}
                  </div>
                </div>
              );
            })}
          </div>
          
          <div className="flex-1 overflow-auto">
            {/* 时间段和事件将在这里渲染 */}
            <div className="text-center py-10 text-muted-foreground">
              {!isGoogleConnected ? (
                <div>
                  <p className="mb-4">{t('connectGoogleCalendarPrompt')}</p>
                  <div className="flex justify-center space-x-2">
                    <Button onClick={handleConnectGoogle}>
                      {t('connectGoogle')}
                    </Button>
                    <Button variant="outline" onClick={() => window.location.href = `/${window.location.pathname.split('/')[1]}/settings`}>
                      {t('goToSettings')}
                    </Button>
                  </div>
                </div>
              ) : (
                <p>{t('weekViewComingSoon')}</p>
              )}
            </div>
          </div>
        </div>
      </Card>
    );
  };

  // 渲染日视图
  const renderDayView = () => {
    // 日视图实现（基本结构）
    return (
      <Card className="p-3">
        <div className="min-h-[600px]">
          <div className="text-center py-10 text-muted-foreground">
            {!isGoogleConnected ? (
              <div>
                <p className="mb-4">{t('connectGoogleCalendarPrompt')}</p>
                <div className="flex justify-center space-x-2">
                  <Button onClick={handleConnectGoogle}>
                    {t('connectGoogle')}
                  </Button>
                  <Button variant="outline" onClick={() => window.location.href = `/${window.location.pathname.split('/')[1]}/settings`}>
                    {t('goToSettings')}
                  </Button>
                </div>
              </div>
            ) : (
              <p>{t('dayViewComingSoon')}</p>
            )}
          </div>
        </div>
      </Card>
    );
  };

  return (
    <div className="h-screen flex flex-col" style={Object.entries(googleCalendarColors).reduce((acc, [id, color]) => {
      acc[`--google-${id}`] = color;
      return acc;
    }, {})}>
      <div className="flex-none py-6">
        {renderCalendarHeader()}
      </div>
      
      <div className="flex-1 overflow-hidden">
        <div className="h-[calc(100vh-120px)] grid grid-cols-12 gap-4">
          <div className="col-span-2">
            <Card className="h-full p-4 overflow-y-auto">
              <h3 className="font-medium mb-3">{t('calendars')}</h3>
              
              <div className="space-y-2">
                <div className="flex items-center">
                  <div className="w-3 h-3 rounded-full bg-blue-500 mr-2"></div>
                  <span>{t('myCalendar')}</span>
                </div>
                
                <div className="flex items-center">
                  <div className="w-3 h-3 rounded-full bg-purple-500 mr-2"></div>
                  <span>{t('personalCalendar')}</span>
                </div>
                
                {isGoogleConnected ? (
                  <div className="flex items-center">
                    <div className="w-3 h-3 rounded-full bg-green-500 mr-2"></div>
                    <span>{t('googleCalendar')}</span>
                  </div>
                ) : (
                  <Button 
                    variant="outline" 
                    className="w-full justify-start" 
                    onClick={handleConnectGoogle}
                  >
                    <FaGoogle/>
                    <span>{t('connectGoogle')}</span>
                  </Button>
                )}
              </div>
              
              <div className="mt-6">
                <h3 className="font-medium mb-3">{t('myTasks')}</h3>
                <div className="space-y-2">
                  <div className="flex items-center">
                    <div className="w-3 h-3 rounded-full bg-orange-500 mr-2"></div>
                    <span>{t('allTasks')}</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-3 h-3 rounded-full bg-yellow-500 mr-2"></div>
                    <span>{t('upcomingTasks')}</span>
                  </div>
                </div>
              </div>
            </Card>
          </div>
          
          <div className="col-span-10 overflow-hidden">
            <div className="h-full overflow-y-auto">
              {view === 'month' && renderMonthView()}
              {view === 'week' && renderWeekView()}
              {view === 'day' && renderDayView()}
            </div>
          </div>
        </div>
      </div>
      
      <CreateCalendarEvent 
        isOpen={isCreateEventOpen} 
        setIsOpen={setIsCreateEventOpen} 
        selectedDate={selectedDate}
        onSuccess={handleEventCreated}
        isGoogleConnected={isGoogleConnected}
      />
    </div>
  );
}
