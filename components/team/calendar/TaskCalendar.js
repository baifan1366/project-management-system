'use client'

import React, { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { Calendar as CalendarIcon, Plus, ChevronLeft, ChevronRight, MoreHorizontal, Filter, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, 
  startOfWeek, addDays, getDay, isSameDay, parseISO, addWeeks, subWeeks, startOfDay, isBefore } from 'date-fns'
import { cn } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import { Skeleton } from '@/components/ui/skeleton'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { toast } from 'sonner'
import { useGetUser } from '@/lib/hooks/useGetUser'
import TeamCalendarTools from './CalendarTools'
import EditTaskDialog from './EditTaskDialog'
import WeekView from './WeekView'
import DayView from './DayView'
import { useDispatch, useSelector } from 'react-redux'
import { fetchAllTasks } from '@/lib/redux/features/taskSlice'
import { getSectionByTeamId } from '@/lib/redux/features/sectionSlice'
import { getTagByName } from '@/lib/redux/features/tagSlice'
import { store } from '@/lib/redux/store'
import { fetchTeamById } from '@/lib/redux/features/teamSlice'
import { fetchTeamUsers } from '@/lib/redux/features/teamUserSlice'
import DayTasksDialog from './DayTasksDialog'
import { useParams } from "next/navigation";
// 在组件顶部添加数据转换函数
const formatUsers = (users) => {
  if (!users || users.length === 0) return [];
  
  // 确保是数组
  const userArray = Array.isArray(users) ? users : [users];
  
  // 返回唯一ID数组
  return [...new Set(userArray)];
};

export default function TaskCalendar({ teamId, projectId, teamCFId, refreshKey, addTask }) {
  const t = useTranslations('Calendar')
  const dispatch = useDispatch()
  const { user: currentUser, isLoading: userLoading } = useGetUser()
  const params = useParams()
  const [themeColor, setThemeColor] = useState('#64748b')
  // Redux state
  const tasks = useSelector(state => state.tasks.tasks)
  const sections = useSelector(state => state.sections.sections)
  const currentTag = useSelector(state => state.tags.currentTag)
  const project = useSelector(state => 
    state.projects.projects.find(p => String(p.id) === String(projectId))
  );
  // 标签IDs
  const [tagIdName, setTagIdName] = useState(null)
  const [tagIdStartDate, setTagIdStartDate] = useState(null)
  const [tagIdDueDate, setTagIdDueDate] = useState(null)
  const [tagIdAssignee, setTagIdAssignee] = useState(null)
  
  // 存储当前团队的任务ID集合
  const [teamTaskIds, setTeamTaskIds] = useState(new Set())
  
  // State variables
  const [currentDate, setCurrentDate] = useState(new Date())
  const [view, setView] = useState('month') // month, week, day
  const [teamMembers, setTeamMembers] = useState([])
  const [selectedMembers, setSelectedMembers] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [isViewLoading, setIsViewLoading] = useState(false)
  const [isCreateTaskOpen, setIsCreateTaskOpen] = useState(false)
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [teamName, setTeamName] = useState('')
  const [tasksByDate, setTasksByDate] = useState({})
  const [isFetchingData, setIsFetchingData] = useState(false)
  const [filteredTasks, setFilteredTasks] = useState([])
  const [isEditTaskOpen, setIsEditTaskOpen] = useState(false)
  const [selectedTask, setSelectedTask] = useState(null)
  const [isDayTasksOpen, setIsDayTasksOpen] = useState(false)
  const [selectedDayTasks, setSelectedDayTasks] = useState([])
  const [selectedDayDate, setSelectedDayDate] = useState(null)
  // 添加缓存状态，减少不必要的重复请求
  const [lastFetchTime, setLastFetchTime] = useState(null)
  const [dataLoadingProgress, setDataLoadingProgress] = useState(0)
  
  // 添加处理addTask属性的useEffect
  useEffect(() => {
    // 当addTask为true时，触发创建任务对话框
    if (addTask) {
      // 使用当前日期作为默认日期
      handleOpenCreateTask(new Date());
    }
  }, [addTask]);

  useEffect(() => {
    if (project?.theme_color) {
      setThemeColor(project.theme_color);
    }
  }, [project]);
  // Fetch team details
  useEffect(() => {
    async function fetchTeamDetails() {
      if (!teamId) return
      
      try {
        const result = await dispatch(fetchTeamById(teamId)).unwrap()
        
        if (result) {
          // 处理不同的响应格式
          let team = null
          if (Array.isArray(result) && result.length > 0) {
            team = result[0]
          } else if (result && typeof result === 'object') {
            team = result
          }
          
          if (team) {
            setTeamName(team.name)
          }
        }
      } catch (error) {
        console.error('获取团队详情失败:', error)
      }
    }
    
    fetchTeamDetails()
  }, [teamId, dispatch])

  // Fetch team members
  useEffect(() => {
    async function fetchTeamMembers() {
      if (!teamId) return
      
      try {
        const result = await dispatch(fetchTeamUsers(teamId)).unwrap()
        
        // 检查并处理返回的数据结构
        let teamUsers = [];
        if (result && result.users && Array.isArray(result.users)) {
          teamUsers = result.users;
        } else if (Array.isArray(result)) {
          teamUsers = result;
        }
        
        if (teamUsers.length > 0) {
          const members = teamUsers.map(teamUser => {
            // 确保user对象存在
            const userInfo = teamUser.user || {};
            
            return {
              id: teamUser.user_id || userInfo.id, // 优先使用user_id
              name: userInfo.name || userInfo.email || '未知用户',
              email: userInfo.email,
              avatar: userInfo.avatar_url,
              role: teamUser.role
            }
          }).filter(Boolean) // 移除null值
          
          setTeamMembers(members)
          
          // 默认选择所有成员
          setSelectedMembers(members.map(m => m.id))
        } else {
          console.warn('没有找到团队成员:', result)
          setTeamMembers([])
          setSelectedMembers([])
        }
      } catch (error) {
        console.error('获取团队成员失败:', error)
        toast.error(t('errorFetchingTeamMembers'))
        // 设置一个空数组，以便UI可以正常渲染
        setTeamMembers([])
        setSelectedMembers([])
      }
    }
    
    fetchTeamMembers()
  }, [teamId, dispatch, t])

  // 获取任务和分区数据
  useEffect(() => {
    if (!teamId || selectedMembers.length === 0) {
      setTasksByDate({})
      setIsLoading(false)
      return
    }

    // 添加简单缓存机制，避免短时间内重复请求
    const now = Date.now()
    if (lastFetchTime && now - lastFetchTime < 30000) { // 30秒缓存
      setIsLoading(false)
      setIsViewLoading(false)
      return
    }

    // 添加重试机制，但减少最大重试次数以加快响应
    const fetchWithRetry = async (fetchFunction, maxRetries = 2) => {
      let retries = 0;
      while (retries < maxRetries) {
        try {
          return await fetchFunction();
        } catch (error) {
          retries++;
          console.warn(`请求失败，第 ${retries} 次重试...`);
          if (retries >= maxRetries) throw error;
          // 简化退避策略，减少等待时间
          await new Promise(resolve => setTimeout(resolve, 500 * retries));
        }
      }
    };
    
    const fetchData = async () => {
      // 避免重复加载
      if (isFetchingData) {
        return
      }
      
      setIsFetchingData(true)
      setIsLoading(true)
      setDataLoadingProgress(10) // 初始化进度
      
      try {
        // 并行请求团队信息和分区，减少等待时间
        setDataLoadingProgress(20)
        const fetchTeamPromise = dispatch(fetchTeamById(teamId)).unwrap().catch(err => {
          console.warn('获取团队信息失败:', err)
          return null
        })
        
        const fetchSectionsPromise = fetchWithRetry(() => 
          dispatch(getSectionByTeamId(teamId)).unwrap()
        )
        
        // 等待分区数据完成
        const sections = await fetchSectionsPromise
        setDataLoadingProgress(40)
        
        // 继续等待团队信息
        const teamResult = await fetchTeamPromise
        if (teamResult) {
          let team = null
          if (Array.isArray(teamResult) && teamResult.length > 0) {
            team = teamResult[0]
          } else if (teamResult && typeof teamResult === 'object') {
            team = teamResult
          }
          
          if (team) {
            setTeamName(team.name)
          }
        }
        
        if (!sections || sections.length === 0) {
          setTasksByDate({})
          setIsLoading(false)
          setIsFetchingData(false)
          setLastFetchTime(Date.now())
          return
        }

        // 获取分区中的所有任务ID
        const sectionTaskIds = sections.reduce((acc, section) => {
          if (section.task_ids && Array.isArray(section.task_ids)) {
            acc.push(...section.task_ids)
          }
          return acc
        }, [])
        
        // 去除重复的任务ID
        const uniqueTaskIds = [...new Set(sectionTaskIds)]
        setDataLoadingProgress(60)
        
        if (uniqueTaskIds.length === 0) {
          setTasksByDate({});
          setFilteredTasks([]);
          setIsLoading(false);
          setIsFetchingData(false);
          setLastFetchTime(Date.now())
          return;
        }
        
        try {
          // 获取任务，如果任务较多，考虑只获取当前显示月份相关的任务
          setDataLoadingProgress(70)
          const allTasks = await fetchWithRetry(() => 
            dispatch(fetchAllTasks()).unwrap()
          );
          
          setDataLoadingProgress(80)
          if (!allTasks || allTasks.length === 0) {
            setTasksByDate({});
            setFilteredTasks([]);
            setIsLoading(false);
            setIsFetchingData(false);
            setLastFetchTime(Date.now())
            return;
          }
                    
          // 使用Set加速查找
          const uniqueTaskIdSet = new Set(uniqueTaskIds)
          
          // 筛选属于当前团队的任务
          const teamTasks = allTasks.filter(task => uniqueTaskIdSet.has(task.id))
          setDataLoadingProgress(90)
          
          if (teamTasks.length === 0) {
            setTasksByDate({});
            setFilteredTasks([]);
          } else {
            // 存储当前团队的任务ID集合
            const teamTaskIds = new Set(teamTasks.map(task => task.id))
            
            // 更新Redux store和本地状态
            store.dispatch({ type: 'tasks/setTasks', payload: teamTasks })
            setTeamTaskIds(teamTaskIds)
          }
          setDataLoadingProgress(100)
          // 更新最后加载时间
          setLastFetchTime(Date.now())
        } catch (taskError) {
          console.error('获取任务数据失败:', taskError)
          toast.error('获取任务数据失败，请检查网络连接并刷新页面')
        }
      } catch (error) {
        console.error('加载团队数据失败:', error)
        toast.error('加载团队数据失败，请检查网络连接并刷新页面')
      } finally {
        setIsFetchingData(false)
        setIsLoading(false)
        setIsViewLoading(false)
        setDataLoadingProgress(0)
      }
    }
    
    fetchData()
  }, [teamId, dispatch, t, selectedMembers.length, lastFetchTime])

  // 获取Assignee标签ID，与其他标签合并处理 - 简化逻辑，减少请求次数
  useEffect(() => {    
    const fetchTags = async () => {
      // 创建标签名称到状态的映射，便于集中处理
      const tagMappings = [
        { name: "Name", setter: setTagIdName },
        { name: "Due Date", setter: setTagIdDueDate },
        { name: "Assignee", setter: setTagIdAssignee }
      ];
      
      // 并行请求所有标签，提高效率
      const tagPromises = tagMappings.map(({ name }) => {
        return dispatch(getTagByName(name))
          .unwrap()
          .then(tag => ({ name, tag, success: true }))
          .catch(error => ({ name, error, success: false }));
      });
      
      // 等待所有请求完成
      const results = await Promise.all(tagPromises);
      
      // 处理结果
      let hasErrors = false;
      results.forEach(({ name, tag, success, error }) => {
        const mapping = tagMappings.find(m => m.name === name);
        if (success && mapping) {
          mapping.setter(tag);
        } else {
          console.error(`获取${name}标签失败:`, error);
          hasErrors = true;
        }
      });
      
      // 如果有错误，显示提示
      if (hasErrors) {
        toast.warning('部分标签获取失败，日历显示可能不完整');
      }
    };
    
    if (teamId) {
      fetchTags();
    }
  }, [dispatch, teamId]);

  // 处理任务数据 - 优化筛选规则
  useEffect(() => {
    if (!tasks || tasks.length === 0) {
      setFilteredTasks([])
      return
    }

    if (!tagIdName || !tagIdDueDate || !tagIdAssignee) {
      return
    }

    try {      
      // 使用更高效的筛选方法，减少循环次数
      // 第一步：先处理所有任务，获取必要的属性
      const processedTaskMap = new Map();
      
      tasks.forEach(task => {
        const tagValues = task.tag_values || {};
        const name = tagValues[tagIdName] || '未命名任务';
        const startDate = tagValues[tagIdStartDate] ? new Date(tagValues[tagIdStartDate]) : null;
        const dueDate = tagValues[tagIdDueDate] ? new Date(tagValues[tagIdDueDate]) : null;
        const assigneeId = tagValues[tagIdAssignee]; // 可能是数组或单个值
        
        // 初步筛选 - 任务必须有截止日期
        if (!dueDate || isNaN(dueDate.getTime())) return;
        
        // 将处理后的任务添加到Map中
        processedTaskMap.set(task.id, {
          taskId: task.id,
          name,
          dueDate,
          assigneeId,
          sectionId: task.section_id,
          tag_values: tagValues, // 保留原始tag_values以备后用
          rawTask: task // 保存原始任务对象以便访问其他可能需要的字段
        });
      });
      
      // 第二步：应用团队和用户筛选
      const filteredTasksArray = [];
      
      for (const task of processedTaskMap.values()) {
        // 确保任务属于当前团队
        if (!teamTaskIds.has(task.taskId)) continue;
        
        // 筛选被勾选的用户
        if (selectedMembers.length > 0 && task.assigneeId) {
          // 处理assigneeId是数组的情况
          if (Array.isArray(task.assigneeId)) {
            // 使用Set优化查找
            const selectedMembersSet = new Set(selectedMembers);
            if (!task.assigneeId.some(id => selectedMembersSet.has(id))) continue;
          } 
          // 处理assigneeId是单个值的情况
          else {
            if (!selectedMembers.includes(task.assigneeId)) continue;
          }
        }
        
        // 通过所有筛选条件
        filteredTasksArray.push(task);
      }
      
      setFilteredTasks(filteredTasksArray);
    } catch (error) {
      console.error('处理任务数据时出错:', error)
      toast.error('处理任务数据失败，请刷新页面重试')
    }
  }, [tasks, selectedMembers, tagIdName, tagIdDueDate, tagIdAssignee, teamTaskIds]);

  // 按日期分组任务 - 优化处理逻辑
  useEffect(() => {
    if (!filteredTasks || filteredTasks.length === 0) {
      setTasksByDate({})
      return
    }

    
    // 使用更高效的分组方式
    const groupedTasks = filteredTasks.reduce((acc, task) => {
      if (!task.dueDate) return acc;
      
      const dateKey = format(task.dueDate, 'yyyy-MM-dd');
      if (!acc[dateKey]) {
        acc[dateKey] = [];
      }
      
      // 保留原始日期格式
      acc[dateKey].push({
        id: task.taskId,
        name: task.name,
        assigneeId: task.assigneeId,
        dueDate: dateKey, // 保存格式化的日期，确保是yyyy-MM-dd格式
        tag_values: task.tag_values
      });
      
      return acc;
    }, {});
    
    const totalTasksGrouped = Object.values(groupedTasks).reduce((sum, tasks) => sum + tasks.length, 0);
    setTasksByDate(groupedTasks);
  }, [filteredTasks]);

  // Navigation handlers
  const handlePrevMonth = () => {
    setIsViewLoading(true)
    setCurrentDate(prev => subMonths(prev, 1))
  }

  const handleNextMonth = () => {
    setIsViewLoading(true)
    setCurrentDate(prev => addMonths(prev, 1))
  }

  const handlePrevWeek = () => {
    setIsViewLoading(true)
    setCurrentDate(prev => subWeeks(prev, 1))
  }

  const handleNextWeek = () => {
    setIsViewLoading(true)
    setCurrentDate(prev => addWeeks(prev, 1))
  }

  const handlePrevDay = () => {
    setIsViewLoading(true)
    setCurrentDate(prev => addDays(prev, -1))
  }

  const handleNextDay = () => {
    setIsViewLoading(true)
    setCurrentDate(prev => addDays(prev, 1))
  }

  const handleTodayClick = () => {
    setIsViewLoading(true)
    setCurrentDate(new Date())
  }

  // Create task handler
  const handleOpenCreateTask = (date = new Date()) => {
    // 检查所选日期是否在今天或之后
    const today = startOfDay(new Date())
    if (isBefore(date, today)) {
      toast.warning(t('cannotCreateTaskInPast'))
      return
    }
    
    setSelectedDate(date)
    setIsCreateTaskOpen(true)
  }

  // Filter handlers
  const handleToggleMember = (memberId) => {
    setSelectedMembers(prev => {
      if (prev.includes(memberId)) {
        return prev.filter(id => id !== memberId)
      }
      return [...prev, memberId]
    })
  }

  const handleSelectAllMembers = () => {
    setSelectedMembers(teamMembers.map(m => m.id))
  }

  const handleDeselectAllMembers = () => {
    setSelectedMembers([])
  }

  // Task creation success handler
  const handleTaskCreated = async () => {
    setIsViewLoading(true)
    
    // 重置缓存，确保获取最新数据
    setLastFetchTime(null)
    
    try {      
      // 使用重试机制获取最新数据
      const fetchWithRetry = async (fetchFunction, maxRetries = 2) => {
        let retries = 0;
        while (retries < maxRetries) {
          try {
            return await fetchFunction();
          } catch (error) {
            retries++;
            console.warn(`刷新数据请求失败，第 ${retries} 次重试...`);
            if (retries >= maxRetries) throw error;
            await new Promise(resolve => setTimeout(resolve, 500 * retries));
          }
        }
      };
      
      // 并行获取分区和任务数据
      const [sectionsResult, tasksResult] = await Promise.all([
        fetchWithRetry(() => dispatch(getSectionByTeamId(teamId)).unwrap()),
        fetchWithRetry(() => dispatch(fetchAllTasks()).unwrap())
      ]);
      
      // 处理分区中的任务ID
      if (sectionsResult && sectionsResult.length > 0) {
        const sectionTaskIds = sectionsResult.reduce((acc, section) => {
          if (section.task_ids && Array.isArray(section.task_ids)) {
            acc.push(...section.task_ids);
          }
          return acc;
        }, []);
        
        // 更新团队任务ID集合
        const uniqueTaskIds = [...new Set(sectionTaskIds)];
        setTeamTaskIds(new Set(uniqueTaskIds));
        
        // 如果有任务数据，直接更新Redux store
        if (tasksResult && tasksResult.length > 0) {
          store.dispatch({ type: 'tasks/setTasks', payload: tasksResult });
        }
      }
      
      // 设置新的缓存时间
      setLastFetchTime(Date.now());
      
      // 重置加载状态
      setIsViewLoading(false);
      
      // 显示成功提示
      toast.success(t('calendarRefreshed'));
    } catch (error) {
      console.error('刷新日历数据失败:', error);
      toast.error(t('errorRefreshingCalendar'));
      setIsViewLoading(false);
      
      // 失败后，尝试延迟重新加载一次
      setTimeout(() => {
        setLastFetchTime(null); // 强制重新加载
      }, 2000);
    }
  }

  // Loading skeleton - 添加进度显示
  const renderSkeletonCalendar = () => (
    <div className="h-full flex flex-col">
      <div className="flex-none py-2">
        <div className="flex items-center justify-between mb-2">          
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center space-x-2">
              <Skeleton className="h-9 w-9 rounded-md" />
              <Skeleton className="h-6 w-15" />
              <Skeleton className="h-9 w-9 rounded-md" />
              <Skeleton className="h-10 w-48" />
            </div>
            <div className="flex items-center space-x-2">
              <Skeleton className="h-9 w-24 rounded-md" />
              <Skeleton className="h-9 w-32 rounded-md" />
            </div>
          </div>
        </div>
      </div>
      
      <div className="flex-1 overflow-hidden">
        <div className="h-full grid grid-cols-10 gap-4">
          <div className="col-span-10 overflow-hidden">
            {view === 'month' && (
              <Card className="p-2">
                {/* Month view skeleton */}
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
                          key={`day-${weekIndex}-${dayIndex}`} 
                          className="min-h-[120px]" 
                        />
                      ))}
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  )

  // Calendar header with navigation and controls
  const renderCalendarHeader = () => (
    <div className="flex items-center justify-between mb-2">      
      <div className="flex items-center">
        <div className="flex items-center">
          <Button variant="outline" className="p-1 border-transparent shadow-none" onClick={() => {
            if (view === 'month') handlePrevMonth()
            else if (view === 'week') handlePrevWeek()
            else handlePrevDay()
          }}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="font-semibold text-xs min-w-[85px] max-w-[85px] text-center mx-2">
            {view === 'month' && format(currentDate, 'MMMM yyyy')}
            {view === 'week' && `${format(startOfWeek(currentDate), 'MMM d')} - ${format(addDays(startOfWeek(currentDate), 6), 'MMM d, yyyy')}`}
            {view === 'day' && format(currentDate, 'EEEE, MMMM d, yyyy')}
          </div>
          <Button variant="outline" className="p-1 border-transparent shadow-none" onClick={() => {
            if (view === 'month') handleNextMonth()
            else if (view === 'week') handleNextWeek()
            else handleNextDay()
          }}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <Tabs value={view} onValueChange={(newView) => {
          if (newView === view) return
          setIsViewLoading(true)
          setView(newView)
        }} className="ml-2">
          <TabsList>
            <TabsTrigger value="month">{t('month')}</TabsTrigger>
            <TabsTrigger value="week">{t('week')}</TabsTrigger>
            <TabsTrigger value="day">{t('day')}</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
      <div className="flex items-center space-x-2">
        <Button variant="outline" onClick={handleTodayClick}>
          {t('today')}
        </Button>
        <Button variant={themeColor} onClick={() => handleOpenCreateTask()}>
          <Plus className="h-4 w-4" />
          {t('newTask')}
        </Button>
      </div>
      
    </div>
  )

  // Month view calendar
  const renderMonthView = () => {
    const monthStart = startOfMonth(currentDate)
    const monthEnd = endOfMonth(currentDate)
    const startDate = startOfWeek(monthStart)
    const days = []
    const today = startOfDay(new Date())

    const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

    // Create calendar header (days of week)
    const calendarHeader = (
      <div className="grid grid-cols-7 gap-px">
        {daysOfWeek.map(day => (
          <div key={day} className="h-8 flex items-center justify-center font-medium text-sm">
            {t(day.toLowerCase())}
          </div>
        ))}
      </div>
    )

    // Generate calendar days
    let day = startDate
    let weekRows = []
    let currentWeekDays = []
    
    for (let i = 0; i < 42; i++) {
      const formattedDate = format(day, 'yyyy-MM-dd')
      const isCurrentMonth = isSameMonth(day, currentDate)
      const isPastDay = isBefore(day, today)
      const isToday = isSameDay(day, today)
      const currentDay = new Date(day)
      
      // 获取当天任务并检查是否有数据
      const dayTasks = tasksByDate[formattedDate] || []
      if (dayTasks.length > 0) {
      }

      currentWeekDays.push(
        <div 
          key={formattedDate}
          className={cn(
            "min-h-[120px] p-1.5 pt-1 border border-border/50 transition-colors relative",
            !isCurrentMonth && "bg-muted/30 text-muted-foreground",
            isPastDay && "bg-muted/50 text-muted-foreground opacity-75", // 为过去的日期添加额外的样式
            isToday && "bg-accent/10",
            !isPastDay && "hover:bg-accent/5 cursor-pointer", // 只有未来的日期才有指针样式和悬停效果
            isPastDay && "cursor-not-allowed" // 过去的日期显示禁止光标
          )}
          onClick={() => !isPastDay && handleOpenCreateTask(currentDay)} // 只有未来的日期才能点击创建任务
        >
          <div className="flex flex-col h-full">
            <div className="flex justify-between items-start mb-2">
              <span className={cn(
                "inline-flex h-5 w-5 items-center justify-center rounded-full text-xs",
                isToday && "bg-primary text-primary-foreground font-medium",
                isPastDay && !isToday && "line-through" // 为过去的日期添加删除线
              )}>
                {format(day, 'd')}
              </span>
              {(isCurrentMonth && dayTasks.length > 0) && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-5 w-5">
                      <MoreHorizontal className="h-3 w-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {!isPastDay && (
                      <DropdownMenuItem onClick={(e) => {
                        e.stopPropagation()
                        handleOpenCreateTask(currentDay)
                      }}>
                        {t('addTask')}
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem onClick={(e) => {
                      e.stopPropagation()
                      handleViewAllTasks(currentDay, dayTasks)
                    }}>
                      {t('viewAll')}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>

            <div className="space-y-0.5 mt-1 max-h-[75px] overflow-y-auto">
              {dayTasks.map((task) => {
                // 获取任务名称
                const taskName = task.name || t('untitledTask')
                
                // 获取任务分配人 - 使用formatUsers函数处理
                const assignees = task.assigneeId ? (
                  Array.isArray(task.assigneeId) 
                    ? formatUsers(task.assigneeId) 
                    : formatUsers([task.assigneeId])
                ) : []
                
                return (
                  <div 
                    key={`task-${task.id}`} 
                    className={cn(
                      "text-xs py-0.5 px-1 rounded truncate cursor-pointer transition-opacity hover:opacity-80 bg-blue-100 dark:bg-blue-900/30 border-l-2 border-blue-500",
                      isPastDay && "opacity-60" // 降低过去日期任务的不透明度
                    )}
                    title={taskName}
                    onClick={(e) => {
                      e.stopPropagation()
                      handleTaskClick(task)
                    }}
                  >
                    <div className="flex justify-between items-center">
                      <span className="truncate">{taskName}</span>
                      {assignees.length > 0 && (
                        <div className="flex -space-x-1">
                          {assignees.slice(0, 2).map((assigneeId, idx) => {
                            const assignee = teamMembers.find(m => m.id === assigneeId)
                            return assignee ? (
                              <div key={idx} className="h-3 w-3 rounded-full bg-gray-200 flex items-center justify-center text-[6px] border border-white">
                                {assignee.name.charAt(0)}
                              </div>
                            ) : null
                          })}
                          {assignees.length > 2 && (
                            <div className="h-3 w-3 rounded-full bg-gray-200 flex items-center justify-center text-[6px] border border-white">
                              +{assignees.length - 2}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )

      // If week ends or it's the last day, process this week
      const isLastDay = i === 41
      const isWeekEnd = getDay(day) === 6
      
      if (isWeekEnd || isLastDay) {
        const weekIndex = Math.floor(i / 7)
        weekRows.push(
          <div key={`week-${weekIndex}`} className="relative grid grid-cols-7 gap-px">
            {currentWeekDays}
          </div>
        )
        currentWeekDays = []
      }
      
      day = addDays(day, 1)
    }

    return (
      <Card className="p-2">
        {calendarHeader}
        <div className="mt-px">
          {weekRows}
        </div>
      </Card>
    )
  }

  // Week view calendar
  const renderWeekView = () => {
    return (
      <WeekView
        currentDate={currentDate}
        handleOpenCreateEvent={handleOpenCreateTask}
        t={t}
        tasks={filteredTasks.map(task => {
          // 计算开始日期：优先使用tagIdStartDate中的值，如果没有则默认为截止日期前一天
          const dueDate = format(task.dueDate, 'yyyy-MM-dd');
          let startDate;
          
          if (task.tag_values && tagIdStartDate && task.tag_values[tagIdStartDate]) {
            // 如果有开始日期标签，使用该日期
            startDate = task.tag_values[tagIdStartDate];
          } else {
            // 没有开始日期标签，默认设置为截止日期前一天
            const prevDay = addDays(task.dueDate, -1);
            startDate = format(prevDay, 'yyyy-MM-dd');
          }
          
          return {
            id: task.taskId,
            title: task.name,
            due_date: dueDate,
            start_date: startDate,
            assignee: task.assigneeId,
            tag_values: task.tag_values
          };
        })}
        handleEventClick={(event) => {
          if (event.type === 'task') {
            handleTaskClick(event.originalEvent);
          }
        }}
      />
    )
  }

  // Day view calendar
  const renderDayView = () => {
    return (
      <DayView
        currentDate={currentDate}
        handleOpenCreateEvent={handleOpenCreateTask}
        t={t}
        tasks={filteredTasks.map(task => {
          // 计算开始日期：优先使用tagIdStartDate中的值，如果没有则默认为截止日期前一天
          const dueDate = format(task.dueDate, 'yyyy-MM-dd');
          let startDate;
          
          if (task.tag_values && tagIdStartDate && task.tag_values[tagIdStartDate]) {
            // 如果有开始日期标签，使用该日期
            startDate = task.tag_values[tagIdStartDate];
          } else {
            // 没有开始日期标签，默认设置为截止日期前一天
            const prevDay = addDays(task.dueDate, -1);
            startDate = format(prevDay, 'yyyy-MM-dd');
          }
          
          return {
            id: task.taskId,
            title: task.name,
            due_date: dueDate,
            start_date: startDate,
            assignee: task.assigneeId,
            tag_values: task.tag_values
          };
        })}
        handleEventClick={(event) => {
          if (event.type === 'task') {
            handleTaskClick(event.originalEvent);
          }
        }}
      />
    )
  }

  // 修改任务点击事件处理函数
  const handleTaskClick = (task) => {
    // 检查任务是否在过去的日期
    const today = startOfDay(new Date())
    
    // 首先尝试直接使用格式化后的dueDate字段，这是我们在日历渲染时添加的
    let taskDueDate = null
    let taskDueDateString = null
    
    // 从不同来源获取日期信息，确保能够正确显示
    if (task.dueDate) {
      // 1. 直接使用日历格式化的日期
      taskDueDateString = task.dueDate
      taskDueDate = new Date(task.dueDate.replace(/-/g, '/'))
    } else if (task.tag_values && tagIdDueDate && task.tag_values[tagIdDueDate]) {
      // 2. 从任务的tag_values中获取日期
      taskDueDateString = task.tag_values[tagIdDueDate]
      taskDueDate = new Date(taskDueDateString.replace(/-/g, '/'))
    } else if (task.rawTask && task.rawTask.tag_values && tagIdDueDate && task.rawTask.tag_values[tagIdDueDate]) {
      // 3. 从原始任务对象的tag_values中获取日期
      taskDueDateString = task.rawTask.tag_values[tagIdDueDate]
      taskDueDate = new Date(taskDueDateString.replace(/-/g, '/'))
    }
    
    // 如果都没找到，则使用当前日期
    if (!taskDueDate || isNaN(taskDueDate.getTime())) {
      taskDueDate = new Date()
      taskDueDateString = format(taskDueDate, 'yyyy-MM-dd')
    }
    
    // 如果任务有截止日期并且截止日期在今天之前，则标记为只读
    const isPastTask = taskDueDate && isBefore(taskDueDate, today)
        
    // 保存原始的日期值以便在编辑对话框中正确显示
    setSelectedTask({
      ...task,
      isReadOnly: isPastTask, // 为过去的任务添加只读标志
      dueDate: taskDueDateString // 使用原始字符串格式的日期
    })
    setIsEditTaskOpen(true)
    // 关闭DayTasksDialog
    setIsDayTasksOpen(false)
  }

  // 添加处理查看所有任务的函数
  const handleViewAllTasks = (date, tasks) => {
    setSelectedDayDate(date)
    setSelectedDayTasks(tasks)
    setIsDayTasksOpen(true)
  }

  useEffect(() => {
    // 在视图变更后重置加载状态
    setIsViewLoading(false)
  }, [view, currentDate])

  if (isLoading) {
    return renderSkeletonCalendar()
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex-none py-4">
        {renderCalendarHeader()}
      </div>
      
      <div className="flex-1 overflow-hidden">
        <div className="h-full grid grid-cols-10 gap-4">
          <div className="col-span-10 overflow-hidden">
            {isViewLoading ? (
              // Show skeleton based on current view
              <Card className="p-2">
                {view === 'month' && (
                  <>
                    <div className="grid grid-cols-7 gap-px">
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
                              className="min-h-[120px]" 
                            />
                          ))}
                        </div>
                      ))}
                    </div>
                  </>
                )}
                
                {view === 'week' && (
                  <div className="h-full flex items-center justify-center">
                    <Skeleton className="h-24 w-2/3" />
                  </div>
                )}
                
                {view === 'day' && (
                  <div className="h-full flex items-center justify-center">
                    <Skeleton className="h-24 w-2/3" />
                  </div>
                )}
              </Card>
            ) : (
              <div className="h-full overflow-y-auto">
                {view === 'month' && renderMonthView()}
                {view === 'week' && renderWeekView()}
                {view === 'day' && renderDayView()}
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Task creation modal */}
      {isCreateTaskOpen && (
        <TeamCalendarTools
          isOpen={isCreateTaskOpen}
          setIsOpen={setIsCreateTaskOpen}
          selectedDate={selectedDate}
          teamId={teamId}
          teamMembers={teamMembers}
          onTaskCreated={handleTaskCreated}
        />
      )}
      
      {/* Task edit modal */}
      {isEditTaskOpen && selectedTask && (
        <EditTaskDialog
          isOpen={isEditTaskOpen}
          setIsOpen={setIsEditTaskOpen}
          task={selectedTask}
          teamId={teamId}
          teamMembers={teamMembers}
          onTaskUpdated={handleTaskCreated}
        />
      )}

      {/* Day tasks dialog */}
      {isDayTasksOpen && selectedDayDate && (
        <DayTasksDialog
          isOpen={isDayTasksOpen}
          setIsOpen={setIsDayTasksOpen}
          date={selectedDayDate}
          tasks={selectedDayTasks}
          teamMembers={teamMembers}
          onTaskClick={handleTaskClick}
        />
      )}
    </div>
  )
}
