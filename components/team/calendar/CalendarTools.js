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
import { format, isBefore, startOfDay } from 'date-fns'
import { CalendarIcon, UserPlus, AlertCircle } from 'lucide-react'
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
import { supabase } from '@/lib/supabase';

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
  const [startDate, setStartDate] = useState(selectedDate || new Date())
  const [dueDate, setDueDate] = useState(selectedDate || new Date())
  const [selectedAssignees, setSelectedAssignees] = useState([])
  const [selectedSection, setSelectedSection] = useState(null)
  
  // 验证状态
  const [errors, setErrors] = useState({
    title: false,
    description: false,
    dates: false
  })
  const [errorMessages, setErrorMessages] = useState({
    title: '',
    description: '',
    dates: ''
  })
  
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
      setStartDate(selectedDate)
      setDueDate(selectedDate)
    }
  }, [selectedDate])
  
  // Reset form state when dialog opens
  useEffect(() => {
    if (isOpen) {
      setTitle('')
      setDescription('')
      setStartDate(selectedDate || new Date())
      setDueDate(selectedDate || new Date())
      setSelectedAssignees([])
      setErrors({
        title: false,
        description: false,
        dates: false
      })
      setErrorMessages({
        title: '',
        description: '',
        dates: ''
      })
      if (sections.length > 0) {
        setSelectedSection(sections[0].id)
      }
    }
  }, [isOpen, selectedDate, sections])
  
  // 表单验证
  useEffect(() => {
    // 验证标题
    const trimmedTitle = title.trim()
    if (trimmedTitle.length < 2 && trimmedTitle.length > 0) {
      setErrors(prev => ({ ...prev, title: true }))
      setErrorMessages(prev => ({ ...prev, title: t('titleTooShort') }))
    } else if (trimmedTitle.length > 50) {
      setErrors(prev => ({ ...prev, title: true }))
      setErrorMessages(prev => ({ ...prev, title: t('titleTooLong') }))
    } else {
      setErrors(prev => ({ ...prev, title: false }))
      setErrorMessages(prev => ({ ...prev, title: '' }))
    }
    
    // 验证描述
    if (description.trim().length > 0 && description.trim().length < 10) {
      setErrors(prev => ({ ...prev, description: true }))
      setErrorMessages(prev => ({ ...prev, description: t('descriptionTooShort') }))
    } else if (description.trim().length > 100) {
      setErrors(prev => ({ ...prev, description: true }))
      setErrorMessages(prev => ({ ...prev, description: t('descriptionTooLong') }))
    } else {
      setErrors(prev => ({ ...prev, description: false }))
      setErrorMessages(prev => ({ ...prev, description: '' }))
    }
    
    // 验证日期 - 只检查dueDate是否早于startDate
    // 不再检查dueDate是否早于当前日期，因为日历选择器已经禁用了这个选项
    if (isBefore(dueDate, startDate)) {
      setErrors(prev => ({ ...prev, dates: true }))
      setErrorMessages(prev => ({ ...prev, dates: t('dueDateBeforeStartDate') }))
    } else {
      setErrors(prev => ({ ...prev, dates: false }))
      setErrorMessages(prev => ({ ...prev, dates: '' }))
    }
  }, [title, description, startDate, dueDate, t])

  // 检查表单是否有效
  const isFormValid = () => {
    const isTitleValid = title.trim().length >= 2 && title.trim().length <= 50
    const isDescriptionValid = description.trim().length === 0 || (description.trim().length >= 10 && description.trim().length <= 100)
    const isDatesValid = !isBefore(dueDate, startDate) // 只检查dueDate是否早于startDate
    const isSectionSelected = !!selectedSection
    
    return isTitleValid && isDescriptionValid && isDatesValid && isSectionSelected
  }

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!isFormValid()) {
      toast.error(t('formHasErrors'))
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
      const startDateTagId = await dispatch(getTagByName("Start Date")).unwrap()
      
      // 准备任务数据
      const taskData = {
        tag_values: {
          [titleTagId]: title.trim(),
          [dueDateTagId]: format(dueDate, 'yyyy-MM-dd'),
          [startDateTagId]: format(startDate, 'yyyy-MM-dd')
        },
        created_by: currentUser.id
      }
      
      // 添加可选字段
      if (description.trim()) {
        taskData.tag_values[descriptionTagId] = description.trim()
      }
      
      if (selectedAssignees.length > 0) {
        taskData.tag_values[assigneesTagId] = selectedAssignees
      }
            
      // 创建任务
      const result = await dispatch(createTask(taskData)).unwrap()
      //it may also create a notion_page, then update the notion_page id into the task table, page_id column
      const { data: notionPageData, error: notionPageError } = await supabase
        .from('notion_page')
        .insert({
          created_by: currentUser.id,
          last_edited_by: currentUser.id
        })
        .select()
        .single();
      //update the notion_page id into the task table, page_id column
      const { data: newTaskData, error: taskError } = await supabase
        .from('task')
        .update({
          page_id: notionPageData.id
        })
        .eq('id', result.id);
      
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
            <div className="grid grid-cols-4 items-start gap-4">
              <Label htmlFor="title" className="text-right pt-2">
                {t('title')} *
              </Label>
              <div className="col-span-3 space-y-1">
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={t('taskTitlePlaceholder')}
                  className={cn(errors.title && "border-red-500")}
                  maxLength={50}
                  autoFocus
                />
                <div className="flex justify-between items-center">
                  {errors.title ? (
                    <p className="text-xs text-red-500 flex items-center">
                      <AlertCircle className="h-3 w-3 mr-1" />
                      {errorMessages.title}
                    </p>
                  ) : (
                    <span className="text-xs text-muted-foreground opacity-0"></span>
                  )}
                  <span className="text-xs text-muted-foreground">
                    {title.trim().length}/50
                  </span>
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-4 items-start gap-4">
              <Label htmlFor="section" className="text-right pt-2">
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
              <div className="col-span-3 space-y-1">
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={t('taskDescriptionPlaceholder')}
                  className={cn("min-h-24", errors.description && "border-red-500")}
                  maxLength={100}
                />
                <div className="flex justify-between items-center">
                  {errors.description ? (
                    <p className="text-xs text-red-500 flex items-center">
                      <AlertCircle className="h-3 w-3 mr-1" />
                      {errorMessages.description}
                    </p>
                  ) : (
                    <span className="text-xs text-muted-foreground opacity-0"></span>
                  )}
                  <span className="text-xs text-muted-foreground">
                    {description.trim().length}/100
                  </span>
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-4 items-start gap-4">
              <Label htmlFor="dueDate" className="text-right pt-2">
                {t('dueDate')}
              </Label>
              <div className="col-span-3 space-y-1">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      id="dueDate"
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !dueDate && "text-muted-foreground",
                        errors.dates && "border-red-500"
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
                      disabled={(date) => isBefore(date, startOfDay(new Date()))}
                    />
                  </PopoverContent>
                </Popover>
                {errors.dates && (
                  <p className="text-xs text-red-500 flex items-center">
                    <AlertCircle className="h-3 w-3 mr-1" />
                    {errorMessages.dates}
                  </p>
                )}
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
              disabled={taskStatus === 'loading' || !isFormValid() || title.trim().length < 2}
            >
              {taskStatus === 'loading' ? t('creating') : t('create')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
