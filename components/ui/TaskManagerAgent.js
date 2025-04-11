'use client';

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from 'sonner';
import { Loader2 } from "lucide-react";
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';

export default function TaskManagerAgent({ userId }) {
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
          userId // 传递用户ID到API
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || t('errors.general'));
      }
      
      const data = await response.json();
      setResults(data);
      
      if (data.success) {
        toast.success(t('CreateTask.createSuccess'));
        // 如果创建了项目，可以重定向到项目页面
        if (data.projectId) {
          setTimeout(() => {
            router.push(`/projects/${data.projectId}`);
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
    <Card className="w-full">
      <CardHeader>
        <CardTitle>{t('nav.taskAssistant')}</CardTitle>
        <CardDescription>
          {t('search.message')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit}>
          <div className="grid w-full gap-4">
            <Textarea
              placeholder={t('Chat.inputPlaceholder')}
              value={instruction}
              onChange={(e) => setInstruction(e.target.value)}
              className="min-h-[120px]"
            />
            <Button 
              type="submit" 
              disabled={isLoading || !instruction.trim() || !userId}
              className="w-full"
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isLoading ? t('CreateTask.creating') : t('common.create')}
            </Button>
          </div>
        </form>
        
        {results && results.success && (
          <div className="mt-6 space-y-4">
            <div className="rounded-md bg-green-50 p-4">
              <p className="text-green-700">{t('CreateTask.createSuccess')}</p>
            </div>
            
            {results.projectId && (
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
                    <li key={index}>
                      {task.tag_values.title || t('CreateTask.untitled')} 
                      {task.tag_values.priority && ` (${t('Projects.priority')}: ${task.tag_values.priority})`}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
} 