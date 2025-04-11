'use client';

import { useState, useEffect } from 'react';
import TaskManagerAgent from '@/components/ui/TaskManagerAgent';
import { useTranslations } from 'next-intl';
import { supabase } from '@/lib/supabase';
import { Loader2 } from 'lucide-react';

export default function TaskAssistantPage() {
  const t = useTranslations();
  const [userId, setUserId] = useState(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    async function getUserInfo() {
      try {
        setLoading(true);
        const { data, error } = await supabase.auth.getUser();
        
        if (error) {
          console.error('Error getting user:', error);
          return;
        }
        
        if (data?.user) {
          setUserId(data.user.id);
        }
      } catch (error) {
        console.error('Failed to get user info:', error);
      } finally {
        setLoading(false);
      }
    }
    
    getUserInfo();
  }, []);
  
  if (loading) {
    return (
      <div className="flex items-center justify-center h-[70vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  if (!userId) {
    return (
      <div className="container max-w-3xl mx-auto py-12 px-4 md:px-6">
        <div className="text-center space-y-3">
          <h1 className="text-3xl font-bold tracking-tight">
            {t('nav.taskAssistant')}
          </h1>
          <p className="text-red-500">
            {t('errors.userNotLoggedIn')}
          </p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="container max-w-3xl mx-auto py-12 px-4 md:px-6">
      <div className="space-y-8">
        <div className="text-center space-y-3">
          <h1 className="text-3xl font-bold tracking-tight">
            {t('nav.taskAssistant')}
          </h1>
          <p className="text-gray-500 dark:text-gray-400 max-w-2xl mx-auto">
            {t('search.description')}
          </p>
        </div>
        
        <TaskManagerAgent userId={userId} />
        
        <div className="rounded-lg border bg-card p-6 text-sm">
          <h3 className="font-medium mb-2">{t('search.examples')}:</h3>
          <ul className="space-y-2 list-disc pl-5">
            <li>{t('search.suggestedSearches.designProject')}</li>
            <li>{t('search.suggestedSearches.marketingProject')}</li>
            <li>{t('search.suggestedSearches.weeklyTasks')}</li>
            <li>{t('search.suggestedSearches.developmentProject')}</li>
          </ul>
        </div>
      </div>
    </div>
  );
} 