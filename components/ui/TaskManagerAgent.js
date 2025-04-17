'use client';

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from 'sonner';
import { Loader2, MessageSquare, CheckCircle2 } from "lucide-react";
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import Image from 'next/image';

export default function TaskManagerAgent({ userId, projectId }) {
  const [instruction, setInstruction] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState(null);
  const router = useRouter();
  const t = useTranslations();
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!instruction.trim()) {
      toast.error(t('CreateTask.taskNameRequired'));
      return;
    }
    
    if (!userId) {
      toast.error(t('errors.userNotLoggedIn'));
      return;
    }
    
    setIsLoading(true);
    setResults(null);
    
    try {
      const response = await fetch('/api/ai/task-manager-agent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          instruction,
          userId,
          projectId // 传递项目ID到API
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        console.error("API错误响应:", data);
        let errorMessage = data.error || t('errors.general');
        
        // 处理特定错误消息
        if (data.message && data.message.includes('Failed to get team')) {
          errorMessage = t('errors.teamNotFound');
        } else if (data.message && data.message.includes('Project has no associated teams')) {
          errorMessage = t('errors.noTeamsInProject');
        }
        
        throw new Error(errorMessage);
      }
      
      setResults(data);
      
      if (data.success) {
        toast.success(t('CreateTask.createSuccess'));
        // 如果在现有项目中添加任务，不需要重定向
        if (data.projectId && !projectId) {
          setTimeout(() => {
            router.push(`/projects/${data.projectId}`);
          }, 1500);
        } else if (projectId) {
          // 如果添加到现有项目，刷新页面以显示新任务
          setTimeout(() => {
            router.refresh();
          }, 1500);
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
    <Card className="w-full shadow-md overflow-hidden">
      <CardHeader className="border-b bg-muted/20">
        <div className="flex items-center space-x-3">
          <div className="hidden sm:block">
            <Image 
              src="/pengy assistant.png" 
              alt="Pengy" 
              width={40} 
              height={40} 
              className="rounded-full"
            />
          </div>
          <div>
            <CardTitle>
              {projectId ? t('pengy.titleForProject') : t('pengy.title')}
            </CardTitle>
            <CardDescription>
              {projectId ? t('pengy.greetingForProject') : t('pengy.greeting')}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-6 max-h-[calc(100vh-220px)] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <div className="grid w-full gap-4">
            <div className="relative">
              <Textarea
                placeholder={projectId ? t('pengy.promptForProject') : t('pengy.prompt')}
                value={instruction}
                onChange={(e) => setInstruction(e.target.value)}
                className="min-h-[120px] pr-10"
              />
              <MessageSquare className="absolute right-3 bottom-3 h-5 w-5 text-muted-foreground" />
            </div>
            <Button 
              type="submit" 
              disabled={isLoading || !instruction.trim() || !userId}
              className="w-full"
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isLoading ? t('pengy.thinking') : t('common.create')}
            </Button>
          </div>
        </form>
        
        {results && results.success && (
          <div className="mt-6 space-y-4">
            <div className="rounded-md bg-green-50 p-4">
              <div className="flex items-center">
                <CheckCircle2 className="h-5 w-5 text-green-500 mr-2" />
                <p className="text-green-700">{t('pengy.success')}</p>
              </div>
            </div>
            
            {results.projectId && !projectId && (
              <div className="space-y-2">
                <h3 className="font-medium">{t('Projects.projectID')}:</h3>
                <p className="text-sm text-gray-500">{results.projectId}</p>
              </div>
            )}
            
            {results.tasks && results.tasks.length > 0 && (
              <div className="space-y-2">
                <h3 className="font-medium">{t('tasks.title')}:</h3>
                <ul className="space-y-1 text-sm text-gray-500">
                  {results.tasks.map((task, index) => (
                    <li key={index} className="flex items-start">
                      <span className="inline-block h-1.5 w-1.5 rounded-full bg-gray-400 mt-1.5 mr-2"></span>
                      <span>
                        {task.tag_values.title || t('CreateTask.untitled')} 
                        {task.tag_values.priority && (
                          <span className="ml-1 text-xs px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-700">
                            {task.tag_values.priority}
                          </span>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
        
        <div className="mt-8 rounded-md bg-muted/30 p-4 text-sm border">
          <h4 className="font-medium mb-2">
            {projectId ? t('pengy.tipsForProject') : t('pengy.tips')}
          </h4>
          <p className="text-muted-foreground">
            {projectId ? t('pengy.tipDetailsForProject') : t('pengy.tipDetails')}
          </p>
        </div>
      </CardContent>
    </Card>
  );
} 