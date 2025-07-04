'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { isBefore, endOfDay } from 'date-fns';
import { CalendarIcon, Trash2, Edit, AlertTriangle, CheckCircle2, InfoIcon, ClockIcon } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import useTeamMembership from '@/hooks/useTeamMembership';
import useGetUser from '@/lib/hooks/useGetUser';
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

export default function TaskDetailsDialog({ isOpen, setIsOpen, task, onEdit, onDelete, onSuccess }) {
  const t = useTranslations('myTasks');
  const t_common = useTranslations('common');
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const { user } = useGetUser();
  const { isMember: isTeamMember, checkTaskTeamMembership } = useTeamMembership();
  const [assignedUsers, setAssignedUsers] = useState([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  
  // Simple date formatting function
  const formatDate = (dateString) => {
    if (!dateString) return '';
    
    try {
      const date = new Date(dateString);
      return date.toLocaleString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      console.error('Date formatting error:', error);
      return dateString;
    }
  };
  
  // Check if task has a reference (is linked to a team task)
  const hasReference = task ? !!task.task_id : false;
  
  // Check if task is past due
  const isPastDue = task && task.expected_completion_date ? 
    isBefore(new Date(task.expected_completion_date), new Date()) : 
    false;
    
  // Check team membership when task changes
  useEffect(() => {
    if (task && task.task_id && user) {
      checkTaskTeamMembership(user.id, task.task_id);
    }
  }, [task, user, checkTaskTeamMembership]);
  
  // Parse and fetch user data from the description if it contains UUIDs
  useEffect(() => {
    const fetchAssignedUsers = async () => {
      if (!task || !task.description) return;
      
      setIsLoadingUsers(true);
      
      try {
        // Check if description is a string before using match
        const description = task.description ? String(task.description) : '';
        
        // This regex pattern looks for UUIDs in the description
        const uuidPattern = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;
        const matches = description.match(uuidPattern);
        
        if (matches && matches.length > 0) {
          // Remove duplicates
          const userIds = [...new Set(matches)];
          
          if (userIds.length > 0) {
            try {
              // Fetch user data from the users table
              const { data, error } = await supabase
                .from('user')
                .select('id, name, avatar_url')
                .in('id', userIds);
                
              if (error) {
                console.error('Supabase error:', error);
                return; // Early return on error
              }
              
              setAssignedUsers(data || []);
            } catch (queryError) {
              console.error('Supabase query error:', queryError);
              // Don't throw, just log the error and continue
            }
          }
        }
      } catch (error) {
        console.error('Error in fetchAssignedUsers:', error);
        // Don't rethrow, just log the error
      } finally {
        setIsLoadingUsers(false);
      }
    };
    
    fetchAssignedUsers();
  }, [task]);
  
  // Format the description to replace UUIDs with user info
  const formatDescription = () => {
    if (!task) return '';
    
    // Ensure description is a string
    const description = task.description ? String(task.description) : '';
    
    // If we haven't loaded users yet, return the original description
    if (isLoadingUsers || assignedUsers.length === 0) {
      return description;
    }
    
    let formattedDesc = description;
    
    // Replace each user ID with a placeholder that we'll use for rendering
    assignedUsers.forEach(user => {
      const userIdRegex = new RegExp(user.id, 'gi');
      formattedDesc = formattedDesc.replace(userIdRegex, `@[USER:${user.id}]`);
    });
    
    return formattedDesc;
  };
  
  // Render the description with user avatars and names
  const renderFormattedDescription = () => {
    if (!task) return null;
    
    // Ensure description is a string
    const hasDescription = task.description && String(task.description).trim() !== '';
    
    if (!hasDescription) {
      return <p className="text-sm mt-1 text-muted-foreground">{safeTranslation('noDescription', 'No description')}</p>;
    }
    
    const formattedDesc = formatDescription();
    
    // If no users are found or still loading, just return the text
    if (isLoadingUsers || assignedUsers.length === 0) {
      return <p className="text-sm mt-1 whitespace-pre-wrap">{formattedDesc}</p>;
    }
    
    // Split the description by user placeholders and render each part
    const parts = formattedDesc.split(/(@\[USER:[0-9a-f-]+\])/g);
    
    return (
      <p className="text-sm mt-1 whitespace-pre-wrap">
        {parts.map((part, index) => {
          // Check if this part is a user reference
          const userMatch = part.match(/@\[USER:([0-9a-f-]+)\]/);
          
          if (userMatch) {
            const userId = userMatch[1];
            const userData = assignedUsers.find(u => u.id === userId);
            
            if (userData) {
              return (
                <span key={index} className="inline-flex items-center gap-1 bg-muted rounded-md px-2 py-0.5 text-xs mr-1">
                  <Avatar className="h-4 w-4">
                    <AvatarImage src={userData.avatar_url} alt={userData.name} />
                    <AvatarFallback>
                      {userData.name?.charAt(0).toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>
                  {userData.name || safeTranslation('unknownUser', 'Unknown user')}
                </span>
              );
            }
            
            return part; // Return original if user not found
          }
          
          return part; // Return regular text parts as is
        })}
      </p>
    );
  };
  
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

  // Get a translation with fallback
  const safeTranslation = (key, fallback) => {
    try {
      return t(key);
    } catch (error) {
      return fallback || key;
    }
  };

  // Format due date
  const formatDueDate = () => {
    try {
      if (!task) return safeTranslation('noTask', 'No task');
      
      const dueDate = task.expected_completion_date;
      
      if (!dueDate) {
        return safeTranslation('noDueDate', 'No due date');
      }
      
      return formatDate(dueDate) || safeTranslation('noDueDate', 'No due date');
    } catch (error) {
      console.error('Error formatting due date:', error);
      return safeTranslation('invalidDate', 'Invalid date');
    }
  };

  // Format start date
  const formatStartDate = () => {
    try {
      if (!task) return t('noTask');
      
      const startDate = task.expected_start_time;
      
      if (!startDate) {
        return t('noStartDate');
      }
      
      return formatDate(startDate) || t('noStartDate');
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
    // 首先检查任务是否存在
    if (!task) {
      toast.error(t('taskNotFound'));
      return;
    }
    
    // Don't allow deletion if task has a reference
    if (hasReference) {
      toast.error(t('cannotDeleteReferencedTask'));
      return;
    }
    
    // Don't allow deletion if task is past due
    if (isPastDue) {
      toast.error(t('cannotDeletePastDueTask'));
      return;
    }
    
    setConfirmDeleteOpen(true);
  };

  // Handle delete task
  const handleDeleteTask = async () => {
    try {
      // 首先检查任务是否存在
      if (!task) {
        toast.error(t('taskNotFound'));
        setConfirmDeleteOpen(false);
        return;
      }
      
      // Additional check to prevent deletion of referenced tasks
      if (hasReference) {
        toast.error(t('cannotDeleteReferencedTask'));
        setConfirmDeleteOpen(false);
        return;
      }
      
      // Additional check to prevent deletion of past due tasks
      if (isPastDue) {
        toast.error(t('cannotDeletePastDueTask'));
        setConfirmDeleteOpen(false);
        return;
      }
      
      setIsDeleting(true);
      setConfirmDeleteOpen(false);
      
      // The task ID should now be properly formatted from the parent component
      const taskId = task.id;
      
      if (!taskId) {
        throw new Error('Invalid task ID');
      }
      
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
    // 首先检查任务是否存在
    if (!task) {
      toast.error(t('taskNotFound'));
      return;
    }
    
    // Don't allow editing past due tasks
    if (isPastDue) {
      toast.error(t('cannotEditPastDueTask'));
      return;
    }
    
    setIsOpen(false);
    if (onEdit) onEdit(task);
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto overflow-x-hidden">
          {!task ? (
            <div className="py-4 text-center">
              {t('taskNotFound')}
            </div>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle className="text-xl break-all hyphens-auto">{task.title || t('noTitle')}</DialogTitle>
                <div className="flex items-center gap-2 mt-2 flex-wrap">
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
                  {/* Show reference badge if it exists */}
                  {hasReference && (
                    <Badge variant="outline" className="gap-1">
                      <InfoIcon className="h-3 w-3" /> 
                      {t('reference')}: <span className="break-all max-w-[100px] inline-block align-bottom">{task.task_id}</span>
                    </Badge>
                  )}
                  {/* Show past due badge if applicable */}
                  {isPastDue && (
                    <Badge variant="destructive" className="gap-1">
                      <ClockIcon className="h-3 w-3" /> 
                      {t('pastDue')}
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
                  <CalendarIcon className={`h-5 w-5 ${isPastDue ? 'text-destructive' : 'text-muted-foreground'} flex-shrink-0 mt-0.5`} />
                  <div>
                    <h4 className="font-medium text-sm">{t('dueDate.label')}</h4>
                    <p className={`text-sm mt-1 ${isPastDue ? 'text-destructive' : ''}`}>{formatDueDate()}</p>
                  </div>
                </div>
                
                {/* Description if available */}
                <div className="flex items-start gap-3">
                  <div className="h-5 w-5 flex-shrink-0" /> {/* Spacer to align with icons */}
                  <div>
                    <h4 className="font-medium text-sm">{t('description')}</h4>
                    {isLoadingUsers ? (
                                          <p className="text-sm mt-1 text-muted-foreground">{safeTranslation('loadingAssignedUsers', 'Loading users...')}</p>
                  ) : (
                      <div className="break-all hyphens-auto">
                        {renderFormattedDescription()}
                      </div>
                    )}
                  </div>
                </div>

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
                {/* Delete button with tooltip if disabled */}
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span>
                        <Button 
                          variant="destructive" 
                          size="sm"
                          onClick={showDeleteConfirmation}
                          disabled={isDeleting || hasReference || isPastDue}
                          className="gap-1"
                        >
                          <Trash2 className="h-4 w-4" />
                          {isDeleting ? t_common('deleting') : t_common('delete')}
                        </Button>
                      </span>
                    </TooltipTrigger>
                    {hasReference && (
                      <TooltipContent>
                        <p>{t('cannotDeleteReferencedTask')}</p>
                      </TooltipContent>
                    )}
                    {!hasReference && isPastDue && (
                      <TooltipContent>
                        <p>{t('cannotDeletePastDueTask')}</p>
                      </TooltipContent>
                    )}
                  </Tooltip>
                </TooltipProvider>
                
                {/* Edit button with tooltip if past due */}
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={handleEditTask}
                          disabled={isPastDue}
                          className="gap-1"
                        >
                          <Edit className="h-4 w-4" />
                          {t_common('edit')}
                        </Button>
                      </span>
                    </TooltipTrigger>
                    {isPastDue && (
                      <TooltipContent>
                        <p>{t('cannotEditPastDueTask')}</p>
                      </TooltipContent>
                    )}
                  </Tooltip>
                </TooltipProvider>
                
                {/* Close button */}
                <Button 
                  variant="secondary" 
                  onClick={() => setIsOpen(false)}
                >
                  {t_common('close')}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
        <AlertDialogContent>
          {task && (
            <>
              <AlertDialogHeader>
                <AlertDialogTitle>{t('deleteConfirmationTitle')}</AlertDialogTitle>
                <AlertDialogDescription>
                  <div className="flex flex-col gap-4">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0" />
                      <p>{t('deleteConfirmationMessage')}</p>
                    </div>
                                                      <div className="bg-muted/50 p-3 rounded-md">
                                    <p className="font-medium break-all hyphens-auto">{task.title || t('noTitle')}</p>
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
            </>
          )}
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
} 