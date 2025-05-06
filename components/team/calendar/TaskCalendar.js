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
  startOfWeek, addDays, getDay, isSameDay, parseISO, addWeeks, subWeeks } from 'date-fns'
import { cn } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import { Skeleton } from '@/components/ui/skeleton'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { toast } from 'sonner'
import { useGetUser } from '@/lib/hooks/useGetUser'
import TeamCalendarTools from './CalendarTools'
import EditTaskDialog from './EditTaskDialog'
import { WeekView, DayView } from '@/components/calendar'
import { useDispatch, useSelector } from 'react-redux'
import { fetchAllTasks } from '@/lib/redux/features/taskSlice'
import { getSectionByTeamId } from '@/lib/redux/features/sectionSlice'
import { getTagByName } from '@/lib/redux/features/tagSlice'
import { store } from '@/lib/redux/store'
import { fetchTeamById } from '@/lib/redux/features/teamSlice'
import { fetchTeamUsers } from '@/lib/redux/features/teamUserSlice'
import DayTasksDialog from './DayTasksDialog'

// 在组件顶部添加数据转换函数
const formatUsers = (users) => {
  if (!users) return [];
  
  // 如果已经是数组，处理每个用户对象
  if (Array.isArray(users)) {
    return users.map(user => {
      // 如果是简单的用户ID
      if (typeof user === 'string' || typeof user === 'number') {
        return user;
      }
      
      // 如果是完整的用户对象
      if (user.user_id) {
        return user.user_id;
      }
      
      // 如果是用户对象但结构不同
      if (user.id) {
        return user.id;
      }
      
      return null;
    }).filter(Boolean);
  }
  
  // 如果是单个用户对象
  if (typeof users === 'object') {
    if (users.user_id) {
      return [users.user_id];
    }
    if (users.id) {
      return [users.id];
    }
    // 如果是对象但没有预期的ID字段，尝试获取所有值
    return Object.values(users).filter(value => 
      typeof value === 'string' || typeof value === 'number'
    );
  }
  
  // 如果是单个ID
  if (typeof users === 'string' || typeof users === 'number') {
    return [users];
  }
  
  return [];
};

