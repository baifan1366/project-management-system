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
import { format } from 'date-fns'
import { CalendarIcon, Trash2 } from 'lucide-react'
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
  // 状态
  const [name, setName] = useState(task.name || '')
  const [description, setDescription] = useState(task.description || '')
  const [dueDate, setDueDate] = useState(task.dueDate ? new Date(task.dueDate) : new Date())
  const [selectedAssignees, setSelectedAssignees] = useState(task.assigneeId ? [task.assigneeId] : [])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const project = useSelector(state => 
    state.projects.projects.find(p => String(p.id) === String(projectId))
  );
  // 处理提交
  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!name.trim()) {
      toast.error(t('nameRequired'))
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
      
      // 获取当前任务数据
      const previousTaskData = await dispatch(fetchTaskById(task.id)).unwrap()
      
      // 准备更新的数据
      const updatedTaskData = {
        tag_values: {
          [titleTagId]: name.trim(),
          [dueDateTagId]: format(dueDate, 'yyyy-MM-dd')
        }
      }
      
      // 添加可选字段
      if (description.trim()) {
        updatedTaskData.tag_values[descriptionTagId] = description.trim()
      }
      
      if (selectedAssignees.length > 0) {
        updatedTaskData.tag_values[assigneeTagId] = selectedAssignees[0] // 目前只支持单个分配者
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
          <DialogTitle>{t('editTask')}</DialogTitle>
          <DialogDescription>
            {t('editTaskDescription')}
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                {t('taskName')} *
              </Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t('enterTaskName')}
                className="col-span-3"
                required
              />
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
                    {dueDate ? format(dueDate, 'PPP') : <span>{t('pickDate')}</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={dueDate}
                    onSelect={setDueDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
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
          
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="destructive"
              onClick={handleDelete}
              disabled={isSubmitting || isDeleting}
              className="mr-auto"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              {t('deleteTask')}
            </Button>
            
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsOpen(false)}
                disabled={isSubmitting || isDeleting}
              >
                {t('cancel')}
              </Button>
              <Button type="submit" disabled={isSubmitting || isDeleting} variant={themeColor}>
                {isSubmitting ? t('updating') : t('update')}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
