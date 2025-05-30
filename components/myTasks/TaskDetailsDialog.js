'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { format, parseISO } from 'date-fns';
import { Calendar as CalendarIcon, Trash2, Edit, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { Badge } from "@/components/ui/badge";
import { useUserTimezone } from '@/hooks/useUserTimezone';

export default function TaskDetailsDialog({ isOpen, setIsOpen, task, onEdit, onDelete, onSuccess }) {
  const t = useTranslations('myTasks');
  const t_common = useTranslations('common');
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const { formatDateToUserTimezone } = useUserTimezone();
  
  if (!task) return null;

  // Get task priority with styling
  const getPriorityVariant = (priority) => {
    switch (priority) {
      case 'URGENT':
        return 'destructive';
      case 'HIGH':
        return 'yellow';
      case 'MEDIUM':
        return 'warning';
      default:
        return 'secondary';
    }
  };

  // Format due date
  const formatDueDate = () => {
    try {
      const dueDate = task.expected_completion_date;
      console.log("Due date raw value:", dueDate);
      
      if (!dueDate) {
        return t('noDueDate');
      }
      
      // 尝试格式化日期，添加错误处理
      const formattedDate = formatDateToUserTimezone(dueDate);
      console.log("Formatted due date:", formattedDate);
      return formattedDate || t('noDueDate');
    } catch (error) {
      console.error('Error formatting due date:', error);
      return t('invalidDate');
    }
  };

  // Format start date
  const formatStartDate = () => {
    try {
      const startDate = task.expected_start_time;
      console.log("Start date raw value:", startDate);
      
      if (!startDate) {
        return t('noStartDate');
      }
      
      // 尝试格式化日期，添加错误处理
      const formattedDate = formatDateToUserTimezone(startDate);
      console.log("Formatted start date:", formattedDate);
      return formattedDate || t('noStartDate');
    } catch (error) {
      console.error('Error formatting start date:', error);
      return t('invalidDate');
    }
  };

  // Get status badge variant
  const getStatusVariant = (status) => {
    switch (status) {
      case 'TODO':
        return 'outline';
      case 'IN_PROGRESS':
        return 'default';
      case 'IN_REVIEW':
        return 'warning';
      case 'DONE':
        return 'success';
      default:
        return 'outline';
    }
  };

  // Show delete confirmation
  const showDeleteConfirmation = () => {
    setConfirmDeleteOpen(true);
  };

  // Handle delete task
  const handleDeleteTask = async () => {
    try {
      setIsDeleting(true);
      setConfirmDeleteOpen(false);
      
      // The task ID should now be properly formatted from the parent component
      const taskId = task.id;
      
      if (!taskId) {
        throw new Error('Invalid task ID');
      }
      
      console.log("Deleting task with ID:", taskId);
      
      const { error } = await supabase
        .from('mytasks')
        .delete()
        .eq('id', taskId);
        
      if (error) throw error;
      
      toast.success(t('taskDeleted'));
      setIsOpen(false);
      if (onSuccess) onSuccess();
    } catch (error) {
      console.error('Error deleting task:', error);
      toast.error(error.message || t('deleteTaskFailed'));
    } finally {
      setIsDeleting(false);
    }
  };

  // Handle edit task
  const handleEditTask = () => {
    setIsOpen(false);
    if (onEdit) onEdit(task);
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl">{task.title || t('noTitle')}</DialogTitle>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant={getStatusVariant(task.status)}>
                {task.status}
              </Badge>
              {task.priority && (
                <Badge 
                  variant={getPriorityVariant(task.priority)}
                  className={getPriorityVariant(task.priority) === 'yellow' ? 'bg-yellow-500 hover:bg-yellow-600' : ''}
                >
                  {task.priority.toLowerCase()}
                </Badge>
              )}
            </div>
          </DialogHeader>
          
          <div className="py-4 space-y-4">
            {/* Start date */}
            <div className="flex items-start gap-3">
              <CalendarIcon className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-medium text-sm">{t('startDate')}</h4>
                <p className="text-sm mt-1">{formatStartDate()}</p>
              </div>
            </div>
            
            {/* Due date */}
            <div className="flex items-start gap-3">
              <CalendarIcon className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-medium text-sm">{t('dueDate.label')}</h4>
                <p className="text-sm mt-1">{formatDueDate()}</p>
              </div>
            </div>
            
            {/* Description if available */}
            {task.description && (
              <div className="flex items-start gap-3">
                <div className="h-5 w-5 flex-shrink-0" /> {/* Spacer to align with icons */}
                <div>
                  <h4 className="font-medium text-sm">{t('description')}</h4>
                  <p className="text-sm mt-1 whitespace-pre-wrap">{task.description}</p>
                </div>
              </div>
            )}

            {/* Status info */}
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-medium text-sm">{t('status.label')}</h4>
                <p className="text-sm mt-1">{task.status}</p>
              </div>
            </div>
          </div>
          
          <DialogFooter className="flex gap-2">
            {/* Delete button */}
            <Button 
              variant="destructive" 
              size="sm"
              onClick={showDeleteConfirmation}
              disabled={isDeleting}
              className="gap-1"
            >
              <Trash2 className="h-4 w-4" />
              {isDeleting ? t_common('deleting') : t_common('delete')}
            </Button>
            
            {/* Edit button */}
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleEditTask}
              className="gap-1"
            >
              <Edit className="h-4 w-4" />
              {t_common('edit')}
            </Button>
            
            {/* Close button */}
            <Button 
              variant="secondary" 
              onClick={() => setIsOpen(false)}
            >
              {t_common('close')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('deleteConfirmationTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              <div className="flex flex-col gap-4">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0" />
                  <p>{t('deleteConfirmationMessage')}</p>
                </div>
                <div className="bg-muted/50 p-3 rounded-md">
                  <p className="font-medium">{task.title || t('noTitle')}</p>
                  <p className="text-sm text-muted-foreground mt-1">{formatDueDate()}</p>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t_common('cancel')}</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteTask} 
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t_common('confirmDelete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
} 