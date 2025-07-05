'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format, isBefore, startOfToday, parseISO, isSameDay, endOfDay, addHours } from 'date-fns';
import { CalendarIcon, Clock, ShieldAlert, ClockIcon } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import useTeamMembership from '@/hooks/useTeamMembership';
import useGetUser from '@/lib/hooks/useGetUser';

export default function EditTaskDialog({ isOpen, setIsOpen, task, onSuccess }) {
  const t = useTranslations('myTasks');
  const t_common = useTranslations('common');
  const { user } = useGetUser();
  
  // Initialize the team membership hook
  const { isMember: isTeamMember, isChecking: isMembershipChecking, checkTaskTeamMembership } = useTeamMembership();
  
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('TODO');
  const [dueDate, setDueDate] = useState(null);
  const [startDate, setStartDate] = useState(null);
  const [startTime, setStartTime] = useState('09:00');
  const [dueTime, setDueTime] = useState('17:00');
  const [priority, setPriority] = useState('MEDIUM');
  const [formErrors, setFormErrors] = useState({
    dateError: '',
    timeError: ''
  });
  
  // Check team membership when task changes
  useEffect(() => {
    if (task && task.task_id && user) {
      checkTaskTeamMembership(user.id, task.task_id);
    }
  }, [task, user, checkTaskTeamMembership]);

  // 分离useEffect: 基本字段初始化
  useEffect(() => {
    if (task && isOpen) {
      setTitle(task.title || '');
      setDescription(task.description || '');
      setStatus(task.status || 'TODO');
      setPriority(task.priority || 'MEDIUM');
    }
  }, [task, isOpen]);
  
  // 分离useEffect: 仅处理日期字段，避免循环更新
  useEffect(() => {
    // 创建一个处理日期的函数，在useEffect内部调用
    const processTaskDates = () => {
      if (!task || !isOpen) return;
      
      // 处理截止日期
      if (task.expected_completion_date) {
        try {
          const dateObj = new Date(task.expected_completion_date);
          
          setDueDate(dateObj);
          
          // Extract time from expected_completion_date
          const timeString = format(dateObj, 'HH:mm');
          setDueTime(timeString);
        } catch (error) {
          console.error('Invalid due date format:', error);
          setDueDate(null);
        }
      } else {
        setDueDate(null);
      }
      
      // 处理开始日期 - 添加安全检查
      if (task.expected_start_time) {
        try {
          const dateObj = new Date(task.expected_start_time);
          
          setStartDate(dateObj);
          
          // Extract time from expected_start_time
          const timeString = format(dateObj, 'HH:mm');
          setStartTime(timeString);
        } catch (error) {
          console.error('Invalid start date format:', error);
          setStartDate(null);
        }
      } else {
        setStartDate(null);
      }
    };
    
    // 调用内部函数处理日期
    processTaskDates();
  }, [task, isOpen]);
  
  // 调试用，查看任务对象
  useEffect(() => {
    if (task && isOpen) {
      
    }
  }, [task, isOpen]);
  
  // Function to check if a date is in the past
  const isDateInPast = (date) => {
    return date && isBefore(date, startOfToday());
  };

  // Function to disable past dates in calendar
  const disablePastDates = (date) => {
    return isBefore(date, startOfToday());
  };

  // Check if task is past due
  const isPastDue = task?.expected_completion_date ? 
    isBefore(new Date(task.expected_completion_date), new Date()) : 
    false;

  // Validate form data
  const validateForm = () => {
    const errors = {
      dateError: '',
      timeError: ''
    };
    
    // First check if user has permission if task has reference
    if (task.task_id && !isTeamMember) {
      toast.error(t('noPermissionTeamTask'));
      return false;
    }
    
    // Check for past dates
    if (startDate && isDateInPast(startDate) && !isSameDay(startDate, new Date())) {
      errors.dateError = t('cannotSelectPastDate') || 'Cannot select a date in the past';
    }
    
    // Create complete date-time objects for validation
    if (startDate && dueDate) {
      const [startHours, startMinutes] = startTime.split(':').map(Number);
      const [dueHours, dueMinutes] = dueTime.split(':').map(Number);
      
      const startDateTime = new Date(
        startDate.getFullYear(),
        startDate.getMonth(),
        startDate.getDate(),
        startHours,
        startMinutes
      );
      
      const endDateTime = new Date(
        dueDate.getFullYear(),
        dueDate.getMonth(),
        dueDate.getDate(),
        dueHours,
        dueMinutes
      );
      
      // Check if start time is in the past for today
      const now = new Date();
      
      if (isSameDay(startDate, now) && startDateTime < now) {
        errors.timeError = 'Cannot select a time in the past';
        setFormErrors(errors);
        return false;
      }
      
      // Check if end is before start
      if (endDateTime < startDateTime) {
        errors.timeError = 'End time must be after start time';
        setFormErrors(errors);
        return false;
      }
    }
    
    setFormErrors(errors);
    return !errors.dateError && !errors.timeError;
  }
  
  // Handle time change
  const handleTimeChange = (e) => {
    const { name, value } = e.target;
    
    if (name === 'startTime') {
      setStartTime(value);
    } else if (name === 'dueTime') {
      setDueTime(value);
    }
    
    // Clear previous errors
    setFormErrors(prev => ({
      ...prev,
      timeError: ''
    }));
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Check if task is past due
    if (isPastDue) {
      toast.error(t('cannotEditPastDueTask'));
      return;
    }

    // Check for team membership first
    if (task.task_id && !isTeamMember) {
      toast.error(t('noPermissionTeamTask'));
      return;
    }
    
    if (!title.trim()) {
      toast.error(t('titleRequired'));
      return;
    }
    
    // Validate form data
    if (!validateForm()) {
      return; // If validation fails, don't submit form
    }
    
    try {
      setLoading(true);
      
      // Create full datetime objects
      let startDateTime = null;
      let dueDateTime = null;
      
      if (startDate) {
        const [hours, minutes] = startTime.split(':').map(Number);
        startDateTime = new Date(
          startDate.getFullYear(),
          startDate.getMonth(),
          startDate.getDate(),
          hours,
          minutes
        );
      }
      
      if (dueDate) {
        const [hours, minutes] = dueTime.split(':').map(Number);
        dueDateTime = new Date(
          dueDate.getFullYear(),
          dueDate.getMonth(),
          dueDate.getDate(),
          hours,
          minutes
        );
      }
      
      // Use ISO format for timestamptz in PostgreSQL
      const startDateISO = startDateTime ? startDateTime.toISOString() : null;
      const dueDateISO = dueDateTime ? dueDateTime.toISOString() : null;
      
      // Prepare update data
      const updateData = {
        title,
        description,
        status,
        priority,
        updated_at: new Date().toISOString(),
        // Always include date fields, setting to null if cleared
        expected_completion_date: dueDateISO,
        expected_start_time: startDateISO
      };
      
      // The task should now have the correct ID format from the parent component
      const taskId = task.id;
      
      if (!taskId) {
        throw new Error(t('invalidTaskId'));
      }
      
      // Update the task with the correct ID
      const { error } = await supabase
        .from('mytasks')
        .update(updateData)
        .eq('id', taskId);
        
      if (error) throw error;
      
      toast.success(t('taskUpdated'));
      setIsOpen(false);
      if (onSuccess) onSuccess();
    } catch (error) {
      console.error('Error updating task:', error);
      toast.error(error.message || t('updateTaskFailed'));
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{t('editTask')}</DialogTitle>
          <DialogDescription>
            {t('editTaskDescription')}
          </DialogDescription>
        </DialogHeader>
        
        {/* Warning if task is past due */}
        {isPastDue && (
          <div className="bg-destructive/10 border border-destructive/30 text-destructive p-3 rounded-md mb-4 flex items-start gap-2">
            <ClockIcon className="h-5 w-5 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium">{t('cannotEditPastDueTask')}</p>
              <p className="text-xs mt-1">{t('pastDueTaskDesc')}</p>
            </div>
          </div>
        )}

        {/* Warning if user is not a team member */}
        {task && task.task_id && !isTeamMember && !isMembershipChecking && (
          <div className="bg-destructive/10 border border-destructive/30 text-destructive p-3 rounded-md mb-4 flex items-start gap-2">
            <ShieldAlert className="h-5 w-5 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium">{t('noPermissionTeamTask')}</p>
              <p className="text-xs mt-1">{t('noPermissionTeamTaskDesc')}</p>
            </div>
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          {/* Task title */}
          <div className="space-y-2">
            <label htmlFor="title" className="text-sm font-medium">
              {t('taskTitle')} <span className="text-destructive">*</span>
            </label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t('taskTitlePlaceholder')}
              required
              disabled={task?.task_id && !isTeamMember || isPastDue}
              maxLength={50}
            />
          </div>
          
          {/* Task description */}
          <div className="space-y-2">
            <label htmlFor="description" className="text-sm font-medium">
              {t('description')}
            </label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t('descriptionPlaceholder')}
              rows={3}
              disabled={task?.task_id && !isTeamMember || isPastDue}
              maxLength={100}
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            {/* Status */}
            <div className="space-y-2">
              <label htmlFor="status" className="text-sm font-medium">
                {t('status.label')}
              </label>
              <Select 
                value={status} 
                onValueChange={setStatus}
                disabled={task?.task_id && !isTeamMember}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('selectStatus')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TODO">{t('status.todo')}</SelectItem>
                  <SelectItem value="IN_PROGRESS">{t('status.in_progress')}</SelectItem>
                  <SelectItem value="IN_REVIEW">{t('status.in_review')}</SelectItem>
                  <SelectItem value="DONE">{t('status.done')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {/* Priority */}
            <div className="space-y-2">
              <label htmlFor="priority" className="text-sm font-medium">
                {t('priority')}
              </label>
              <Select 
                value={priority} 
                onValueChange={setPriority} 
                disabled={task?.task_id && !isTeamMember}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('selectPriority')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="LOW">{t('lowPriority')}</SelectItem>
                  <SelectItem value="MEDIUM">{t('mediumPriority')}</SelectItem>
                  <SelectItem value="HIGH">{t('highPriority')}</SelectItem>
                  <SelectItem value="URGENT">{t('urgentPriority')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          {/* Start date and time */}
          <div className="space-y-2">
            <label className="text-sm font-medium">
              {t('startDate')}
            </label>
            <div className="grid grid-cols-2 gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "justify-start text-left font-normal",
                      !startDate && "text-muted-foreground",
                      isDateInPast(startDate) && "text-destructive",
                      formErrors.dateError && "border-red-500"
                    )}
                    disabled={task?.task_id && !isTeamMember}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate ? format(startDate, 'PPP') : t('selectDate')}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={setStartDate}
                    initialFocus
                    disabled={disablePastDates}
                  />
                </PopoverContent>
              </Popover>
              
              <div className="flex items-center">
                <Clock className="mr-2 h-4 w-4 text-muted-foreground" />
                <Input 
                  type="time" 
                  name="startTime"
                  value={startTime}
                  onChange={handleTimeChange}
                  className={cn(formErrors.timeError && "border-red-500")}
                  disabled={task?.task_id && !isTeamMember}
                />
              </div>
            </div>
            {formErrors.dateError && (
              <p className="text-xs text-destructive">{formErrors.dateError}</p>
            )}
          </div>
          
          {/* Due date and time */}
          <div className="space-y-2">
            <label className="text-sm font-medium">
              {t('dueDate.label')}
            </label>
            <div className="grid grid-cols-2 gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "justify-start text-left font-normal",
                      !dueDate && "text-muted-foreground",
                      isDateInPast(dueDate) && "text-destructive"
                    )}
                    disabled={task?.task_id && !isTeamMember}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dueDate ? format(dueDate, 'PPP') : t('selectDate')}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={dueDate}
                    onSelect={setDueDate}
                    initialFocus
                    disabled={disablePastDates}
                  />
                </PopoverContent>
              </Popover>
              
              <div className="flex items-center">
                <Clock className="mr-2 h-4 w-4 text-muted-foreground" />
                <Input 
                  type="time" 
                  name="dueTime"
                  value={dueTime}
                  onChange={handleTimeChange}
                  className={cn(formErrors.timeError && "border-red-500")}
                  disabled={task?.task_id && !isTeamMember}
                />
              </div>
            </div>
            {formErrors.timeError && (
              <p className="text-xs text-destructive">{formErrors.timeError}</p>
            )}
          </div>
          
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
              {t_common('cancel')}
            </Button>
            <Button 
              type="submit" 
              disabled={loading || (task?.task_id && !isTeamMember) || isPastDue}
            >
              {loading ? t_common('saving') : t_common('save')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
} 