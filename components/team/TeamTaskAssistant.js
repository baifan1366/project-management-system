'use client';

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";
import { toast } from 'sonner';
import { Loader2, Sparkles } from "lucide-react";
import { useTranslations } from 'next-intl';
import { useGetUser } from '@/lib/hooks/useGetUser';
import { Badge } from "@/components/ui/badge";
import { useDispatch } from 'react-redux';
import { getSubscriptionLimit, trackSubscriptionUsage } from '@/lib/subscriptionService';
import { limitExceeded } from '@/lib/redux/features/subscriptionSlice';

export default function TeamTaskAssistant({ projectId, teamId, sectionId, onTasksCreated }) {
  const [instruction, setInstruction] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [userId, setUserId] = useState(null);
  const t = useTranslations();
  const { user } = useGetUser();
  const dispatch = useDispatch();

  // Predefined prompt templates
  const promptTemplates = [
    {
      id: 'taskWithAssignee',
      label: 'Task + Assignee',
      template: 'Create a task for [task description] and assign it to [team member email/name]'
    },
    {
      id: 'priorityTask',
      label: 'Priority Task',
      template: 'Create a high priority task for [task description] due by [date]'
    },
    {
      id: 'multipleSubtasks',
      label: 'Multiple Subtasks',
      template: 'Create multiple subtasks for [main task]: 1. [subtask1], 2. [subtask2], 3. [subtask3]'
    },
    {
      id: 'bugReport',
      label: 'Bug Report',
      template: 'Create a bug report task: [describe the bug], steps to reproduce: [steps], assigned to [team member email/name]'
    },
    {
      id: 'multiAssign',
      label: 'Multiple Assignees',
      template: 'Create a task for [task1] assigned to [name1] and a task for [task2] assigned to [name2]'
    },
    {
      id: 'teamAssign',
      label: 'Team Tasks',
      template: 'Create 3 tasks for our team: [task1], [task2], [task3] and assign them to the appropriate team members'
    }
  ];
  
  const applyTemplate = (template) => {
    setInstruction(template);
  };
  
  // 获取当前用户ID
  useEffect(() => {
    async function getUserId() {
      try {
        if (user) {
          setUserId(user.id);
        }
      } catch (error) {
        console.error('Failed to get user ID:', error);
      }
    }
    
    getUserId();
  }, [user]);
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const canExecute = await getSubscriptionLimit(userId, 'ai_task');
    if (!canExecute.allowed) {
      dispatch(limitExceeded({ feature: 'AI Task', reason: canExecute.reason }));
      setIsOpen(false);
      return;
    }

    if (!instruction.trim()) {
      toast.error(t('CreateTask.taskNameRequired'));
      return;
    }
    
    if (!projectId) {
      toast.error(t('errors.projectRequired') || "Project ID is required");
      return;
    }
    
    if (!userId) {
      toast.error(t('errors.userNotLoggedIn'));
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Prepare request body with all necessary data
      const requestBody = {
        instruction,
        projectId,
        userId
      };
      
      // Only add teamId and sectionId if they exist
      if (teamId) {
        requestBody.teamId = teamId;
      }
      
      if (sectionId) {
        requestBody.sectionId = sectionId;
      }
      
      const response = await fetch('/api/ai/task-manager-agent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || t('errors.general'));
      }
      
      const data = await response.json();
      
      if (data.success) {
        toast.success(t('CreateTask.tasksAddedSuccess') || "Tasks added successfully");
        setIsOpen(false);
        setInstruction('');
        trackSubscriptionUsage({ userId, actionType: 'ai_task' });
        
        // 回调函数通知父组件刷新任务列表
        if (typeof onTasksCreated === 'function') {
          onTasksCreated(data.tasks);
        }
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error(error.message || t('errors.general'));
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2" disabled={!userId}>
          <Sparkles className="h-4 w-4" />
          <span>{t('nav.taskAssistant')}</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{t('nav.taskAssistant')}</DialogTitle>
          <DialogDescription>
            {t('CreateTask.description')}
            Add new tasks to this existing project using AI assistance.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="mb-3">
            <p className="text-sm font-medium mb-2">Quick templates:</p>
            <div className="flex flex-wrap gap-2">
              {promptTemplates.map((template) => (
                <Badge 
                  key={template.id}
                  variant="outline" 
                  className="cursor-pointer hover:bg-primary/10"
                  onClick={() => applyTemplate(template.template)}
                >
                  {template.label}
                </Badge>
              ))}
            </div>
          </div>
          
          <Textarea
            placeholder={t('Chat.inputPlaceholder') || "Describe the tasks you want to add to this project..."}
            value={instruction}
            onChange={(e) => setInstruction(e.target.value)}
            className="min-h-[120px]"
          />
          
          <div className="text-xs text-muted-foreground">
            <p className="font-medium mb-1">Tip: Try these formats</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Create a task for UI redesign and assign it to alex@example.com</li>
              <li>Create a high priority task for security update due by next Friday</li>
              <li>Create three tasks: database optimization, API testing, and frontend fixes assigned to Sarah</li>
            </ul>
          </div>
          
          <DialogFooter>
            <Button 
              type="submit" 
              disabled={isLoading || !instruction.trim() || !userId}
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isLoading ? t('CreateTask.creating') : t('CreateTask.createForProject') || "Add Tasks"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
} 