export default function TaskCalendar({ teamId }) {
  const t = useTranslations('Calendar')
  const dispatch = useDispatch()
  const { user: currentUser, isLoading: userLoading } = useGetUser()
  
  // Redux state
  const tasks = useSelector(state => state.tasks.tasks)
  const sections = useSelector(state => state.sections.sections)
  const currentTag = useSelector(state => state.tags.currentTag)
  
  // 标签IDs
  const [tagIdName, setTagIdName] = useState(null)
  const [tagIdDueDate, setTagIdDueDate] = useState(null)
  const [tagIdAssignee, setTagIdAssignee] = useState(null)
  
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
        console.log('开始获取团队成员，teamId:', teamId)
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
          
          console.log('成功获取团队成员:', members)
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
      }
    }
    
    fetchTeamMembers()
  }, [teamId, dispatch, t])

  // 获取重要标签IDs
  useEffect(() => {    
    const fetchTags = async (retryCount = 0) => {
      try {        
        const [nameTagResult, dueDateTagResult, assigneeTagResult] = await Promise.all([
          dispatch(getTagByName("Name")).unwrap(),
          dispatch(getTagByName("Due Date")).unwrap(),
          dispatch(getTagByName("Assignee")).unwrap()
        ])

        // 创建一个处理单个标签的函数
        const processTag = (tag, tagName) => {
          if (tag) {
            return tag
          }
          return null
        }
        
        // 处理每个标签
        const nameTag = processTag(nameTagResult, 'Name')
        const dueDateTag = processTag(dueDateTagResult, 'Due Date')
        const assigneeTag = processTag(assigneeTagResult, 'Assignee')
        
        // 设置标签IDs，即使某些标签可能获取失败
        if (nameTag) {
          setTagIdName(nameTag)
        }
        
        if (dueDateTag) {
          setTagIdDueDate(dueDateTag)
        }
        
        if (assigneeTag) {
          setTagIdAssignee(assigneeTag)
        }
        
        // 检查是否所有必需的标签都获取成功
        const missingTags = []
        if (!nameTag) missingTags.push('Name')
        if (!dueDateTag) missingTags.push('Due Date')
        if (!assigneeTag) missingTags.push('Assignee')
        
        if (missingTags.length > 0) {
          throw new Error(`未能获取以下标签: ${missingTags.join(', ')}`)
        }
        
      } catch (error) {
        console.error('获取标签过程中发生错误:', error)
        
        // 如果还有重试机会，则重试
        if (retryCount < 2) {
          await new Promise(resolve => setTimeout(resolve, 1000))
          return fetchTags(retryCount + 1)
        }
        
        // 超过重试次数，显示错误提示
        toast.error('获取标签失败，请刷新页面重试')
      }
    }
    
    if (teamId) {
      fetchTags(0)  // 从第0次开始尝试
    }
  }, [dispatch, teamId])

  // 获取任务和分区数据
  useEffect(() => {
    if (!teamId || selectedMembers.length === 0) {
      setTasksByDate({})
      setIsLoading(false)
      return
    }

    const fetchData = async () => {
      // 避免重复加载
      if (isFetchingData) {
        return
      }
      
      setIsFetchingData(true)
      setIsLoading(true)
      
      try {
        // 获取团队分区
        const sections = await dispatch(getSectionByTeamId(teamId)).unwrap()
        
        if (!sections || sections.length === 0) {
          setTasksByDate({})
          return
        }

        // 获取分区中的所有任务ID
        const sectionTaskIds = sections.reduce((acc, section) => {
          if (section.task_ids) {
            acc.push(...section.task_ids)
          }
          return acc
        }, [])

        
        // 获取任务
        const result = await dispatch(fetchAllTasks()).unwrap()
        
        // 过滤出属于当前团队分区的任务
        const teamTasks = result.filter(task => sectionTaskIds.includes(task.id))
        
        // 更新Redux store中的任务
        store.dispatch({ type: 'tasks/setTasks', payload: teamTasks })
        
      } catch (error) {
        console.error('加载任务数据失败:', error)
      } finally {
        setIsFetchingData(false)
        setIsLoading(false)
        setIsViewLoading(false)
      }
    }
    
    fetchData()
  }, [teamId, dispatch, t, selectedMembers.length])

  // 处理任务数据
  useEffect(() => {
    if (!tasks.length) {
      setFilteredTasks([])
      return
    }

    if (!tagIdName || !tagIdDueDate || !tagIdAssignee) {
      return
    }

    try {
      const processedTasks = tasks.map(task => {
        // 处理tag_values，确保它是一个对象
        const tagValues = task.tag_values || {}
        
        // 获取各个标签值
        const name = tagValues[tagIdName] || '未命名任务'
        const dueDate = tagValues[tagIdDueDate]
        const assigneeId = tagValues[tagIdAssignee]

        return {
          taskId: task.id,
          name,
          dueDate: dueDate ? new Date(dueDate) : null,
          assigneeId,
          sectionId: task.section_id
        }
      }).filter(task => {
        // 检查截止日期
        if (!task.dueDate || isNaN(task.dueDate.getTime())) {
          return false
        }

        // 检查分配者
        if (selectedMembers.length > 0 && task.assigneeId) {
          const isAssigneeSelected = selectedMembers.includes(task.assigneeId)
          if (!isAssigneeSelected) {
            return false
          }
        }

        return true
      })

      setFilteredTasks(processedTasks)
    } catch (error) {
      console.error('处理任务数据时发生错误:', error)
      toast.error('处理任务数据失败，请刷新页面重试')
    }
  }, [tasks, teamId, selectedMembers, tagIdName, tagIdDueDate, tagIdAssignee])

  // 按日期分组任务
  useEffect(() => {
    if (!filteredTasks.length) {
      setTasksByDate({})
      return
    }

    const groupedTasks = {}
    filteredTasks.forEach(task => {
      if (!task.dueDate) {
        return
      }

      const dateKey = format(task.dueDate, 'yyyy-MM-dd')
      if (!groupedTasks[dateKey]) {
        groupedTasks[dateKey] = []
      }

      groupedTasks[dateKey].push({
        id: task.taskId,
        name: task.name,
        assigneeId: task.assigneeId
      })

    })

    setTasksByDate(groupedTasks)
  }, [filteredTasks])

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
    try {
      // 重新获取分区数据
      await dispatch(getSectionByTeamId(teamId)).unwrap()
      
      // 重新获取任务数据
      await dispatch(fetchAllTasks()).unwrap()
      
      // 重置加载状态
      setIsViewLoading(false)
      
      // 显示成功提示
      toast.success(t('calendarRefreshed'))
    } catch (error) {
      console.error('Error refreshing calendar data:', error)
      toast.error(t('errorRefreshingCalendar'))
      setIsViewLoading(false)
    }
  }

  // Loading skeleton
  const renderSkeletonCalendar = () => (
    <div className="h-full flex flex-col">
      <div className="flex-none py-4">
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
        <div className="h-full grid grid-cols-12 gap-4">
          <div className="col-span-2">
            <Card className="h-full p-4">
              <Skeleton className="h-6 w-32 mb-3" />
              
              <div className="space-y-3 mb-6">
                {Array(5).fill().map((_, i) => (
                  <div key={`member-${i}`} className="flex items-center">
                    <Skeleton className="w-4 h-4 rounded mr-2" />
                    <Skeleton className="w-6 h-6 rounded-full mr-2" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                ))}
              </div>
              
              <Skeleton className="h-6 w-20 mb-3" />
              <div className="space-y-3">
                {Array(5).fill().map((_, i) => (
                  <div key={`status-${i}`} className="flex items-center">
                    <Skeleton className="w-4 h-4 rounded mr-2" />
                    <Skeleton className="w-3 h-3 rounded-full mr-2" />
                    <Skeleton className="h-4 w-20" />
                  </div>
                ))}
              </div>
            </Card>
          </div>
          
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

        <div className="ml-4">
          <Button variant="outline" onClick={handleTodayClick}>
            {t('today')}
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
      
      <Button onClick={() => handleOpenCreateTask()}>
        <Plus className="h-4 w-4 mr-2" />
        {t('newTask')}
      </Button>
    </div>
  )

  // Month view calendar
  const renderMonthView = () => {
    const monthStart = startOfMonth(currentDate)
    const monthEnd = endOfMonth(currentDate)
    const startDate = startOfWeek(monthStart)
    const days = []

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
      const currentDay = new Date(day)
      
      // 获取当天任务并检查是否有数据
      const dayTasks = tasksByDate[formattedDate] || []
      if (dayTasks.length > 0) {
        console.log('日期:', formattedDate, '有任务:', dayTasks.length, '个')
      }

      currentWeekDays.push(
        <div 
          key={formattedDate}
          className={cn(
            "min-h-[120px] p-1.5 pt-1 border border-border/50 cursor-pointer transition-colors relative",
            !isCurrentMonth && "bg-muted/30 text-muted-foreground",
            isSameDay(day, new Date()) && "bg-accent/10",
            "hover:bg-accent/5"
          )}
          onClick={() => handleOpenCreateTask(currentDay)}
        >
          <div className="flex flex-col h-full">
            <div className="flex justify-between items-start mb-2">
              <span className={cn(
                "inline-flex h-5 w-5 items-center justify-center rounded-full text-xs",
                isSameDay(day, new Date()) && "bg-primary text-primary-foreground font-medium"
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
                    <DropdownMenuItem onClick={(e) => {
                      e.stopPropagation()
                      handleOpenCreateTask(currentDay)
                    }}>
                      {t('addTask')}
                    </DropdownMenuItem>
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
                const assignees = task.assigneeId ? formatUsers([task.assigneeId]) : []
                
                return (
                  <div 
                    key={`task-${task.id}`} 
                    className="text-xs py-0.5 px-1 rounded truncate cursor-pointer transition-opacity hover:opacity-80 bg-blue-100 dark:bg-blue-900/30 border-l-2 border-blue-500"
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
    // This would be a more complex implementation similar to the WeekView component in calendar/page.js
    // For now, we'll return a placeholder
    return (
      <Card className="p-6 flex items-center justify-center h-full">
        <div className="text-center">
          <h3 className="text-lg font-medium mb-2">{t('weekView')}</h3>
          <p className="text-muted-foreground">{t('weekViewDescription')}</p>
        </div>
      </Card>
    )
  }

  // Day view calendar
  const renderDayView = () => {
    // This would be a more complex implementation similar to the DayView component in calendar/page.js
    // For now, we'll return a placeholder
    return (
      <Card className="p-6 flex items-center justify-center h-full">
        <div className="text-center">
          <h3 className="text-lg font-medium mb-2">{t('dayView')}</h3>
          <p className="text-muted-foreground">{t('dayViewDescription')}</p>
        </div>
      </Card>
    )
  }

  // 修改任务点击事件处理函数
  const handleTaskClick = (task) => {
    setSelectedTask(task)
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

  if (isLoading) {
    return renderSkeletonCalendar()
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex-none py-4">
        {renderCalendarHeader()}
      </div>
      
      <div className="flex-1 overflow-hidden">
        <div className="h-full grid grid-cols-12 gap-4">
          <div className="col-span-2">
            <Card className="h-full p-4 overflow-y-auto">
              <div className="mb-4">
                <h3 className="font-medium mb-2">{t('teamMembers')}</h3>
                
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <Button variant="link" className="p-0 h-auto text-xs" onClick={handleSelectAllMembers}>
                      {t('selectAll')}
                    </Button>
                    <Button variant="link" className="p-0 h-auto text-xs" onClick={handleDeselectAllMembers}>
                      {t('deselectAll')}
                    </Button>
                  </div>
                  
                  {teamMembers.map(member => (
                    <div key={member.id} className="flex items-center">
                      <Checkbox 
                        id={`member-${member.id}`}
                        checked={selectedMembers.includes(member.id)}
                        onCheckedChange={() => handleToggleMember(member.id)}
                        className="mr-2"
                      />
                      <Avatar className="h-6 w-6 mr-2">
                        <AvatarImage src={member.avatar} alt={member.name} />
                        <AvatarFallback>{member.name ? member.name.charAt(0).toUpperCase() : '?'}</AvatarFallback>
                      </Avatar>
                      <label 
                        htmlFor={`member-${member.id}`}
                        className="text-sm cursor-pointer"
                      >
                        {member.name}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          </div>
          
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
