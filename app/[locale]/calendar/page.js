'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { Calendar as CalendarIcon, Plus, ChevronLeft, ChevronRight, MoreHorizontal, Filter, Video } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { supabase } from '@/lib/supabase';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, startOfWeek, addDays, getDay, isSameDay, parseISO, addHours, set } from 'date-fns';
import { cn } from '@/lib/utils';
import { useDispatch, useSelector } from 'react-redux';
//import { fetchTasksByUserId } from '@/lib/redux/features/taskSlice';
import CreateCalendarEvent from '@/components/CreateCalendarEvent';
import { toast } from 'sonner';
import { FaGoogle } from 'react-icons/fa';
import { WeekView, DayView } from '@/components/calendar';
import { Skeleton } from '@/components/ui/skeleton';
import { useGetUser } from '@/lib/hooks/useGetUser';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import EventDetailsDialog from '@/components/EventDetailsDialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';

export default function CalendarPage() {
  const t = useTranslations('Calendar');
  const dispatch = useDispatch();
  const { user: currentUser, isLoading: userLoading } = useGetUser();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState('month'); // month, week, day
  const [googleEvents, setGoogleEvents] = useState([]);
  const [isLoadingGoogle, setIsLoadingGoogle] = useState(false);
  const [isGoogleConnected, setIsGoogleConnected] = useState(false);
  const [tasks, setTasks] = useState([]); // Changed from using redux state to local state
  const [isLoadingTasks, setIsLoadingTasks] = useState(false); // Added loading state for tasks
  const calendarRef = useRef(null);
  const [isCreateEventOpen, setIsCreateEventOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [personalEvents, setPersonalEvents] = useState([]);
  const [isLoadingPersonal, setIsLoadingPersonal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isViewLoading, setIsViewLoading] = useState(false);
  const [userLoadTimeout, setUserLoadTimeout] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [selectedEventType, setSelectedEventType] = useState(null);
  const [isEventDetailsOpen, setIsEventDetailsOpen] = useState(false);
  const [isEditingEvent, setIsEditingEvent] = useState(false);
  const [eventToEdit, setEventToEdit] = useState(null);
  
  // Add the state for the all events dialog
  const [isAllEventsOpen, setIsAllEventsOpen] = useState(false);
  const [allEventsData, setAllEventsData] = useState({
    date: null,
    tasks: [],
    googleEvents: [],
    personalEvents: []
  });

  // Filter states
  const [filters, setFilters] = useState({
    personalEvents: true,
    googleEvents: true,
    tasks: true
  });

  // Add a safety timeout to prevent waiting forever for user data
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (userLoading) {
        setUserLoadTimeout(true);
      }
    }); // 3 seconds timeout
    
    return () => clearTimeout(timeoutId);
  }, [userLoading]);

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
        // 使用自定义hook获取用户信息
        if (!currentUser) {
          setIsGoogleConnected(false);
          setIsLoading(false); // 如果未登录，立即结束加载状态
          return;
        }
        
        // 使用google_provider_id检查是否连接了Google
        if (currentUser?.google_provider_id) {
          // 从用户元数据中获取 tokens
          const response = await fetch('/api/users/tokens?provider=google', {
            cache: 'no-store', // Add no-store to prevent caching
            headers: {
              'Cache-Control': 'no-cache, no-store, must-revalidate',
              'Pragma': 'no-cache'
            }
          });
          if (!response.ok) {
            console.error('获取Google令牌失败');
            setIsGoogleConnected(false);
            return;
          }
          
          const tokens = await response.json();
          const accessToken = tokens.access_token;
          const refreshToken = tokens.refresh_token;
          
          if (accessToken || refreshToken) {
            // 假设令牌存在就表示已连接 - 简化认证流程
            setIsGoogleConnected(true);
            
            // 仍然验证令牌有效性，但不阻止日历显示
            try {
              const testResponse = await fetch(`/api/check-calendar-scope`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Cache-Control': 'no-cache, no-store, must-revalidate',
                  'Pragma': 'no-cache'
                },
                body: JSON.stringify({
                  access_token: accessToken,
                  refresh_token: refreshToken,
                  user_id: currentUser.id
                }),
              });
              
              const testData = await testResponse.json();
              
              // 只在令牌无效时显示错误
              if (!testData.hasCalendarScope) {
                console.warn('日历权限可能已过期或不完整');
              }
            } catch (error) {
              console.error('验证Google令牌失败:', error);
              // 不改变连接状态，仍然尝试加载日历
            }
          } else {
            setIsGoogleConnected(false);
          }
        } else {
          setIsGoogleConnected(false);
        }
      } catch (error) {
        console.error('检查Google连接时出错:', error);
        setIsGoogleConnected(false);
      } finally {
        // 在完成Google连接检查后，更新加载状态
        if (!isLoadingGoogle && !isLoadingPersonal) {
          setIsLoading(false);
        }
      }
    }
    
    // Only run the check when user loading completes OR timeout occurs AND we have a user
    if ((!userLoading || userLoadTimeout) && currentUser) {
      checkGoogleConnection();
    } else if ((!userLoading || userLoadTimeout) && !currentUser) {
      setIsGoogleConnected(false);
      setIsLoading(false);
    }
  }, [currentUser, userLoading, t, userLoadTimeout, isLoadingGoogle, isLoadingPersonal]);

  // 获取任务的标题
  const getTaskTitle = React.useCallback((task) => {
    if (task.title) return task.title;
    if (!task?.tag_values) return null;
    
    // 通过分析示例数据，推断数字键与字段的映射关系
    const fieldKeyMap = {
      'title': 1,        // 1 对应标题/描述
    };
    
    // 首先检查是否有这个映射
    const mappedKey = fieldKeyMap['title'];
    if (mappedKey !== undefined && task.tag_values[mappedKey]) {
      return task.tag_values[mappedKey];
    }
    
    return null;
  }, []);
  
  // 加载任务数据 - 替换之前的Redux dispatch
  useEffect(() => {
    const fetchUserTasks = async () => {
      if (!currentUser || !currentUser.id) return;

      try {
        setIsLoadingTasks(true);
        
        // 获取mytasks表中的当前用户的任务
        const { data: userMyTasks, error: myTasksError } = await supabase
          .from('mytasks')
          .select('*')
          .eq('user_id', currentUser.id);
        
        if (myTasksError) throw myTasksError;
        
        
        // 准备合并的任务列表
        let combinedTasks = [];
        
        // 处理有关联task_id的任务
        const tasksWithReference = userMyTasks.filter(mt => mt.task_id !== null);
        const standaloneMyTasks = userMyTasks.filter(mt => mt.task_id === null);
        
        // 获取关联的任务详情
        if (tasksWithReference.length > 0) {
          const taskIds = tasksWithReference.map(mt => mt.task_id);
          
          const { data: taskDetails, error: taskError } = await supabase
            .from('task')
            .select('*')
            .in('id', taskIds);
            
          if (taskError) throw taskError;
          
          // 合并关联的任务
          const linkedTasks = taskDetails.map(task => {
            const myTask = tasksWithReference.find(mt => mt.task_id === task.id);
            const taskDueDate = task.due_date || null;
            const myTaskCompletionDate = myTask.expected_completion_date || null;
            const myTaskStartDate = myTask.expected_start_time || null;
            
            // 日期处理，确保两种日期字段都存在或至少一个存在
            return {
              ...task,
              my_task_id: myTask.id,
              status: myTask.status,
              title: myTask.title || getTaskTitle(task),
              description: myTask.description,
              // 确保日期字段使用正确的格式
              expected_start_time: myTaskStartDate,
              expected_completion_date: myTaskCompletionDate,
              due_date: taskDueDate || myTaskCompletionDate
            };
          });
          
          combinedTasks = [...linkedTasks];
        }
        
        // 添加独立任务（没有关联task_id的mytasks记录）
        const standaloneTasks = standaloneMyTasks.map(myTask => {
          const myTaskCompletionDate = myTask.expected_completion_date || null;
          const myTaskStartDate = myTask.expected_start_time || null;
          
          return {
            id: `local-${myTask.id}`,
            my_task_id: myTask.id,
            tag_values: {},
            status: myTask.status,
            title: myTask.title,
            description: myTask.description,
            expected_start_time: myTaskStartDate,
            expected_completion_date: myTaskCompletionDate,
            due_date: myTaskCompletionDate, // 确保 due_date 字段也设置
            is_standalone: true
          };
        });
        
        // 合并所有任务
        combinedTasks = [...combinedTasks, ...standaloneTasks];
        
        setTasks(combinedTasks);
      } catch (error) {
        console.error('获取任务失败:', error);
        toast.error(t('getTasksFailed'));
      } finally {
        setIsLoadingTasks(false);
        // 更新加载状态
        if (isViewLoading && !isLoadingGoogle && !isLoadingPersonal) {
          setIsViewLoading(false);
        }
        // 如果初始加载尚未完成
        if (isLoading && (!isGoogleConnected || !isLoadingGoogle) && !isLoadingPersonal) {
          setIsLoading(false);
        }
      }
    };
    
    if (currentUser && (!userLoading || userLoadTimeout)) {
      fetchUserTasks();
    }
  }, [currentUser, userLoading, userLoadTimeout, getTaskTitle, t, isViewLoading, isLoading, isGoogleConnected, isLoadingGoogle, isLoadingPersonal, currentDate]);

  // 获取个人日历事件
  useEffect(() => {
    async function fetchPersonalEvents() {
      if (isViewLoading) {
        setIsLoadingPersonal(true);
      }
      try {
        const startDate = format(startOfMonth(currentDate), 'yyyy-MM-dd');
        const endDate = format(endOfMonth(currentDate), 'yyyy-MM-dd');
        
        if (!currentUser) {
          console.error(t('notLoggedIn'));
          return;
        }
        
        const { data, error } = await supabase
          .from('personal_calendar_event')
          .select('*')
          .gte('start_time', `${startDate}T00:00:00`)
          .lte('end_time', `${endDate}T23:59:59`)
          .eq('user_id', currentUser.id);
        
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
        // 更新加载状态
        if (isViewLoading) {
          setIsViewLoading(false);
        }
        // 如果初始加载尚未完成，并且Google事件也已加载完成（或不需要加载），则完成初始加载
        if (isLoading && (!isGoogleConnected || !isLoadingGoogle)) {
          setIsLoading(false);
        }
      }
    }
    
    if (currentUser && (!userLoading || userLoadTimeout)) {
      fetchPersonalEvents();
    }
  }, [currentDate, t, isViewLoading, isLoading, isGoogleConnected, isLoadingGoogle, currentUser, userLoading, userLoadTimeout]);

  // 获取Google日历事件
  useEffect(() => {
    
    if (!isGoogleConnected) {
      if (isViewLoading) {
        setIsViewLoading(false);
      }
      return;
    }
    
    if (!currentUser && !userLoadTimeout) {
      return;
    }
    
    async function fetchGoogleEvents() {
      setIsLoadingGoogle(true);
      try {
        const startDate = format(startOfMonth(currentDate), 'yyyy-MM-dd');
        const endDate = format(endOfMonth(currentDate), 'yyyy-MM-dd');
        
        // 使用我们的自定义API端点获取Google令牌，而不是Supabase session
        const tokensResponse = await fetch('/api/users/tokens?provider=google', {
          cache: 'no-store', // Add no-store to prevent caching
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache'
          }
        });
        if (!tokensResponse.ok) {
          console.error('获取Google令牌失败:', tokensResponse.status);
          return;
        }
        
        const tokens = await tokensResponse.json();
        const accessToken = tokens.access_token;
        const refreshToken = tokens.refresh_token;
        
        if (!accessToken && !refreshToken) {
          console.error('没有Google令牌');
          return;
        }
        
        // Add user_id for token refreshing
        const response = await fetch(`/api/google-calendar?start=${startDate}&end=${endDate}&access_token=${accessToken || ''}&refresh_token=${refreshToken || ''}&user_id=${currentUser?.id || ''}`);
        
        if (response.status === 401) {
          console.log('尝试刷新令牌并重新获取日历事件');
          
          // Attempt to refresh token explicitly
          const refreshResponse = await fetch('/api/refresh-google-token', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
              refresh_token: refreshToken,
              user_id: currentUser?.id 
            }),
          });
          
          if (refreshResponse.ok) {
            // Token refreshed successfully, retry fetching events
            const refreshData = await refreshResponse.json();
            const newAccessToken = refreshData.access_token;
            
            // Retry with new token
            const retryResponse = await fetch(`/api/google-calendar?start=${startDate}&end=${endDate}&access_token=${newAccessToken}&refresh_token=${refreshToken}&user_id=${currentUser?.id || ''}`);
            
            if (retryResponse.ok) {
              const data = await retryResponse.json();
              setGoogleEvents(data.items || []);
              return;
            }
          }
          
          // If we get here, refresh failed or retry failed
          console.error('Google授权过期且刷新失败:', response.status);
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
          console.error('获取Google日历事件失败:', errorData);
          throw new Error(errorData.error || t('getGoogleEventsFailed'));
        }
        
        const data = await response.json();
        setGoogleEvents(data.items || []);
      } catch (error) {
        console.error('获取Google日历事件异常:', error);
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
        // 检查个人事件是否已完成加载，如果是，则关闭视图加载状态
        if (!isLoadingPersonal) {
          setIsViewLoading(false);
        }
      }
    };
    
    // 只调用Google事件获取，个人事件通过自己的useEffect获取
    fetchGoogleEvents();
  }, [currentDate, isGoogleConnected, t, isViewLoading, isLoading, isLoadingPersonal, currentUser, userLoading, userLoadTimeout]);

  const handlePrevMonth = () => {
    setIsViewLoading(true);
    setCurrentDate(prev => subMonths(prev, 1));
    // Tasks should be refreshed when the useEffect detects the date change
  };

  const handleNextMonth = () => {
    setIsViewLoading(true);
    setCurrentDate(prev => addMonths(prev, 1));
    // Tasks should be refreshed when the useEffect detects the date change
  };

  const handlePrevWeek = () => {
    setIsViewLoading(true);
    setCurrentDate(prev => addDays(prev, -7));
    // Tasks should be refreshed when the useEffect detects the date change
  };

  const handleNextWeek = () => {
    setIsViewLoading(true);
    setCurrentDate(prev => addDays(prev, 7));
    // Tasks should be refreshed when the useEffect detects the date change
  };

  const handlePrevDay = () => {
    setIsViewLoading(true);
    setCurrentDate(prev => addDays(prev, -1));
    // Tasks should be refreshed when the useEffect detects the date change
  };

  const handleNextDay = () => {
    setIsViewLoading(true);
    setCurrentDate(prev => addDays(prev, 1));
    // Tasks should be refreshed when the useEffect detects the date change
  };

  const handleTodayClick = () => {
    setIsViewLoading(true);
    setCurrentDate(new Date());
    // Tasks should be refreshed when the useEffect detects the date change
  };

  const handleConnectGoogle = async () => {
  try {
    // 显示正在连接的通知
    const toastId = toast.loading(t('connectingGoogle') || 'Connecting to Google...');
    
    // Specify that this connection is for the calendar page
    const currentPath = window.location.pathname;
    const searchParams = new URLSearchParams();
    searchParams.append('redirectTo', currentPath);
    searchParams.append('requestCalendarAccess', 'true');
    searchParams.append('from', 'calendar');
    
    // 在一个步骤中请求所有权限，包括Google日历权限
    window.location.href = `/api/auth/google?${searchParams.toString()}`;
    
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
    // Check if the selected date is before today
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset time to start of day for accurate comparison
    
    if (date < today) {
      // If date is in the past, don't open the dialog
      toast.info(t('cantCreateEventInPast') || "Can't create events in the past");
      return;
    }
    
    // Reset editing state when creating a new event
    setIsEditingEvent(false);
    setEventToEdit(null);
    
    setSelectedDate(date);
    setIsCreateEventOpen(true);
  };

  const handleEventCreated = () => {
    // 设置视图加载状态
    setIsViewLoading(true);
    
    // 刷新个人日历事件
    const fetchPersonalEvents = async () => {
      try {
        setIsLoadingPersonal(true);
        const startDate = format(startOfMonth(currentDate), 'yyyy-MM-dd');
        const endDate = format(endOfMonth(currentDate), 'yyyy-MM-dd');
        
        if (!currentUser) {
          console.error(t('notLoggedIn'));
          return;
        }
        
        const { data, error } = await supabase
          .from('personal_calendar_event')
          .select('*')
          .gte('start_time', `${startDate}T00:00:00`)
          .lte('end_time', `${endDate}T23:59:59`)
          .eq('user_id', currentUser.id);
        
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
        // 检查Google是否已完成加载，如果是或不需要加载Google，则关闭视图加载状态
        if (!isLoadingGoogle || !isGoogleConnected) {
          setIsViewLoading(false);
        }
      }
    };
    
    // 刷新Google日历事件
    const fetchGoogleEvents = async () => {
      if (!isGoogleConnected) {
        // 如果没有连接Google，则直接关闭视图加载状态（如果个人事件已完成加载）
        if (!isLoadingPersonal) {
          setIsViewLoading(false);
        }
        return;
      }
      
      try {
        setIsLoadingGoogle(true);
        const startDate = format(startOfMonth(currentDate), 'yyyy-MM-dd');
        const endDate = format(endOfMonth(currentDate), 'yyyy-MM-dd');
        
        // 使用我们的自定义API端点获取Google令牌，而不是Supabase session
        const tokensResponse = await fetch('/api/users/tokens?provider=google');
        if (!tokensResponse.ok) {
          console.error(t('noGoogleToken'));
          return;
        }
        
        const tokens = await tokensResponse.json();
        const accessToken = tokens.access_token;
        const refreshToken = tokens.refresh_token;
        
        if (!accessToken && !refreshToken) {
          console.error(t('noGoogleToken'));
          return;
        }
        
        // Add user_id for token refreshing
        const response = await fetch(`/api/google-calendar?start=${startDate}&end=${endDate}&access_token=${accessToken || ''}&refresh_token=${refreshToken || ''}&user_id=${currentUser.id}`);
        
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
        // 检查个人事件是否已完成加载，如果是，则关闭视图加载状态
        if (!isLoadingPersonal) {
          setIsViewLoading(false);
        }
      }
    };
    
    // 刷新任务数据
    const fetchUserTasks = async () => {
      if (!currentUser) return;
      
      try {
        setIsLoadingTasks(true);
        
        // 获取mytasks表中的当前用户的任务
        const { data: userMyTasks, error: myTasksError } = await supabase
          .from('mytasks')
          .select('*')
          .eq('user_id', currentUser.id);
        
        if (myTasksError) throw myTasksError;
        
        // 准备合并的任务列表
        let combinedTasks = [];
        
        // 处理有关联task_id的任务
        const tasksWithReference = userMyTasks.filter(mt => mt.task_id !== null);
        const standaloneMyTasks = userMyTasks.filter(mt => mt.task_id === null);
        
        // 获取关联的任务详情
        if (tasksWithReference.length > 0) {
          const taskIds = tasksWithReference.map(mt => mt.task_id);
          
          const { data: taskDetails, error: taskError } = await supabase
            .from('task')
            .select('*')
            .in('id', taskIds);
            
          if (taskError) throw taskError;
          
          // 合并关联的任务
          const linkedTasks = taskDetails.map(task => {
            const myTask = tasksWithReference.find(mt => mt.task_id === task.id);
            return {
              ...task,
              my_task_id: myTask.id,
              status: myTask.status,
              title: myTask.title || getTaskTitle(task),
              description: myTask.description,
              expected_completion_date: myTask.expected_completion_date || task.due_date
            };
          });
          
          combinedTasks = [...linkedTasks];
        }
        
        // 添加独立任务（没有关联task_id的mytasks记录）
        const standaloneTasks = standaloneMyTasks.map(myTask => ({
          id: `local-${myTask.id}`,
          my_task_id: myTask.id,
          tag_values: {},
          status: myTask.status,
          title: myTask.title,
          description: myTask.description,
          expected_completion_date: myTask.expected_completion_date,
          due_date: myTask.expected_completion_date,
          is_standalone: true
        }));
        
        // 合并所有任务
        combinedTasks = [...combinedTasks, ...standaloneTasks];
        
        setTasks(combinedTasks);
      } catch (error) {
        console.error('获取任务失败:', error);
        toast.error(t('getTasksFailed'));
      } finally {
        setIsLoadingTasks(false);
        // 检查其他数据是否已完成加载
        if (!isLoadingGoogle && !isLoadingPersonal) {
          setIsViewLoading(false);
        }
      }
    };
    
    // 并行执行数据获取操作
    fetchPersonalEvents();
    if (isGoogleConnected) {
      fetchGoogleEvents();
    }
    fetchUserTasks(); // 添加任务获取
  };

  // 渲染加载骨架屏
  const renderSkeletonCalendar = () => (
    <div className="h-screen flex flex-col">
      <div className="flex-none py-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <Skeleton className="h-5 w-5 rounded-full" />
            <Skeleton className="h-8 w-40" />
          </div>
          
          <div className="flex items-center space-x-2">
            <Skeleton className="h-10 w-48" />
            
            <div className="flex items-center space-x-2">
              <Skeleton className="h-9 w-9 rounded-md" />
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-9 w-9 rounded-md" />
              <Skeleton className="h-9 w-16 rounded-md ml-2" />
            </div>
            
            <Skeleton className="h-9 w-24 rounded-md" />
            <Skeleton className="h-9 w-32 rounded-md" />
          </div>
        </div>
      </div>
      
      <div className="flex-1 overflow-hidden">
        <div className="h-[calc(100vh-120px)] grid grid-cols-12 gap-4">
          <div className="col-span-2">
            <Card className="h-full p-4">
              <Skeleton className="h-6 w-24 mb-3" />
              
              <div className="space-y-3">
                <div className="flex items-center">
                  <Skeleton className="w-3 h-3 rounded-full mr-2" />
                  <Skeleton className="h-4 w-24" />
                </div>
                
                <div className="flex items-center">
                  <Skeleton className="w-3 h-3 rounded-full mr-2" />
                  <Skeleton className="h-4 w-36" />
                </div>
                
                <Skeleton className="h-9 w-full rounded-md mt-1" />
              </div>
              
              <div className="mt-6">
                <Skeleton className="h-6 w-20 mb-3" />
                <div className="space-y-3">
                  <div className="flex items-center">
                    <Skeleton className="w-3 h-3 rounded-full mr-2" />
                    <Skeleton className="h-4 w-20" />
                  </div>
                  <div className="flex items-center">
                    <Skeleton className="w-3 h-3 rounded-full mr-2" />
                    <Skeleton className="h-4 w-32" />
                  </div>
                </div>
              </div>
            </Card>
          </div>
          
          <div className="col-span-10 overflow-hidden">
            {view === 'month' && (
              <Card className="p-2">
                {/* 月视图骨架屏 */}
                <div className="grid grid-cols-7 gap-px">
                  {Array(7).fill().map((_, i) => (
                    <Skeleton key={`week-day-${i}`} className="h-8" />
                  ))}
                </div>
                
                <div className="mt-px">
                  {Array(6).fill().map((_, weekIndex) => (
                    <div key={`week-${weekIndex}`} className="grid grid-cols-7 gap-px mt-px">
                      {Array(7).fill().map((_, dayIndex) => (
                        <Skeleton 
                          key={`view-day-${weekIndex}-${dayIndex}`} 
                          className="h-[70px] sm:min-h-[120px]" 
                        />
                      ))}
                    </div>
                  ))}
                </div>
              </Card>
            )}
            
            {view === 'week' && (
              <Card className="p-0 overflow-hidden">
                {/* 周视图骨架屏 */}
                <div className="grid grid-cols-8 border-b">
                  <div className="py-3 px-3">
                    <Skeleton className="h-10 w-10" />
                  </div>
                  {Array(7).fill().map((_, i) => (
                    <div key={`view-week-header-${i}`} className="py-3 px-3 text-center border-l border-l-border/40">
                      <Skeleton className="h-4 w-16 mx-auto mb-1" />
                      <Skeleton className="h-7 w-7 rounded-full mx-auto" />
                    </div>
                  ))}
                </div>
                
                {/* 全天事件骨架屏 */}
                <div className="grid grid-cols-8 border-b">
                  <div className="py-2 px-3">
                    <Skeleton className="h-4 w-16" />
                  </div>
                  {Array(7).fill().map((_, i) => (
                    <div key={`view-all-day-${i}`} className="py-2 px-2 border-l border-l-border/40">
                      <Skeleton className="h-6 w-full" />
                    </div>
                  ))}
                </div>
              </Card>
            )}
            
            {view === 'day' && (
              <Card className="p-0 overflow-hidden">
                {/* 日视图骨架屏 */}
                <div className="p-4 border-b">
                  <Skeleton className="h-6 w-64 mx-auto" />
                </div>
                
                {/* 全天事件骨架屏 */}
                <div className="p-2 border-b">
                  <Skeleton className="h-4 w-16 mb-2" />
                  <Skeleton className="h-10 w-full" />
                </div>
                
                {/* 时间网格骨架屏 */}
                <div className="grid grid-cols-[80px_1fr] overflow-y-auto">
                  {Array(24).fill().map((_, i) => (
                    <React.Fragment key={`view-day-time-${i}`}>
                      <div className="h-14 pr-3 text-right py-1 border-t border-t-border/40">
                        <Skeleton className="h-3 w-12 ml-auto mt-1" />
                      </div>
                      <div className="h-14 relative border-t border-t-border/40">
                        {i % 3 === 1 && (
                              <Skeleton 
                                className="absolute h-12 w-[95%] top-1 left-[2.5%] rounded-md"
                              />
                            )}
                      </div>
                    </React.Fragment>
                  ))}
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
  
  if (isLoading) {
    return renderSkeletonCalendar();
  }

  // 修改视图切换函数以添加加载效果
  const handleViewChange = (newView) => {
    if (newView === view) return;
    
    setIsViewLoading(true);
    setView(newView);
  };
  
  // Filter events based on current filter settings
  const filteredGoogleEvents = filters.googleEvents ? googleEvents : [];
  const filteredPersonalEvents = filters.personalEvents ? personalEvents : [];
  const filteredTasks = filters.tasks ? tasks : [];

  const handleFilterChange = (filterType) => {
    setFilters(prev => ({
      ...prev,
      [filterType]: !prev[filterType]
    }));
  };

  // 修改日历头部以使用新的视图切换函数
  const renderCalendarHeader = () => (
    <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4 gap-3">
      <div className="flex items-center space-x-2">
        <CalendarIcon className="h-5 w-5" />
        <h1 className="text-2xl font-bold">{t('calendar')}</h1>
      </div>
      
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:space-x-2">
        <Tabs value={view} onValueChange={handleViewChange} className="w-full sm:w-auto sm:mr-2">
          <TabsList className="w-full">
            <TabsTrigger value="month">{t('month')}</TabsTrigger>
            <TabsTrigger value="week">{t('week')}</TabsTrigger>
            <TabsTrigger value="day">{t('day')}</TabsTrigger>
          </TabsList>
        </Tabs>
        
        <div className="flex items-center justify-between sm:justify-start w-full sm:w-auto space-x-2">
          <Button variant="outline" size="icon" onClick={() => {
            if (view === 'month') handlePrevMonth();
            else if (view === 'week') handlePrevWeek();
            else handlePrevDay();
          }}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="font-medium whitespace-nowrap">
            {view === 'month' && format(currentDate, 'MMM yyyy')}
            {view === 'week' && `${format(startOfWeek(currentDate), 'MMM d')} - ${format(addDays(startOfWeek(currentDate), 6), 'MMM d')}`}
            {view === 'day' && format(currentDate, 'MMM d, yyyy')}
          </div>
          <Button variant="outline" size="icon" onClick={() => {
            if (view === 'month') handleNextMonth();
            else if (view === 'week') handleNextWeek();
            else handleNextDay();
          }}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="outline" className="sm:ml-2" size="sm" onClick={handleTodayClick}>
            {t('today')}
          </Button>
        </div>
        
        <div className="flex gap-2 w-full sm:w-auto justify-between sm:justify-start">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm">
                <Filter className="h-4 w-4 mr-2" />
                <span className="sm:inline">{t('filter')}</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-56">
              <div className="space-y-4">
                <h4 className="font-medium">{t('showEvents')}</h4>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="filter-personal-events" 
                      checked={filters.personalEvents}
                      onCheckedChange={() => handleFilterChange('personalEvents')}
                    />
                    <Label htmlFor="filter-personal-events" className="flex items-center">
                      <div className="w-3 h-3 rounded-full bg-purple-500 mr-2"></div>
                      <span>{t('personalCalendar')}</span>
                    </Label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="filter-google-events" 
                      checked={filters.googleEvents}
                      onCheckedChange={() => handleFilterChange('googleEvents')}
                      disabled={!isGoogleConnected}
                    />
                    <Label htmlFor="filter-google-events" className="flex items-center">
                      <div className="w-3 h-3 rounded-full bg-green-500 mr-2"></div>
                      <span>{t('googleCalendar')}</span>
                    </Label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="filter-tasks" 
                      checked={filters.tasks}
                      onCheckedChange={() => handleFilterChange('tasks')}
                    />
                    <Label htmlFor="filter-tasks" className="flex items-center">
                      <div className="w-3 h-3 rounded-full bg-blue-500 mr-2"></div>
                      <span>{t('myTasks')}</span>
                    </Label>
                  </div>
                </div>
              </div>
            </PopoverContent>
          </Popover>
          
          <Button onClick={() => handleOpenCreateEvent()} size="sm">
            <Plus className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">{t('newEvent')}</span>
          </Button>
        </div>
      </div>
    </div>
  );

  // Update WeekView component
  const handleUpdateComponentsForTasks = () => {

    const filteredTasks = filters.tasks ? tasks.map(task => {
      // Ensure we have a date field for display on the calendar
      // We prioritize due_date and fall back to expected_completion_date
      if (!task.due_date && task.expected_completion_date) {
        task.due_date = task.expected_completion_date;
      }
      
      // Make sure all tasks have a title
      if (!task.title) {
        task.title = t('noTitle') || 'No Title';
      }
      
      // Make sure expected_start_time exists
      if (!task.expected_start_time) {
        // If no start time, set it to the beginning of the due date
        const dueDate = task.due_date || task.expected_completion_date;
        if (dueDate) {
          const date = parseISO(dueDate);
          // Set to beginning of the day, but preserve the date
          task.expected_start_time = format(set(date, { hours: 9, minutes: 0, seconds: 0 }), "yyyy-MM-dd'T'HH:mm:ss");
        }
      }
      
      return task;
    }) : [];
    
    return filteredTasks;
  };

  // 渲染月视图
  const renderMonthView = () => {
    const monthStart = startOfMonth(currentDate);
    const startDate = startOfWeek(monthStart);
    const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    // 创建日历头部 (星期几)
    const calendarHeader = (
      <div className="grid grid-cols-7 gap-px">
        {daysOfWeek.map(day => (
          <div key={day} className="h-8 flex items-center justify-center font-medium text-sm">
            {/* Show short abbreviation on small screens */}
            <span className="block sm:hidden">{t(day.toLowerCase())[0]}</span>
            <span className="hidden sm:block">{t(day.toLowerCase())}</span>
          </div>
        ))}
      </div>
    );
    
    // 获取月份日期并处理成周
    const weekRows = getMonthDays();

    // 修改月视图以支持拖拽
    return (
      <DragDropContext onDragEnd={handleDragEnd}>
        <Card className="p-2">
          {calendarHeader}
          <div className="mt-px">
            {weekRows}
          </div>
        </Card>
      </DragDropContext>
    );
  };

  // 添加处理拖拽结束的函数
  const handleDragEnd = async (result) => {
    const { source, destination, draggableId } = result;
    
    // 如果没有目标或拖动到原位置，不做任何处理
    if (!destination || 
        (source.droppableId === destination.droppableId && 
         source.index === destination.index)) {
      return;
    }
    
    try {
      // 解析事件ID和类型
      const [eventType, eventId] = draggableId.split('-');
      
      // 解析源日期和目标日期
      const sourceDate = parseISO(source.droppableId);
      const destinationDate = parseISO(destination.droppableId);
      
      // 如果目标日期在过去，显示错误并返回
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (destinationDate < today) {
        toast.error(t('cantMoveEventToPast') || "Can't move events to past dates");
        return;
      }
      
      // 获取要移动的事件
      let eventToUpdate;
      let originalStart;
      let originalEnd;
      
      if (eventType === 'task') {
        eventToUpdate = tasks.find(task => task.my_task_id && task.my_task_id.toString() === eventId);
        if (eventToUpdate) {
          originalStart = eventToUpdate.expected_start_time ? parseISO(eventToUpdate.expected_start_time) : parseISO(eventToUpdate.due_date || eventToUpdate.expected_completion_date);
          originalEnd = parseISO(eventToUpdate.due_date || eventToUpdate.expected_completion_date);
        }
      } else if (eventType === 'google') {
        eventToUpdate = googleEvents.find(event => event.id === eventId);
        if (eventToUpdate) {
          originalStart = parseISO(eventToUpdate.start.dateTime || eventToUpdate.start.date);
          originalEnd = parseISO(eventToUpdate.end.dateTime || eventToUpdate.end.date);
        }
      } else if (eventType === 'personal') {
        eventToUpdate = personalEvents.find(event => event.id && event.id.toString() === eventId);
        if (eventToUpdate) {
          originalStart = parseISO(eventToUpdate.start_time);
          originalEnd = parseISO(eventToUpdate.end_time);
        }
      }
      
      if (!eventToUpdate) {
        console.error('Event not found:', eventType, eventId);
        return;
      }
      
      // 计算日期差异
      const diffDays = Math.floor((destinationDate - sourceDate) / (1000 * 60 * 60 * 24));
      
      // 计算新的开始和结束时间
      const newStart = addDays(originalStart, diffDays);
      const newEnd = addDays(originalEnd, diffDays);
      
      // 准备事件更新数据
      const eventData = {
        id: eventId, // Pass the ID directly
        type: eventType,
        newStart,
        newEnd,
        originalEvent: eventToUpdate
      };
            
      // 调用事件更新函数
      await handleEventUpdate(eventData);
      
    } catch (error) {
      console.error('拖拽更新事件失败:', error);
      toast.error(t('updateEventFailed') || 'Failed to update event');
    }
  };

  // 创建可拖拽的事件项组件
  const DraggableEventItem = ({ event, eventType, index }) => {
    // 根据事件类型确定事件ID
    let eventId;
    if (eventType === 'task') {
      // For tasks, we need to make sure we're using my_task_id
      eventId = event.my_task_id ? event.my_task_id.toString() : (event.id ? event.id.toString() : '');
    } else {
      eventId = event.id ? event.id.toString() : '';
    }
    
    const draggableId = `${eventType}-${eventId}`;
    
    // 确定样式和标题
    let className = '';
    let title = '';
    
    if (eventType === 'task') {
      className = "text-xs py-0.5 px-1 bg-blue-100 dark:bg-blue-900/30 rounded truncate cursor-pointer hover:bg-blue-200 dark:hover:bg-blue-800/30";
      title = event.title || t('noTitle');
    } else if (eventType === 'google') {
      className = event.hangoutLink 
        ? "text-xs py-0.5 px-1 bg-emerald-100 dark:bg-emerald-900/40 rounded truncate group cursor-pointer hover:bg-green-200 dark:hover:bg-green-800/30"
        : "text-xs py-0.5 px-1 bg-green-100 dark:bg-green-900/30 rounded truncate group cursor-pointer hover:bg-green-200 dark:hover:bg-green-800/30";
      title = `${event.summary || t('untitledEvent')}${event.hangoutLink ? ` (${t('hasMeetLink')})` : ''}`;
    } else if (eventType === 'personal') {
      className = "text-xs py-0.5 px-1 bg-purple-100 dark:bg-purple-900/30 rounded truncate cursor-pointer hover:bg-purple-200 dark:hover:bg-purple-800/30";
      title = event.title || t('untitledEvent');
    }
    
    // Check if event is in the past
    const now = new Date();
    now.setHours(0, 0, 0, 0); // Set to start of day
    
    let eventDate;
    if (eventType === 'task') {
      eventDate = event.due_date || event.expected_completion_date;
      eventDate = eventDate ? parseISO(eventDate) : null;
    } else if (eventType === 'google') {
      eventDate = parseISO(event.end?.dateTime || event.end?.date);
    } else if (eventType === 'personal') {
      eventDate = parseISO(event.end_time);
    }
    
    const isPastEvent = eventDate && eventDate < now;
    
    // If event is in the past, render a non-draggable version
    if (isPastEvent) {
      return (
        <div
          className={`${className} opacity-70`}
          style={{
            ...(eventType === 'personal' && event.color ? {backgroundColor: `${event.color}20`} : {})
          }}
          onClick={(e) => {
            e.stopPropagation();
            handleEventClick(event, eventType);
          }}
          title={title + (isPastEvent ? ' (' + t('pastEvent') + ')' : '')}
        >
          <div className="flex items-center justify-between max-w-full">
            <span className="truncate break-all">{eventType === 'google' ? (event.summary || t('untitledEvent')) : (event.title || t('untitledEvent'))}</span>
            {eventType === 'google' && event.hangoutLink && (
              <Video className="h-2.5 w-2.5 ml-1 flex-shrink-0 text-emerald-600 dark:text-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity" />
            )}
          </div>
        </div>
      );
    }
    
    return (
      <Draggable
        draggableId={draggableId}
        index={index}
        key={draggableId}
      >
        {(provided) => (
          <div
            ref={provided.innerRef}
            {...provided.draggableProps}
            {...provided.dragHandleProps}
            className={className}
            style={{
              ...provided.draggableProps.style,
              ...(eventType === 'personal' && event.color ? {backgroundColor: `${event.color}20`} : {})
            }}
            onClick={(e) => {
              e.stopPropagation();
              handleEventClick(event, eventType);
            }}
          >
            <div className="flex items-center justify-between max-w-full">
              <span className="truncate break-all">{eventType === 'google' ? (event.summary || t('untitledEvent')) : (event.title || t('untitledEvent'))}</span>
              {eventType === 'google' && event.hangoutLink && (
                <Video className="h-2.5 w-2.5 ml-1 flex-shrink-0 text-emerald-600 dark:text-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity" />
              )}
            </div>
          </div>
        )}
      </Draggable>
    );
  };

  // 修改月份单元格内容渲染函数
  const renderDayEvents = (day, dayTasks, dayEvents, dayPersonalEvents) => {
    const formattedDate = format(day, 'yyyy-MM-dd');
    
    return (
      <Droppable droppableId={formattedDate} type="DAY_EVENT">
        {(provided) => (
          <div 
            className="space-y-0.5 mt-auto max-h-[50px] sm:max-h-[75px] overflow-y-auto text-xs"
            ref={provided.innerRef}
            {...provided.droppableProps}
          >
            {dayTasks.slice(0, 3).map((task, index) => (
              <DraggableEventItem 
                key={`task-${task.my_task_id}`}
                event={task}
                eventType="task"
                index={index}
              />
            ))}

            {dayEvents.slice(0, 3).map((event, index) => (
              <DraggableEventItem 
                key={`google-${event.id}`}
                event={event}
                eventType="google"
                index={dayTasks.length + index}
              />
            ))}

            {dayPersonalEvents.slice(0, 3).map((event, index) => (
              <DraggableEventItem 
                key={`personal-${event.id}`}
                event={event}
                eventType="personal"
                index={dayTasks.length + dayEvents.length + index}
              />
            ))}
            
            {/* Show a more indicator if there are more events than we're displaying */}
            {(dayTasks.length + dayEvents.length + dayPersonalEvents.length) > 3 && (
              <div className="text-xs text-muted-foreground text-center">
                +{(dayTasks.length + dayEvents.length + dayPersonalEvents.length) - 3} more
              </div>
            )}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    );
  };

  // 修改日期单元格渲染
  const renderDayCell = (day, dayTasks, dayEvents, dayPersonalEvents) => {
    const formattedDate = format(day, 'yyyy-MM-dd');
    const isCurrentMonth = isSameMonth(day, currentDate);
    const isToday = isSameDay(day, new Date());
    const currentDay = new Date(day);
    
    return (
      <div 
        key={formattedDate}
        className={cn(
          "min-h-[80px] sm:min-h-[120px] p-1 sm:p-1.5 pt-1 border border-border/50 cursor-pointer transition-colors relative",
          !isCurrentMonth && "bg-muted/30 text-muted-foreground",
          isToday && "bg-accent/10",
          new Date(day) < new Date(new Date().setHours(0,0,0,0)) ? "opacity-70" : "hover:bg-accent/5"
        )}
        onClick={() => {
          // Only open create event dialog for current or future dates
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          if (new Date(day) >= today) {
            handleOpenCreateEvent(currentDay);
          } else {
            toast.info(t('cantCreateEventInPast') || "Can't create events in the past");
          }
        }}
      >
        <div className="flex flex-col h-full">
          <div className="flex justify-between items-start mb-1 sm:mb-2">
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
                  {/* Only show Add Event for current or future dates */}
                  {new Date(day) >= new Date(new Date().setHours(0,0,0,0)) && (
                    <DropdownMenuItem onClick={(e) => {
                      e.stopPropagation();
                      handleOpenCreateEvent(currentDay);
                    }}>
                      {t('addEvent')}
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={(e) => {
                    e.stopPropagation();
                    handleViewAllEvents(currentDay, dayTasks, dayEvents, dayPersonalEvents);
                  }}>
                    {t('viewAll')}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>

          {renderDayEvents(day, dayTasks, dayEvents, dayPersonalEvents)}
        </div>
      </div>
    );
  };

  // 修改月份渲染逻辑中的日期生成部分
  const getMonthDays = () => {
    // 获取当前月份的所有日期
    const monthStart = startOfMonth(currentDate);
    const startDate = startOfWeek(monthStart);
    
    // 删除多天事件处理逻辑，不再需要
    // 以下代码将被移除
    /*
    // 处理多天事件
    const processMultiDayEvents = () => {
      const allEvents = [];
      
      // 处理Google事件
      if (filteredGoogleEvents && filteredGoogleEvents.length > 0) {
        filteredGoogleEvents.forEach(event => {
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
      if (filteredPersonalEvents && filteredPersonalEvents.length > 0) {
        filteredPersonalEvents.forEach(event => {
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
    */
    
    // 不再需要weekEventsList
    // const weekEventsList = [];
    
    let day = startDate;
    let weekRows = [];
    let currentWeekDays = [];
    
    for (let i = 0; i < 42; i++) {
      const formattedDate = format(day, 'yyyy-MM-dd');
      const isCurrentMonth = isSameMonth(day, currentDate);
      const currentDay = new Date(day);
      
      // 获取该日期的任务
      const dayTasks = filteredTasks.filter(task => {
        // 检查不同的日期字段，因为任务可能使用不同的日期字段
        const dueDate = task.due_date || task.expected_completion_date;
        return dueDate && isSameDay(parseISO(dueDate), day);
      });

      // 获取该日期的单日Google事件
      const dayEvents = filteredGoogleEvents.filter(event => {
        try {
          const eventStart = parseISO(event.start.dateTime || event.start.date);
          // 不再考虑事件的持续时间，只检查事件开始日期是否与当前日期相同
          return isSameDay(eventStart, day);
        } catch (err) {
          console.error('解析事件日期出错:', err);
          return false;
        }
      });

      // 获取该日期的单日个人事件
      const dayPersonalEvents = filteredPersonalEvents.filter(event => {
        try {
          const eventStart = parseISO(event.start_time);
          // 不再考虑事件的持续时间，只检查事件开始日期是否与当前日期相同
          return isSameDay(eventStart, day);
        } catch (err) {
          console.error('解析个人事件日期出错:', err);
          return false;
        }
      });

      currentWeekDays.push(renderDayCell(day, dayTasks, dayEvents, dayPersonalEvents));

      // 如果一周结束或到最后一天，处理这一周
      const isLastDay = i === 41;
      const isWeekEnd = getDay(day) === 6;
      
      if (isWeekEnd || isLastDay) {
        const weekIndex = Math.floor(i / 7);
        
        // 将当前周的日期添加到周行
        weekRows.push(
          <div key={`week-${weekIndex}`} className="relative grid grid-cols-7 gap-px">
            {currentWeekDays}
            
            {/* 删除渲染这一周的多天事件的代码 */}
            {/*
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
                    handleEventClick(event, event.type);
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
            */}
          </div>
        );
        
        // 重置当前周
        currentWeekDays = [];
      }
      
      day = addDays(day, 1);
    }
    
    return weekRows;
  };

  // 渲染周视图
  const renderWeekView = () => {
    const processedTasks = handleUpdateComponentsForTasks();
    
    return (
      <WeekView
        currentDate={currentDate}
        handleOpenCreateEvent={handleOpenCreateEvent}
        t={t}
        isGoogleConnected={isGoogleConnected}
        handleConnectGoogle={handleConnectGoogle}
        googleEvents={filteredGoogleEvents}
        personalEvents={filteredPersonalEvents}
        tasks={processedTasks}
        googleCalendarColors={googleCalendarColors}
        handleEventClick={handleEventClick}
        onEventUpdate={handleEventUpdate}
      />
    );
  };

  // 渲染日视图
  const renderDayView = () => {
    const processedTasks = handleUpdateComponentsForTasks();
    
    return (
      <DayView
        currentDate={currentDate}
        handleOpenCreateEvent={handleOpenCreateEvent}
        t={t}
        isGoogleConnected={isGoogleConnected}
        handleConnectGoogle={handleConnectGoogle}
        googleEvents={filteredGoogleEvents}
        personalEvents={filteredPersonalEvents}
        tasks={processedTasks}
        googleCalendarColors={googleCalendarColors}
        handleEventClick={handleEventClick}
        onEventUpdate={handleEventUpdate}
      />
    );
  };

  // Handle event click
  const handleEventClick = (event, eventType) => {
    setSelectedEvent(event);
    setSelectedEventType(eventType);
    setIsEventDetailsOpen(true);
  };
  
  // Handle edit event
  const handleEditEvent = (event, eventType) => {
    // Close the details dialog
    setIsEventDetailsOpen(false);
    
    if (eventType === 'google') {
      // For Google events, set editing state and open the create dialog
      const startDateTime = event.start?.dateTime ? parseISO(event.start.dateTime) : parseISO(event.start.date);
      const endDateTime = event.end?.dateTime ? parseISO(event.end.dateTime) : parseISO(event.end.date);
      
      const eventForEdit = {
        ...event,
        originalEvent: event, // Keep the original event data for reference
        id: event.id,
        title: event.summary,
        description: event.description || '',
        isAllDay: !event.start?.dateTime,
        location: event.location || '',
        startDate: startDateTime,
        endDate: endDateTime,
        startTime: event.start?.dateTime ? format(startDateTime, 'HH:mm') : '00:00',
        endTime: event.end?.dateTime ? format(endDateTime, 'HH:mm') : '23:59',
        addGoogleMeet: !!event.hangoutLink,
        color: event.colorId || '1',
        attendees: event.attendees || [],
        type: 'google'
      };
      
      setEventToEdit(eventForEdit);
      setIsEditingEvent(true);
      setIsCreateEventOpen(true);
    } 
    else if (eventType === 'personal') {
      // For personal events, prepare the data for editing
      const startDateTime = parseISO(event.start_time);
      const endDateTime = parseISO(event.end_time);
      const isAllDay = format(startDateTime, 'HH:mm') === '00:00' && format(endDateTime, 'HH:mm') === '23:59';
      
      const eventForEdit = {
        ...event,
        id: event.id,
        title: event.title || '',
        description: event.description || '',
        isAllDay: isAllDay,
        location: event.location || '',
        startDate: startDateTime,
        endDate: endDateTime,
        startTime: format(startDateTime, 'HH:mm'),
        endTime: format(endDateTime, 'HH:mm'),
        color: event.color || '#9c27b0',
        type: 'personal'
      };
      
      setEventToEdit(eventForEdit);
      setIsEditingEvent(true);
      setIsCreateEventOpen(true);
    }
    else if (eventType === 'task') {
      // For tasks, prepare the data for editing
      const dueDate = event.due_date || event.expected_completion_date;
      const taskDateTime = dueDate ? parseISO(dueDate) : new Date();
      const startDateTime = event.expected_start_time ? parseISO(event.expected_start_time) : taskDateTime;
      
      const eventForEdit = {
        ...event,
        id: event.my_task_id, // The ID of the mytask record
        title: event.title || '',
        description: event.description || '',
        startDate: startDateTime,
        endDate: taskDateTime,
        startTime: format(startDateTime, 'HH:mm'),
        endTime: format(taskDateTime, 'HH:mm'),
        isAllDay: false,
        type: 'task'
      };
      
      setEventToEdit(eventForEdit);
      setIsEditingEvent(true);
      setIsCreateEventOpen(true);
    }
  };

  // Add the handleViewAllEvents function before the return statement
  const handleViewAllEvents = (date, tasks, googleEvents, personalEvents) => {
    setAllEventsData({
      date,
      tasks,
      googleEvents,
      personalEvents
    });
    setIsAllEventsOpen(true);
  };

  // Add the event update handler
  const handleEventUpdate = async (eventData) => {
    // Set loading state for the view
    setIsViewLoading(true);
    
    try {
      // Check if the update involves a past date
      const now = new Date();
      now.setHours(0, 0, 0, 0); // Set to beginning of day
      
      if (eventData.newEnd < now) {
        toast.error(t('cantModifyPastEvents') || "Cannot modify events in the past");
        setIsViewLoading(false);
        return;
      }
      
      // Handle update based on event type
      if (eventData.type === 'google') {
        // Google Calendar event update
        const { id, newStart, newEnd } = eventData;
        
        // Format dates for Google Calendar API
        const startDateTime = format(newStart, "yyyy-MM-dd'T'HH:mm:ss");
        const endDateTime = format(newEnd, "yyyy-MM-dd'T'HH:mm:ss");
        
        // Get tokens
        const tokensResponse = await fetch('/api/users/tokens?provider=google');
        if (!tokensResponse.ok) {
          throw new Error(t('noGoogleToken'));
        }
        
        const tokens = await tokensResponse.json();
        const accessToken = tokens.access_token;
        const refreshToken = tokens.refresh_token;
        
        if (!accessToken && !refreshToken) {
          throw new Error(t('noGoogleToken'));
        }
        
        // Original event to preserve all fields except dates
        const originalEvent = eventData.originalEvent;
        
        // Update only the start and end times
        const updatedEventData = {
          ...originalEvent,
          start: {
            dateTime: startDateTime,
            timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
          },
          end: {
            dateTime: endDateTime,
            timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
          }
        };
        
        // Call API to update the event
        const response = await fetch(`/api/google-calendar/events/${id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            eventData: updatedEventData,
            accessToken,
            refreshToken,
            userId: currentUser?.id,
            sendUpdates: 'none' // Don't send notifications for drag operations
          }),
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || t('updateEventFailed'));
        }
        
        toast.success(t('eventUpdated'));
        
      } else if (eventData.type === 'personal') {
        // Personal calendar event update
        const { id, newStart, newEnd } = eventData;
        
        // Format dates for database
        const startDateTime = format(newStart, "yyyy-MM-dd'T'HH:mm:ss");
        const endDateTime = format(newEnd, "yyyy-MM-dd'T'HH:mm:ss");
        
        // Update in Supabase
        const { error } = await supabase
          .from('personal_calendar_event')
          .update({
            start_time: startDateTime,
            end_time: endDateTime,
          })
          .eq('id', id);
        
        if (error) {
          throw error;
        }
        
        toast.success(t('eventUpdated'));
        
      } else if (eventData.type === 'task') {
        // Task update
        const { id, newStart, newEnd } = eventData;
        
        // Format dates for database
        const startDate = format(newStart, "yyyy-MM-dd'T'HH:mm:ss");
        const dueDate = format(newEnd, "yyyy-MM-dd'T'HH:mm:ss");
        
        // Update in Supabase
        const { error } = await supabase
          .from('mytasks')
          .update({
            expected_start_time: startDate,
            expected_completion_date: dueDate
          })
          .eq('id', id);
        
        if (error) {
          throw error;
        }
        
        toast.success(t('taskUpdated'));
      }
      
      // Refresh the events after successful update
      handleEventCreated();
      
    } catch (error) {
      console.error('Failed to update event:', error);
      toast.error(t('updateEventFailed') || 'Failed to update event');
    } finally {
      // End loading state
      setIsViewLoading(false);
    }
  };

  return (
    <div className="h-screen flex flex-col" style={Object.entries(googleCalendarColors).reduce((acc, [id, color]) => {
      acc[`--google-${id}`] = color;
      return acc;
    }, {})}>
      <div className="flex-none py-3 md:py-6 px-3 md:px-6">
        {renderCalendarHeader()}
      </div>
      
      <div className="flex-1 overflow-hidden">
        <div className="h-[calc(100vh-120px)] grid grid-cols-1 md:grid-cols-12 gap-4 px-3 md:px-6">
          {/* Desktop sidebar */}
          <div className="hidden md:block md:col-span-2">
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
                    <FaGoogle className="mr-2" />
                    <span>{t('connectGoogle')}</span>
                  </Button>
                )}
              </div>
            </Card>
          </div>
          
          {/* Mobile calendar sidebar */}
          <div className="block md:hidden mb-3">
            <Card className="p-3">
              <div className="flex items-center justify-between">
                <h3 className="font-medium">{t('calendars')}</h3>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-56">
                    <div className="space-y-3">
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
                            className="w-full justify-start text-sm" 
                            size="sm"
                            onClick={handleConnectGoogle}
                          >
                            <FaGoogle className="mr-2" />
                            <span>{t('connectGoogle')}</span>
                          </Button>
                        )}
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            </Card>
          </div>
          
          <div className="col-span-1 md:col-span-10 overflow-hidden">
            {isViewLoading ? (
              // Responsive skeleton loaders
              <>
                {view === 'month' && (
                  <Card className="p-2 overflow-x-auto">
                    {/* Month view skeleton */}
                    <div className="grid grid-cols-7 gap-px min-w-[700px]">
                      {Array(7).fill().map((_, i) => (
                        <Skeleton key={`view-week-day-${i}`} className="h-8" />
                      ))}
                    </div>
                    
                    <div className="mt-px">
                      {Array(6).fill().map((_, weekIndex) => (
                        <div key={`view-week-${weekIndex}`} className="grid grid-cols-7 gap-px mt-px">
                          {Array(7).fill().map((_, dayIndex) => (
                            <Skeleton 
                              key={`view-day-${weekIndex}-${dayIndex}`} 
                              className="h-[70px] sm:min-h-[120px]" 
                            />
                          ))}
                        </div>
                      ))}
                    </div>
                  </Card>
                )}
                
                {view === 'week' && (
                  <Card className="p-0 overflow-x-auto">
                    {/* Week view skeleton */}
                    <div className="grid grid-cols-8 border-b min-w-[700px]">
                      <div className="py-3 px-3">
                        <Skeleton className="h-10 w-10" />
                      </div>
                      {Array(7).fill().map((_, i) => (
                        <div key={`view-week-header-${i}`} className="py-3 px-3 text-center border-l border-l-border/40">
                          <Skeleton className="h-4 w-16 mx-auto mb-1" />
                          <Skeleton className="h-7 w-7 rounded-full mx-auto" />
                        </div>
                      ))}
                    </div>
                    
                    {/* All-day events skeleton */}
                    <div className="grid grid-cols-8 border-b min-w-[700px]">
                      <div className="py-2 px-3">
                        <Skeleton className="h-4 w-16" />
                      </div>
                      {Array(7).fill().map((_, i) => (
                        <div key={`view-all-day-${i}`} className="py-2 px-2 border-l border-l-border/40">
                          <Skeleton className="h-6 w-full" />
                        </div>
                      ))}
                    </div>
                  </Card>
                )}
                
                {view === 'day' && (
                  <Card className="p-0 overflow-hidden">
                    {/* Day view skeleton */}
                    <div className="p-4 border-b">
                      <Skeleton className="h-6 w-64 mx-auto" />
                    </div>
                    
                    {/* All-day events skeleton */}
                    <div className="p-2 border-b">
                      <Skeleton className="h-4 w-16 mb-2" />
                      <Skeleton className="h-10 w-full" />
                    </div>
                    
                    {/* Time grid skeleton */}
                    <div className="grid grid-cols-[80px_1fr] overflow-y-auto">
                      {Array(24).fill().map((_, i) => (
                        <React.Fragment key={`view-day-time-${i}`}>
                          <div className="h-14 pr-3 text-right py-1 border-t border-t-border/40">
                            <Skeleton className="h-3 w-12 ml-auto mt-1" />
                          </div>
                          <div className="h-14 relative border-t border-t-border/40">
                            {i % 3 === 1 && (
                              <Skeleton 
                                className="absolute h-12 w-[95%] top-1 left-[2.5%] rounded-md"
                              />
                            )}
                          </div>
                        </React.Fragment>
                      ))}
                    </div>
                  </Card>
                )}
              </>
            ) : (
              <div className="h-full overflow-x-auto">
                {view === 'month' && (
                  <div className="min-w-[700px]">
                    {renderMonthView()}
                  </div>
                )}
                {view === 'week' && (
                  <div className="min-w-[700px]">
                    {renderWeekView()}
                  </div>
                )}
                {view === 'day' && renderDayView()}
              </div>
            )}
          </div>
        </div>
      </div>
      
      <CreateCalendarEvent 
        isOpen={isCreateEventOpen} 
        setIsOpen={setIsCreateEventOpen} 
        selectedDate={selectedDate}
        onSuccess={handleEventCreated}
        isGoogleConnected={isGoogleConnected}
        isEditing={isEditingEvent}
        eventToEdit={eventToEdit}
      />
      
      <EventDetailsDialog
        isOpen={isEventDetailsOpen}
        setIsOpen={setIsEventDetailsOpen}
        event={selectedEvent}
        eventType={selectedEventType}
        onEdit={handleEditEvent}
        onSuccess={handleEventCreated}
      />
      
      {/* Add the AllEventsDialog component */}
      <Dialog open={isAllEventsOpen} onOpenChange={setIsAllEventsOpen}>
        <DialogContent className="max-w-[700px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {allEventsData.date && format(allEventsData.date, 'MMMM d, yyyy')}
            </DialogTitle>
            <p className="text-sm text-muted-foreground">
              {allEventsData.tasks.length + allEventsData.googleEvents.length + allEventsData.personalEvents.length} {t((allEventsData.tasks.length + allEventsData.googleEvents.length + allEventsData.personalEvents.length) === 1 ? 'event' : 'events')}
            </p>
          </DialogHeader>
          
          {/* Tasks Section */}
          {allEventsData.tasks.length > 0 && (
            <div className="mb-4">
              <h4 className="text-sm font-medium mb-2">{t('tasks')}</h4>
              <div className="space-y-2">
                {allEventsData.tasks.map((task) => (
                  <div 
                    key={`all-task-${task.id}`} 
                    className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded cursor-pointer hover:bg-blue-200 dark:hover:bg-blue-800/30"
                    onClick={() => {
                      setIsAllEventsOpen(false);
                      handleEventClick(task, 'task');
                    }}
                  >
                    <div className="font-medium break-words truncate">{task.title || t('noTitle')}</div>
                    {task.description && <div className="text-xs mt-1 break-words line-clamp-2">{task.description}</div>}
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Google Events Section */}
          {allEventsData.googleEvents.length > 0 && (
            <div className="mb-4">
              <h4 className="text-sm font-medium mb-2">{t('googleCalendar')}</h4>
              <div className="space-y-2">
                {allEventsData.googleEvents.map((event) => {
                  const hasTime = !!event.start?.dateTime;
                  const startDateTime = parseISO(event.start?.dateTime || event.start?.date);
                  const endDateTime = parseISO(event.end?.dateTime || event.end?.date);
                  const timeStr = hasTime ? 
                    `${format(startDateTime, 'HH:mm')} - ${format(endDateTime, 'HH:mm')}` : 
                    t('allDay');
                  
                  return (
                                          <div 
                      key={`all-google-${event.id}`} 
                      className={`p-2 rounded cursor-pointer ${event.hangoutLink ? 'bg-emerald-100 dark:bg-emerald-900/40 border-l-2 border-emerald-500' : 'bg-green-100 dark:bg-green-900/30'} hover:bg-opacity-80`}
                      onClick={() => {
                        setIsAllEventsOpen(false);
                        handleEventClick(event, 'google');
                      }}
                    >
                      <div className="font-medium break-words truncate">{event.summary || t('untitledEvent')}</div>
                      <div className="text-xs mt-1">{timeStr}</div>
                      {event.location && <div className="text-xs mt-1 break-words line-clamp-1">{event.location}</div>}
                      {event.hangoutLink && (
                        <div className="text-xs mt-1 flex items-center">
                          <Video className="h-3 w-3 mr-1 flex-shrink-0" />
                          {t('hasMeetLink')}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          
          {/* Personal Events Section */}
          {allEventsData.personalEvents.length > 0 && (
            <div className="mb-4">
              <h4 className="text-sm font-medium mb-2">{t('personalCalendar')}</h4>
              <div className="space-y-2">
                {allEventsData.personalEvents.map((event) => {
                  const startDateTime = parseISO(event.start_time);
                  const endDateTime = parseISO(event.end_time);
                  const isAllDay = format(startDateTime, 'HH:mm') === '00:00' && 
                                 format(endDateTime, 'HH:mm') === '23:59';
                  const timeStr = isAllDay ? 
                    t('allDay') : 
                    `${format(startDateTime, 'HH:mm')} - ${format(endDateTime, 'HH:mm')}`;
                  
                  return (
                    <div 
                      key={`all-personal-${event.id}`} 
                      className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded cursor-pointer hover:bg-purple-200 dark:hover:bg-purple-800/30"
                      style={event.color ? {backgroundColor: `${event.color}20`} : {}}
                      onClick={() => {
                        setIsAllEventsOpen(false);
                        handleEventClick(event, 'personal');
                      }}
                    >
                      <div className="font-medium break-words truncate">{event.title || t('untitledEvent')}</div>
                      <div className="text-xs mt-1">{timeStr}</div>
                      {event.location && <div className="text-xs mt-1 break-words line-clamp-1">{event.location}</div>}
                      {event.description && <div className="text-xs mt-1 break-words line-clamp-2">{event.description}</div>}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          
          {/* No Events Message */}
          {allEventsData.tasks.length + allEventsData.googleEvents.length + allEventsData.personalEvents.length === 0 && (
            <div className="py-4 text-center text-muted-foreground">
              {t('noEventsForThisDay')}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
