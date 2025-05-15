'use client'

import React, { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { format, isBefore, startOfDay } from 'date-fns'
import { CalendarIcon, Trash2, AlertCircle, X, Loader2, Lock } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { useDispatch } from 'react-redux'
import { updateTask, deleteTask, fetchTaskById } from '@/lib/redux/features/taskSlice'
import { getSectionByTeamId, updateTaskIds } from '@/lib/redux/features/sectionSlice'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { useConfirm } from '@/hooks/use-confirm'
import { useGetUser } from '@/lib/hooks/useGetUser';
import { getTagByName } from '@/lib/redux/features/tagSlice'
import { useParams } from "next/navigation";
import { useSelector } from "react-redux";

export default function EditTaskDialog({
  isOpen,
  setIsOpen,
  task,
  teamId,
  teamMembers,
  onTaskUpdated
}) {
  const t = useTranslations('Calendar')
  const tConfirm = useTranslations('confirmation')
  const dispatch = useDispatch()
  const { confirm } = useConfirm()
  const { user } = useGetUser();
  const params = useParams()
  const { id: projectId } = params
  const [themeColor, setThemeColor] = useState('#64748b')
  
  // 检查任务是否为只读模式（过去的任务）
  // 如果任务已经标记为只读或者截止日期在今天之前，则设置为只读
  const isReadOnly = task.isReadOnly || (task.dueDate && isBefore(new Date(task.dueDate), startOfDay(new Date())))
  
  // 状态
  const [name, setName] = useState(task.name || '')
  const [description, setDescription] = useState(task.description || '')
  const [startDate, setStartDate] = useState(() => {
    if (task.startDate) {
      try {
        // 尝试解析日期，支持多种格式
        let date;
        if (typeof task.startDate === 'string') {
          // 尝试替换连字符为斜杠以提高兼容性
          date = new Date(task.startDate.replace(/-/g, '/'));
        } else if (task.startDate instanceof Date) {
          date = task.startDate;
        } else {
          date = new Date(task.startDate);
        }
        
        console.log('解析开始日期:', task.startDate, '结果:', date);
        if (!isNaN(date.getTime())) return date;
      } catch (e) {
        console.error('无效的开始日期:', e, task.startDate);
      }
    }
    return new Date();
  })
  
  const [dueDate, setDueDate] = useState(() => {
    if (task.dueDate) {
      try {
        // 尝试解析日期，支持多种格式
        let date;
        if (typeof task.dueDate === 'string') {
          // 尝试替换连字符为斜杠以提高兼容性
          date = new Date(task.dueDate.replace(/-/g, '/'));
        } else if (task.dueDate instanceof Date) {
          date = task.dueDate;
        } else {
          date = new Date(task.dueDate);
        }
        
        console.log('解析截止日期:', task.dueDate, '结果:', date);
        if (!isNaN(date.getTime())) return date;
      } catch (e) {
        console.error('无效的截止日期:', e, task.dueDate);
      }
    }
    return new Date();
  })
  const [selectedAssignees, setSelectedAssignees] = useState(
    Array.isArray(task.assigneeId) ? task.assigneeId : 
      task.assigneeId ? [task.assigneeId] : []
  )
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  
  // 验证状态
  const [errors, setErrors] = useState({
    name: false,
    description: false,
    dates: false
  })
  const [errorMessages, setErrorMessages] = useState({
    name: '',
    description: '',
    dates: ''
  })
  
  const project = useSelector(state => 
    state.projects.projects.find(p => String(p.id) === String(projectId))
  );
  
  // 表单验证
  useEffect(() => {
    // 如果任务是只读的，则无需验证
    if (isReadOnly) {
      setErrors({
        name: false,
        description: false,
        dates: false
      });
      setErrorMessages({
        name: '',
        description: '',
        dates: ''
      });
      return;
    }
    
    // 验证名称
    const trimmedName = name.trim()
    if (trimmedName.length < 2 && trimmedName.length > 0) {
      setErrors(prev => ({ ...prev, name: true }))
      setErrorMessages(prev => ({ ...prev, name: t('nameTooShort') }))
    } else if (trimmedName.length > 100) {
      setErrors(prev => ({ ...prev, name: true }))
      setErrorMessages(prev => ({ ...prev, name: t('nameTooLong') }))
    } else {
      setErrors(prev => ({ ...prev, name: false }))
      setErrorMessages(prev => ({ ...prev, name: '' }))
    }
    
    // 验证描述
    if (description.trim().length > 0 && description.trim().length < 10) {
      setErrors(prev => ({ ...prev, description: true }))
      setErrorMessages(prev => ({ ...prev, description: t('descriptionTooShort') }))
    } else if (description.trim().length > 1000) {
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
  }, [name, description, startDate, dueDate, t, isReadOnly])
  
  // 检查表单是否有效
  const isFormValid = () => {
    const isNameValid = name.trim().length >= 2 && name.trim().length <= 100
    const isDescriptionValid = description.trim().length === 0 || (description.trim().length >= 10 && description.trim().length <= 1000)
    const isDatesValid = !isBefore(dueDate, startDate) // 只检查dueDate是否早于startDate
    
    return isNameValid && isDescriptionValid && isDatesValid
  }
  
  // 处理提交
  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!isFormValid()) {
      toast.error(t('formHasErrors'))
      return
    }
    
    if (!task.id) {
      toast.error(t('taskIdRequired'))
      return
    }
    
    setIsSubmitting(true)
    
    try {
      // 获取标签IDs
      const titleTagId = await dispatch(getTagByName("Name")).unwrap()
      const descriptionTagId = await dispatch(getTagByName("Description")).unwrap()
      const dueDateTagId = await dispatch(getTagByName("Due Date")).unwrap()
      const assigneeTagId = await dispatch(getTagByName("Assignee")).unwrap()
      const startDateTagId = await dispatch(getTagByName("Start Date")).unwrap()
      
      // 获取当前任务数据
      const previousTaskData = await dispatch(fetchTaskById(task.id)).unwrap()
      
      // 准备更新的数据
      const updatedTaskData = {
        tag_values: {
          [titleTagId]: name.trim(),
          [dueDateTagId]: format(dueDate, 'yyyy-MM-dd'),
          [startDateTagId]: format(startDate, 'yyyy-MM-dd')
        }
      }
      
      // 添加可选字段
      if (description.trim()) {
        updatedTaskData.tag_values[descriptionTagId] = description.trim()
      }
      
      if (selectedAssignees.length > 0) {
        updatedTaskData.tag_values[assigneeTagId] = selectedAssignees
      }
      
      // 更新任务
      await dispatch(updateTask({
        taskId: task.id,
        taskData: updatedTaskData,
        oldTask: previousTaskData
      })).unwrap()
      
      toast.success(t('taskUpdated'))
      onTaskUpdated()
      setIsOpen(false)
    } catch (error) {
      console.error('Error updating task:', error)
      toast.error(t('errorUpdatingTask'))
    } finally {
      setIsSubmitting(false)
    }
  }

  // 处理删除
  const handleDelete = async () => {
    if (!task.id) {
      toast.error(t('taskIdRequired'))
      return
    }

    const confirmed = await confirm({
      title: tConfirm('deleteTaskConfirmTitle'),
      variant: "error",
      description: tConfirm('deleteTaskConfirmDescription')
    })

    if (!confirmed) return

    setIsDeleting(true)
    try {
      // 获取所有分区
      const sectionsResult = await dispatch(getSectionByTeamId(teamId)).unwrap()
      
      // 检查每个分区是否包含要删除的任务ID
      for (const section of sectionsResult) {
        if (section.task_ids && section.task_ids.includes(parseInt(task.id))) {
          // 从task_ids数组中移除该任务ID
          const updatedTaskIds = section.task_ids.filter(id => id !== parseInt(task.id))
          
          // 更新分区的task_ids
          await dispatch(updateTaskIds({
            sectionId: section.id,
            teamId: teamId,
            newTaskIds: updatedTaskIds
          }))
        }
      }

      // 删除任务
      await dispatch(deleteTask({
        sectionId: null, // API会处理从部分中删除任务ID
        userId: user?.id,
        oldValues: task,
        taskId: task.id,
        teamId: teamId
      })).unwrap()
      
      toast.success(t('taskDeleted'))
      onTaskUpdated()
      setIsOpen(false)
    } catch (error) {
      console.error('Error deleting task:', error)
      toast.error(t('errorDeletingTask'))
    } finally {
      setIsDeleting(false)
    }
  }

  // 处理分配者选择
  const handleToggleAssignee = (userId) => {
    setSelectedAssignees(prev => {
      if (prev.includes(userId)) {
        return prev.filter(id => id !== userId)
      }
      return [...prev, userId]
    })
  }
  
  useEffect(() => {
    if (project?.theme_color) {
      setThemeColor(project.theme_color);
    }
  }, [project]);
  
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[600px]" onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>
            {isReadOnly ? t('viewTask') : t('editTask')}
          </DialogTitle>
          <DialogDescription>
            {isReadOnly ? t('viewTaskDescription') : t('editTaskDescription')}
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-start gap-4">
              <Label htmlFor="name" className="text-right pt-2">
                {t('taskName')} *
              </Label>
              <div className="col-span-3 space-y-1">
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t('enterTaskName')}
                  className={cn(errors.name && "border-red-500")}
                  required
                  disabled={isReadOnly}
                />
                <div className="flex justify-between items-center">
                  {errors.name && !isReadOnly ? (
                    <p className="text-xs text-red-500 flex items-center">
                      <AlertCircle className="h-3 w-3 mr-1" />
                      {errorMessages.name}
                    </p>
                  ) : (
                    <span className="text-xs text-muted-foreground opacity-0">占位</span>
                  )}
                  <span className="text-xs text-muted-foreground">
                    {name.trim().length}/100
                  </span>
                </div>
              </div>
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
                  className={cn(
                    "min-h-[100px]",
                    errors.description && "border-red-500"
                  )}
                  disabled={isReadOnly}
                />
                <div className="flex justify-between items-center">
                  {errors.description && !isReadOnly ? (
                    <p className="text-xs text-red-500 flex items-center">
                      <AlertCircle className="h-3 w-3 mr-1" />
                      {errorMessages.description}
                    </p>
                  ) : (
                    <span className="text-xs text-muted-foreground opacity-0">占位</span>
                  )}
                  <span className="text-xs text-muted-foreground">
                    {description.trim().length}/1000
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
                      disabled={isReadOnly}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dueDate ? format(dueDate, 'PPP') : <span>{t('pickDate')}</span>}
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
                {errors.dates && !isReadOnly && (
                  <p className="text-xs text-red-500 flex items-center">
                    <AlertCircle className="h-3 w-3 mr-1" />
                    {errorMessages.dates}
                  </p>
                )}
              </div>
            </div>
            
            <div className="grid grid-cols-4 items-start gap-4">
              <Label className="text-right pt-2">
                {t('assignTo')}
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
                          {!isReadOnly && (
                            <button 
                              type="button"
                              className="ml-1 text-muted-foreground hover:text-foreground"
                              onClick={() => handleToggleAssignee(userId)}
                            >
                              ×
                            </button>
                          )}
                        </Badge>
                      ) : null
                    })
                  )}
                </div>
                
                <div className={cn("border rounded-md", isReadOnly && "opacity-70")}>
                  <ScrollArea className="h-32">
                    <div className="p-2 space-y-1">
                      {teamMembers.map(member => (
                        <div 
                          key={member.id} 
                          className={cn(
                            "flex items-center gap-2 p-1.5 rounded",
                            !isReadOnly && "cursor-pointer",
                            isReadOnly ? "bg-muted/50" : (
                              selectedAssignees.includes(member.id) 
                                ? "bg-accent" 
                                : "hover:bg-muted"
                            )
                          )}
                          onClick={() => !isReadOnly && handleToggleAssignee(member.id)}
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
            {isReadOnly ? (
              <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
                {t('close')}
              </Button>
            ) : (
              <>
                <Button
                  type="button"
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={isDeleting || isSubmitting || isReadOnly}
                  className="mr-auto"
                >
                  {isDeleting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {t('deleting')}
                    </>
                  ) : (
                    <>
                      <Trash2 className="mr-2 h-4 w-4" />
                      {t('deleteTask')}
                    </>
                  )}
                </Button>
                
                <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
                  {t('cancel')}
                </Button>
                
                <Button 
                  type="submit" 
                  disabled={isSubmitting || !isFormValid() || isDeleting || isReadOnly}
                  variant={themeColor}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {t('updating')}
                    </>
                  ) : (
                    t('updateTask')
                  )}
                </Button>
              </>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
