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
import { fetchTasks } from '@/lib/redux/features/taskSlice';
import CreateCalendarEvent from '@/components/CreateCalendarEvent';
import { toast } from 'sonner';

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
  useEffect(() => {
    dispatch(fetchTasks());
  }, [dispatch]);

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
        setGoogleEvents(data.events || []);
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
    dispatch(fetchTasks());
    
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
          setGoogleEvents(data.events || []);
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
    for (let i = 0; i < 42; i++) {
      const formattedDate = format(day, 'yyyy-MM-dd');
      const isCurrentMonth = isSameMonth(day, currentDate);
      const isToday = isSameDay(day, new Date());
      const currentDay = new Date(day);
      
      // 获取该日期的任务
      const dayTasks = tasks.filter(task => 
        task.due_date && isSameDay(parseISO(task.due_date), day)
      );

      // 获取该日期的Google事件
      const dayEvents = googleEvents.filter(event => {
        const eventStart = parseISO(event.start.dateTime || event.start.date);
        return isSameDay(eventStart, day);
      });

      // 获取该日期的个人事件
      const dayPersonalEvents = personalEvents.filter(event => {
        const eventStart = parseISO(event.start_time);
        return isSameDay(eventStart, day);
      });

      days.push(
        <div 
          key={formattedDate}
          className={cn(
            "min-h-[90px] p-1.5 border border-border/50 cursor-pointer transition-colors",
            !isCurrentMonth && "bg-muted/30 text-muted-foreground",
            isToday && "bg-accent/10",
            "hover:bg-accent/5"
          )}
          onClick={() => handleOpenCreateEvent(currentDay)}
        >
          <div className="flex justify-between items-start">
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

          <div className="mt-0.5 space-y-0.5 max-h-[60px] overflow-y-auto">
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
                  <span className="truncate">{event.summary}</span>
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

      day = addDays(day, 1);
    }

    return (
      <Card className="p-2">
        {calendarHeader}
        <div className="grid grid-cols-7 gap-px mt-px">
          {days}
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
    <div className="h-screen flex flex-col">
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
                    <img 
                      src="https://upload.wikimedia.org/wikipedia/commons/5/53/Google_%22G%22_Logo.svg" 
                      alt="Google" 
                      className="h-5 w-5 mr-2" 
                    />
                    {t('connectGoogle')}
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
