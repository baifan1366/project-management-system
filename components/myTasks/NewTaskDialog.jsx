'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Calendar as CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';

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

export default function NewTaskDialog({ open, onOpenChange, onTaskCreated, userId }) {
  const t_tasks = useTranslations('myTasks');
  const t_common = useTranslations('common');
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('TODO');
  const [date, setDate] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!title.trim()) {
      return; // Don't submit if title is empty
    }
    
    try {
      setIsSubmitting(true);
      
      // Create new task in the mytasks table
      const { data, error } = await supabase
        .from('mytasks')
        .insert({
          user_id: userId,
          title,
          description,
          status,
          expected_completion_date: date,
        })
        .select();
      
      if (error) throw error;
      
      // Reset form
      setTitle('');
      setDescription('');
      setStatus('TODO');
      setDate(null);
      
      // Close dialog and refresh task list
      onOpenChange(false);
      if (onTaskCreated) onTaskCreated();
      
    } catch (err) {
      console.error('Error creating task:', err);
      // Handle error (could add toast notification here)
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
                {t_tasks('newTask.taskTitle')}
              </label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={t_tasks('newTask.titlePlaceholder')}
                required
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
              <label htmlFor="date" className="text-sm font-medium">
                {t_tasks('newTask.dueDate')}
              </label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "justify-start text-left font-normal",
                      !date && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date ? format(date, "PPP") : t_tasks('newTask.selectDate')}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={setDate}
                    initialFocus
                    disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                  />
                </PopoverContent>
              </Popover>
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