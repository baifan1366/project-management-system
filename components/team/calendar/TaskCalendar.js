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
import { WeekView, DayView } from '@/components/calendar'

// Task status color mapping
const statusColors = {
  'PENDING': 'bg-yellow-500',
  'IN_PROGRESS': 'bg-blue-500',
  'COMPLETED': 'bg-green-500',
  'CANCELLED': 'bg-red-500',
  'ON_HOLD': 'bg-purple-500'
}

// Task priority color mapping
const priorityColors = {
  'LOW': 'bg-blue-300',
  'MEDIUM': 'bg-yellow-400',
  'HIGH': 'bg-orange-500',
  'URGENT': 'bg-red-600'
}

export default function TaskCalendar({ teamId }) {
  const t = useTranslations('Calendar')
  const { user: currentUser, isLoading: userLoading } = useGetUser()
  
  // State variables
  const [currentDate, setCurrentDate] = useState(new Date())
  const [view, setView] = useState('month') // month, week, day
  const [tasks, setTasks] = useState([])
  const [teamMembers, setTeamMembers] = useState([])
  const [selectedMembers, setSelectedMembers] = useState([])
  const [selectedStatuses, setSelectedStatuses] = useState(['PENDING', 'IN_PROGRESS'])
  const [isLoading, setIsLoading] = useState(true)
  const [isViewLoading, setIsViewLoading] = useState(false)
  const [isCreateTaskOpen, setIsCreateTaskOpen] = useState(false)
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [teamName, setTeamName] = useState('')

  // Fetch team details
  useEffect(() => {
    async function fetchTeamDetails() {
      if (!teamId) return
      
      try {
        const { data, error } = await supabase
          .from('team')
          .select('name')
          .eq('id', teamId)
          .single()
        
        if (error) throw error
        
        if (data) {
          setTeamName(data.name)
        }
      } catch (error) {
        console.error('Error fetching team details:', error)
      }
    }
    
    fetchTeamDetails()
  }, [teamId])

  // Fetch team members
  useEffect(() => {
    async function fetchTeamMembers() {
      if (!teamId) return
      
      try {
        // Get team members via user_team relationship
        const { data, error } = await supabase
          .from('user_team')
          .select(`
            user_id,
            role,
            user:user_id (
              id,
              name,
              email,
              avatar_url
            )
          `)
          .eq('team_id', teamId)
        
        if (error) throw error
        
        if (data) {
          const members = data.map(item => ({
            id: item.user.id,
            name: item.user.name,
            email: item.user.email,
            avatar: item.user.avatar_url,
            role: item.role
          }))
          
          setTeamMembers(members)
          
          // By default, select all members
          setSelectedMembers(members.map(m => m.id))
        }
      } catch (error) {
        console.error('Error fetching team members:', error)
        toast.error(t('errorFetchingTeamMembers'))
      }
    }
    
    fetchTeamMembers()
  }, [teamId, t])

  // Fetch tasks based on selected date range and filters
  useEffect(() => {
    async function fetchTasks() {
      if (!teamId || selectedMembers.length === 0) {
        setTasks([])
        setIsLoading(false)
        return
      }
      
      setIsLoading(true)
      try {
        // Get month range for queries
        const startDate = format(startOfMonth(currentDate), 'yyyy-MM-dd')
        const endDate = format(endOfMonth(currentDate), 'yyyy-MM-dd')
        
        // Get sections for this team
        const { data: sections, error: sectionsError } = await supabase
          .from('section')
          .select('id, name, task_ids')
          .eq('team_id', teamId)
        
        if (sectionsError) throw sectionsError
        
        // Get all task IDs from sections
        const taskIds = sections
          ? sections.flatMap(section => section.task_ids || [])
          : []
        
        if (taskIds.length === 0) {
          setTasks([])
          setIsLoading(false)
          return
        }
        
        // Get tasks by IDs
        const { data: taskData, error: taskError } = await supabase
          .from('task')
          .select('*, created_by(id, name, avatar_url)')
          .in('id', taskIds)
        
        if (taskError) throw taskError
        
        // Process tasks with tag values and filter by date range and members
        const processedTasks = taskData
          .filter(task => {
            // Filter by status if status is in tag_values
            const status = task.tag_values?.status || 'PENDING'
            if (!selectedStatuses.includes(status)) return false
            
            // Filter by assignee if assignee is in tag_values
            const assignees = task.tag_values?.assignees || []
            if (selectedMembers.length > 0 && !assignees.some(assignee => selectedMembers.includes(assignee))) {
              return false
            }
            
            // Filter by due date if in current month view
            if (task.tag_values?.due_date) {
              const dueDate = task.tag_values.due_date
              return dueDate >= startDate && dueDate <= endDate
            }
            
            return false
          })
          .map(task => ({
            id: task.id,
            title: task.tag_values?.title || `Task #${task.id}`,
            description: task.tag_values?.description || '',
            status: task.tag_values?.status || 'PENDING',
            priority: task.tag_values?.priority || 'MEDIUM',
            assignees: task.tag_values?.assignees || [],
            due_date: task.tag_values?.due_date,
            start_date: task.tag_values?.start_date,
            created_by: {
              id: task.created_by?.id,
              name: task.created_by?.name,
              avatar: task.created_by?.avatar_url
            },
            created_at: task.created_at
          }))
        
        setTasks(processedTasks)
      } catch (error) {
        console.error('Error fetching tasks:', error)
        toast.error(t('errorFetchingTasks'))
      } finally {
        setIsLoading(false)
        setIsViewLoading(false)
      }
    }
    
    fetchTasks()
  }, [teamId, currentDate, selectedMembers, selectedStatuses, t])

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

  const handleToggleStatus = (status) => {
    setSelectedStatuses(prev => {
      if (prev.includes(status)) {
        return prev.filter(s => s !== status)
      }
      return [...prev, status]
    })
  }

  const handleSelectAllMembers = () => {
    setSelectedMembers(teamMembers.map(m => m.id))
  }

  const handleDeselectAllMembers = () => {
    setSelectedMembers([])
  }

  // Task creation success handler
  const handleTaskCreated = () => {
    setIsViewLoading(true)
    // Re-fetch tasks after creation
    const fetchTasks = async () => {
      try {
        // Implement the same task fetching logic as in the useEffect
        // ...
        
        // For now, just setting a timeout to simulate loading
        setTimeout(() => {
          setIsViewLoading(false)
        }, 1000)
      } catch (error) {
        console.error('Error fetching tasks:', error)
        setIsViewLoading(false)
      }
    }
    
    fetchTasks()
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
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center space-x-2">
        <CalendarIcon className="h-5 w-5" />
        <h1 className="text-2xl font-bold">{teamName} {t('taskCalendar')}</h1>
      </div>
      
      <div className="flex items-center space-x-2">
        <Tabs value={view} onValueChange={(newView) => {
          if (newView === view) return
          setIsViewLoading(true)
          setView(newView)
        }} className="mr-2">
          <TabsList>
            <TabsTrigger value="month">{t('month')}</TabsTrigger>
            <TabsTrigger value="week">{t('week')}</TabsTrigger>
            <TabsTrigger value="day">{t('day')}</TabsTrigger>
          </TabsList>
        </Tabs>
        
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="icon" onClick={() => {
            if (view === 'month') handlePrevMonth()
            else if (view === 'week') handlePrevWeek()
            else handlePrevDay()
          }}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="font-medium min-w-32 text-center">
            {view === 'month' && format(currentDate, 'MMMM yyyy')}
            {view === 'week' && `${format(startOfWeek(currentDate), 'MMM d')} - ${format(addDays(startOfWeek(currentDate), 6), 'MMM d, yyyy')}`}
            {view === 'day' && format(currentDate, 'EEEE, MMMM d, yyyy')}
          </div>
          <Button variant="outline" size="icon" onClick={() => {
            if (view === 'month') handleNextMonth()
            else if (view === 'week') handleNextWeek()
            else handleNextDay()
          }}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="outline" className="ml-2" onClick={handleTodayClick}>
            {t('today')}
          </Button>
        </div>
        
        <Button variant="outline">
          <Filter className="h-4 w-4 mr-2" />
          {t('filter')}
        </Button>
        
        <Button onClick={() => handleOpenCreateTask()}>
          <Plus className="h-4 w-4 mr-2" />
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

    // Process tasks for month view
    const processTasksForMonth = () => {
      // Group tasks by due date for easier rendering
      const tasksByDate = {}
      
      tasks.forEach(task => {
        if (task.due_date) {
          if (!tasksByDate[task.due_date]) {
            tasksByDate[task.due_date] = []
          }
          tasksByDate[task.due_date].push(task)
        }
      })
      
      return tasksByDate
    }
    
    const tasksByDate = processTasksForMonth()

    // Generate calendar days
    let day = startDate
    let weekRows = []
    let currentWeekDays = []
    
    for (let i = 0; i < 42; i++) {
      const formattedDate = format(day, 'yyyy-MM-dd')
      const isCurrentMonth = isSameMonth(day, currentDate)
      const isToday = isSameDay(day, new Date())
      const currentDay = new Date(day)
      
      // Get tasks for this day
      const dayTasks = tasksByDate[formattedDate] || []

      const dayCellContent = (
        <div className="flex flex-col h-full">
          <div className="flex justify-between items-start mb-2">
            <span className={cn(
              "inline-flex h-5 w-5 items-center justify-center rounded-full text-xs",
              isToday && "bg-primary text-primary-foreground font-medium"
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
                  <DropdownMenuItem>{t('viewAll')}</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>

          <div className="space-y-0.5 mt-1 max-h-[75px] overflow-y-auto">
            {dayTasks.map((task) => (
              <div 
                key={`task-${task.id}`} 
                className={cn(
                  "text-xs py-0.5 px-1 rounded truncate cursor-pointer transition-opacity hover:opacity-80",
                  statusColors[task.status] ? `${statusColors[task.status]}/20 border-l-2 border-l-${statusColors[task.status]}` : "bg-blue-100 dark:bg-blue-900/30"
                )}
                title={`${task.title} (${task.status})`}
                style={{
                  borderLeftColor: task.status ? statusColors[task.status]?.replace('bg-', '') : undefined
                }}
                onClick={(e) => {
                  e.stopPropagation()
                  // Handle task click - could open task details
                  toast.info(`Task: ${task.title}`)
                }}
              >
                <div className="flex justify-between items-center">
                  <span className="truncate">{task.title}</span>
                  {task.assignees && task.assignees.length > 0 && (
                    <div className="flex -space-x-1">
                      {task.assignees.slice(0, 2).map((assigneeId, idx) => {
                        const assignee = teamMembers.find(m => m.id === assigneeId)
                        return assignee ? (
                          <div key={idx} className="h-3 w-3 rounded-full bg-gray-200 flex items-center justify-center text-[6px] border border-white">
                            {assignee.name.charAt(0)}
                          </div>
                        ) : null
                      })}
                      {task.assignees.length > 2 && (
                        <div className="h-3 w-3 rounded-full bg-gray-200 flex items-center justify-center text-[6px] border border-white">
                          +{task.assignees.length - 2}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )

      currentWeekDays.push(
        <div 
          key={formattedDate}
          className={cn(
            "min-h-[120px] p-1.5 pt-1 border border-border/50 cursor-pointer transition-colors relative",
            !isCurrentMonth && "bg-muted/30 text-muted-foreground",
            isToday && "bg-accent/10",
            "hover:bg-accent/5"
          )}
          onClick={() => handleOpenCreateTask(currentDay)}
        >
          {dayCellContent}
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
                        <AvatarFallback>{member.name.charAt(0)}</AvatarFallback>
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
              
              <div>
                <h3 className="font-medium mb-2">{t('taskStatus')}</h3>
                <div className="space-y-3">
                  {Object.entries(statusColors).map(([status, color]) => (
                    <div key={status} className="flex items-center">
                      <Checkbox 
                        id={`status-${status}`}
                        checked={selectedStatuses.includes(status)}
                        onCheckedChange={() => handleToggleStatus(status)}
                        className="mr-2"
                      />
                      <div className={`w-3 h-3 ${color} rounded-full mr-2`}></div>
                      <label 
                        htmlFor={`status-${status}`}
                        className="text-sm cursor-pointer"
                      >
                        {t(status.toLowerCase())}
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
    </div>
  )
}
