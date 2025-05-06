'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogDescription 
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select'
import { format } from 'date-fns'
import { CalendarIcon, UserPlus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { useDispatch, useSelector } from 'react-redux'
import { createTask } from '@/lib/redux/features/taskSlice'
import { getSectionByTeamId, updateTaskIds } from '@/lib/redux/features/sectionSlice'
import { getTagByName } from '@/lib/redux/features/tagSlice'
import { toast } from 'sonner'
import { useGetUser } from '@/lib/hooks/useGetUser'
import { useParams } from "next/navigation";

export default function CalendarTools({ 
  isOpen,
  setIsOpen,
  selectedDate,
  teamId,
  teamMembers = [],
  onTaskCreated
}) {
  const t = useTranslations('Calendar')
  const { user: currentUser } = useGetUser()
  const dispatch = useDispatch()
  const params = useParams()
  const { id: projectId } = params
  const [themeColor, setThemeColor] = useState('#64748b')
  // Redux state
  const sections = useSelector(state => state.sections.sections)
  const taskStatus = useSelector(state => state.tasks.status)
  const project = useSelector(state => 
    state.projects.projects.find(p => String(p.id) === String(projectId))
  );
  // Form state
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [dueDate, setDueDate] = useState(selectedDate || new Date())
  const [selectedAssignees, setSelectedAssignees] = useState([])
  const [selectedSection, setSelectedSection] = useState(null)
  useEffect(() => {
    if (project?.theme_color) {
      setThemeColor(project.theme_color);
    }
  }, [project]);
  // Fetch team sections
  useEffect(() => {
    if (teamId) {
      dispatch(getSectionByTeamId(teamId))
    }
  }, [teamId, dispatch])
  
  // Set selected date when it changes
  useEffect(() => {
    if (selectedDate) {
      setDueDate(selectedDate)
    }
  }, [selectedDate])
  
  // Reset form state when dialog opens
  useEffect(() => {
    if (isOpen) {
      setTitle('')
      setDescription('')
      setDueDate(selectedDate || new Date())
      setSelectedAssignees([])
      if (sections.length > 0) {
        setSelectedSection(sections[0].id)
      }
    }
  }, [isOpen, selectedDate, sections])

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!title.trim()) {
      toast.error(t('titleRequired'))
      return
    }
    
    if (!selectedSection) {
      toast.error(t('sectionRequired'))
      return
    }
    
    if (!currentUser) {
      toast.error(t('userNotLoggedIn'))
      return
    }
    
    try {
      // 获取标签IDs
      const titleTagId = await dispatch(getTagByName("Name")).unwrap()
      const descriptionTagId = await dispatch(getTagByName("Description")).unwrap()
      const dueDateTagId = await dispatch(getTagByName("Due Date")).unwrap()
      const assigneesTagId = await dispatch(getTagByName("Assignee")).unwrap()
      
      console.log('获取到的标签IDs:', {
        titleTagId, descriptionTagId, dueDateTagId, 
        assigneesTagId
      })
      
      // 准备任务数据
      const taskData = {
        tag_values: {
          [titleTagId]: title.trim(),
        },
        created_by: currentUser.id
      }
      
      // 添加可选字段
      if (description.trim()) {
        taskData.tag_values[descriptionTagId] = description.trim()
      }
      
      taskData.tag_values[dueDateTagId] = format(dueDate, 'yyyy-MM-dd')
      
      if (selectedAssignees.length > 0) {
        taskData.tag_values[assigneesTagId] = selectedAssignees
      }
      
      console.log('准备创建的任务数据:', taskData)
      
      // 创建任务
      const result = await dispatch(createTask(taskData)).unwrap()
      console.log('任务创建结果:', result)
      
      // 如果任务创建成功且有分区ID，将任务添加到分区的task_ids中
      if (result && result.id && selectedSection) {
        try {
          // 获取分区数据
          const sectionsResult = await dispatch(getSectionByTeamId(teamId)).unwrap()
          
          // 找到对应的分区
          const section = sectionsResult.find(s => 
            s.id === parseInt(selectedSection) || 
            s.id === selectedSection
          )
          
          if (section) {
            // 添加新任务ID到task_ids数组
            const updatedTaskIds = [...(section.task_ids || []), result.id]
            
            // 使用updateTaskIds更新分区的task_ids数组
            await dispatch(updateTaskIds({
              sectionId: section.id,
              teamId: teamId,
              newTaskIds: updatedTaskIds
            })).unwrap()
            
            console.log(`已将任务 ${result.id} 添加到分区 ${section.id} 的task_ids中`)
          } else {
            console.error(`未找到ID为 ${selectedSection} 的分区`)
          }
        } catch (error) {
          console.error('将任务添加到分区时出错:', error)
        }
      }
      
      toast.success(t('taskCreated'))
      
      if (typeof onTaskCreated === 'function') {
        onTaskCreated()
      }
      
      setIsOpen(false)
    } catch (error) {
      console.error('Error creating task:', error)
      toast.error(t('errorCreatingTask'))
    }
  }

  const handleToggleAssignee = (userId) => {
    setSelectedAssignees(prev => {
      if (prev.includes(userId)) {
        return prev.filter(id => id !== userId)
      }
      return [...prev, userId]
    })
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[600px]" onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>{t('createTask')}</DialogTitle>
          <DialogDescription>
            {t('createTaskDescription')}
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="title" className="text-right">
                {t('title')} *
              </Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={t('taskTitlePlaceholder')}
                className="col-span-3"
                required
              />
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="section" className="text-right">
                {t('section')} *
              </Label>
              <Select 
                value={selectedSection?.toString() || ''} 
                onValueChange={(value) => setSelectedSection(parseInt(value))}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder={t('selectSection')} />
                </SelectTrigger>
                <SelectContent>
                  {sections.map((section) => (
                    <SelectItem key={section.id} value={section.id.toString()}>
                      {section.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid grid-cols-4 items-start gap-4">
              <Label htmlFor="description" className="text-right pt-2">
                {t('description')}
              </Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t('taskDescriptionPlaceholder')}
                className="col-span-3 min-h-24"
              />
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="dueDate" className="text-right">
                {t('dueDate')}
              </Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "col-span-3 justify-start text-left font-normal",
                      !dueDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dueDate ? format(dueDate, 'PPP') : <span>{t('selectDate')}</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={dueDate}
                    onSelect={(date) => setDueDate(date || new Date())}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>            
            
            <div className="grid grid-cols-4 items-start gap-4">
              <Label className="text-right pt-2">
                {t('assignees')}
              </Label>
              <div className="col-span-3">
                <div className="flex flex-wrap gap-2 mb-2">
                  {selectedAssignees.length === 0 ? (
                    <div className="text-sm text-muted-foreground italic">
                      {t('noAssignees')}
                    </div>
                  ) : (
                    selectedAssignees.map(userId => {
                      const member = teamMembers.find(m => m.id === userId)
                      return member ? (
                        <Badge 
                          key={userId} 
                          variant="secondary"
                          className="flex items-center gap-1"
                        >
                          <Avatar className="h-4 w-4">
                            <AvatarImage src={member.avatar} alt={member.name} />
                            <AvatarFallback className="text-[8px]">{member.name.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <span className="max-w-24 truncate">{member.name}</span>
                          <button 
                            type="button"
                            className="ml-1 text-muted-foreground hover:text-foreground"
                            onClick={() => handleToggleAssignee(userId)}
                          >
                            ×
                          </button>
                        </Badge>
                      ) : null
                    })
                  )}
                </div>
                
                <div className="border rounded-md">
                  <ScrollArea className="h-32">
                    <div className="p-2 space-y-1">
                      {teamMembers.map(member => (
                        <div 
                          key={member.id} 
                          className={cn(
                            "flex items-center gap-2 p-1.5 rounded cursor-pointer",
                            selectedAssignees.includes(member.id) 
                              ? "bg-accent" 
                              : "hover:bg-muted"
                          )}
                          onClick={() => handleToggleAssignee(member.id)}
                        >
                          <Avatar className="h-6 w-6">
                            <AvatarImage src={member.avatar} alt={member.name} />
                            <AvatarFallback>{member.name.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <div className="text-sm">{member.name}</div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setIsOpen(false)}
              disabled={taskStatus === 'loading'}
            >
              {t('cancel')}
            </Button>
            <Button 
              type="submit"
              variant={themeColor}
              disabled={taskStatus === 'loading'}
            >
              {taskStatus === 'loading' ? t('creating') : t('create')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
