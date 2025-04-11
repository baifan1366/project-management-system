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
import { supabase } from '@/lib/supabase';

export default function TeamTaskAssistant({ projectId, teamId, sectionId, onTasksCreated }) {
  const [instruction, setInstruction] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [userId, setUserId] = useState(null);
  const t = useTranslations();
  
  // 获取当前用户ID
  useEffect(() => {
    async function getUserId() {
      try {
        const { data, error } = await supabase.auth.getUser();
        if (error) {
          console.error('Error getting user:', error);
          return;
        }
        if (data?.user) {
          setUserId(data.user.id);
        }
      } catch (error) {
        console.error('Failed to get user ID:', error);
      }
    }
    
    getUserId();
  }, []);
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!instruction.trim()) {
      toast.error(t('CreateTask.taskNameRequired'));
      return;
    }
    
    if (!projectId) {
      toast.error(t('errors.general'));
      return;
    }
    
    if (!userId) {
      toast.error(t('errors.userNotLoggedIn'));
      return;
    }
    
    setIsLoading(true);
    
    try {
      const response = await fetch('/api/ai/task-manager-agent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          instruction,
          projectId, // 提供现有项目ID
          userId // 传递用户ID
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || t('errors.general'));
      }
      
      const data = await response.json();
      
      if (data.success) {
        toast.success(t('CreateTask.createSuccess'));
        setIsOpen(false);
        setInstruction('');
        
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
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <Textarea
            placeholder={t('Chat.inputPlaceholder')}
            value={instruction}
            onChange={(e) => setInstruction(e.target.value)}
            className="min-h-[120px]"
          />
          
          <DialogFooter>
            <Button 
              type="submit" 
              disabled={isLoading || !instruction.trim() || !userId}
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isLoading ? t('CreateTask.creating') : t('CreateTask.create')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
} 