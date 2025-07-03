'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Calendar as CalendarIcon, Clock } from 'lucide-react';
import { format, isBefore, startOfToday, isSameDay, addMinutes, addHours } from 'date-fns';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { useUserTimezone } from '@/hooks/useUserTimezone';
import { toast } from 'sonner';

export default function NewTaskDialog({ open, onOpenChange, onTaskCreated, userId }) {
  const t_tasks = useTranslations('myTasks');
  const t_common = useTranslations('common');
  const { formatDateToUserTimezone, adjustTimeByOffset } = useUserTimezone();
  
  // Helper function to convert local date to UTC for storing in database
  const convertToUTC = (date) => {
    if (!date) return null;
    
    try {
      // Create a new Date that represents the same date-time in UTC
      const year = date.getFullYear();
      const month = date.getMonth();
      const day = date.getDate();
      const hours = date.getHours();
      const minutes = date.getMinutes();
      
      // Create date in UTC by using the Date.UTC static method
      return new Date(Date.UTC(year, month, day, hours, minutes));
    } catch (error) {
      console.error('Error converting to UTC:', error);
      return date;
    }
  };
  
  // Helper function to format time as HH:MM
  const formatTimeString = (date) => {
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  };
  
  // Set default dates and times
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('TODO');
  const [dueDate, setDueDate] = useState(new Date());
  const [startDate, setStartDate] = useState(new Date());
  const [startTime, setStartTime] = useState(() => {
    const now = new Date();
    const fiveMinutesLater = addMinutes(now, 5);
    return formatTimeString(fiveMinutesLater);
  });
  const [dueTime, setDueTime] = useState(() => {
    const now = new Date();
    const threeHoursLater = addHours(now, 3);
    return formatTimeString(threeHoursLater);
  });
  const [priority, setPriority] = useState('MEDIUM');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState({
    dateError: '',
    timeError: ''
  });

  // Update due date and time when start date or time changes
  useEffect(() => {
    if (startDate) {
      // Set due date to the same day as start date
      setDueDate(new Date(startDate));
      
      // Parse start time
      const [startHours, startMinutes] = startTime.split(':').map(Number);
      
      // Create a complete date object with start date and time
      const startDateTime = new Date(
        startDate.getFullYear(),
        startDate.getMonth(),
        startDate.getDate(),
        startHours,
        startMinutes
      );
      
      // Add 1 hour to get the due time
      const newDueDateTime = addHours(startDateTime, 1);
      
      // Set the new due time
      setDueTime(formatTimeString(newDueDateTime));
    }
  }, [startDate, startTime]);

  // Function to disable past dates in calendar
  const disablePastDates = (date) => {
    return isBefore(date, startOfToday());
  };

  // Validate form data
  const validateForm = () => {
    const errors = {
      dateError: '',
      timeError: ''
    };
    
    // Check for past dates
    if (startDate && isBefore(startDate, startOfToday()) && !isSameDay(startDate, new Date())) {
      errors.dateError = t_tasks('cannotSelectPastDate') || 'Cannot select a date in the past';
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
      
      // Check if start time is in the past for today, accounting for timezone
      const now = new Date();
      
      // Convert both dates to the same timezone reference for comparison
      if (isSameDay(startDate, now)) {
        // Get current time in UTC
        const nowUTC = new Date(now.toISOString());
        // Create UTC version of the selected time
        const startDateTimeUTC = new Date(startDateTime.toISOString());
        
 
        
        if (startDateTimeUTC < nowUTC) {
          // Use a direct string instead of translation key
          errors.timeError = 'Cannot select a time in the past';
          setFormErrors(errors);
          return false;
        }
      }
      
      // Check if end is before start
      if (endDateTime < startDateTime) {
        // Use a direct string instead of translation key
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
    
    if (!title.trim()) {
      toast.error(t_tasks('titleRequired'));
      return; // Don't submit if title is empty
    }
    
    // Validate form data
    if (!validateForm()) {
      return; // If validation fails, don't submit form
    }
    
    try {
      setIsSubmitting(true);
      
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
        // Explicitly tell the date object this is in local time zone
        startDateTime = convertToUTC(startDateTime);
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
        // Explicitly tell the date object this is in local time zone
        dueDateTime = convertToUTC(dueDateTime);
      }
      
      // Use the UTC date objects directly
      const startDateISO = startDateTime ? startDateTime.toISOString() : null;
      const dueDateISO = dueDateTime ? dueDateTime.toISOString() : null;
      
      // Create new task in the mytasks table - directly store dates as ISO strings
      const { data, error } = await supabase
        .from('mytasks')
        .insert({
          user_id: userId,
          title,
          description,
          status,
          priority,
          expected_completion_date: dueDateISO,
          expected_start_time: startDateISO
        })
        .select();
      
      if (error) throw error;
      
      // Reset form
      setTitle('');
      setDescription('');
      setStatus('TODO');
      setPriority('MEDIUM');
      setDueDate(new Date());
      setStartDate(new Date());
      setStartTime(() => {
        const now = new Date();
        const fiveMinutesLater = addMinutes(now, 5);
        return formatTimeString(fiveMinutesLater);
      });
      setDueTime(() => {
        const now = new Date();
        const threeHoursLater = addHours(now, 3);
        return formatTimeString(threeHoursLater);
      });
      setFormErrors({
        dateError: '',
        timeError: ''
      });
      
      // Close dialog and refresh task list
      toast.success(t_tasks('taskCreated'));
      onOpenChange(false);
      if (onTaskCreated) onTaskCreated();
      
    } catch (err) {
      console.error('Error creating task:', err);
      toast.error(err.message || t_tasks('createTaskFailed'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{t_tasks('newTask.title')}</DialogTitle>
            <DialogDescription>
              {t_tasks('newTask.description')}
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <label htmlFor="title" className="text-sm font-medium">
                {t_tasks('newTask.taskTitle')} <span className="text-destructive">*</span>
              </label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={t_tasks('newTask.titlePlaceholder')}
                required
                maxLength={50}
              />
            </div>
            
            <div className="grid gap-2">
              <label htmlFor="description" className="text-sm font-medium">
                {t_tasks('newTask.taskDescription')}
              </label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t_tasks('newTask.descriptionPlaceholder')}
                rows={3}
                maxLength={100}
              />
            </div>
            
            <div className="grid gap-2">
              <label htmlFor="status" className="text-sm font-medium">
                {t_tasks('newTask.status')}
              </label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger>
                  <SelectValue placeholder={t_tasks('newTask.selectStatus')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TODO">{t_tasks('status.todo')}</SelectItem>
                  <SelectItem value="IN_PROGRESS">{t_tasks('status.in_progress')}</SelectItem>
                  <SelectItem value="IN_REVIEW">{t_tasks('status.in_review')}</SelectItem>
                  <SelectItem value="DONE">{t_tasks('status.done')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid gap-2">
              <label htmlFor="priority" className="text-sm font-medium">
                {t_tasks('newTask.priority')}
              </label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger>
                  <SelectValue placeholder={t_tasks('newTask.selectPriority')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="LOW">{t_tasks('lowPriority')}</SelectItem>
                  <SelectItem value="MEDIUM">{t_tasks('mediumPriority')}</SelectItem>
                  <SelectItem value="HIGH">{t_tasks('highPriority')}</SelectItem>
                  <SelectItem value="URGENT">{t_tasks('urgentPriority')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {/* Start date and time */}
            <div className="grid gap-2">
              <label className="text-sm font-medium">
                {t_tasks('startDate')}
              </label>
              <div className="grid grid-cols-2 gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "justify-start text-left font-normal",
                        !startDate && "text-muted-foreground",
                        formErrors.dateError && "border-red-500"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {startDate ? format(startDate, "PPP") : t_tasks('selectDate')}
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
                  />
                </div>
              </div>
              {formErrors.dateError && (
                <p className="text-xs text-destructive">{formErrors.dateError}</p>
              )}
            </div>
            
            {/* Due date and time */}
            <div className="grid gap-2">
              <label className="text-sm font-medium">
                {t_tasks('newTask.dueDate')}
              </label>
              <div className="grid grid-cols-2 gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "justify-start text-left font-normal",
                        !dueDate && "text-muted-foreground",
                        formErrors.timeError && "border-red-500"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dueDate ? format(dueDate, "PPP") : t_tasks('newTask.selectDate')}
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
                  />
                </div>
              </div>
              {formErrors.timeError && (
                <p className="text-xs text-destructive">{formErrors.timeError}</p>
              )}
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              {t_common('cancel')}
            </Button>
            <Button type="submit" disabled={isSubmitting || !title.trim()}>
              {isSubmitting ? t_common('creating') : t_common('create')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
} 