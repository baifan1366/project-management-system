'use client';

import { useState, useEffect } from 'react';
import TaskManagerAgent from '@/components/ui/TaskManagerAgent';
import { useTranslations } from 'next-intl';
import { useGetUser } from '@/lib/hooks/useGetUser';
import { Loader2 } from 'lucide-react';
import Image from 'next/image';

export default function TaskAssistantPage() {
  const t = useTranslations();
  const [userId, setUserId] = useState(null);
  const [loading, setLoading] = useState(true);
  const { user, error, isLoading } = useGetUser();
  
  useEffect(() => {
    if (!isLoading) {
      if (user) {
        setUserId(user.id);
      }
      setLoading(false);
    }
  }, [user, isLoading]);
  
  if (loading || isLoading) {
    return (
      <div className="flex items-center justify-center h-[70vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  if (!userId) {
    return (
      <div className="container w-full py-12 px-4 md:px-6 h-[calc(100vh-64px)] overflow-auto">
        <div className="text-center space-y-3 w-full">
          <div className="flex justify-center mb-4  w-full">
            <Image 
              src="/pengy assistant.png" 
              alt="Pengy Assistant" 
              width={120} 
              height={120} 
              className="rounded-full"
            />
          </div>
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
    <div className="container w-full py-12 px-4 md:px-6 h-[calc(100vh-64px)] overflow-auto">
      <div className="space-y-8">
        <div className="text-center space-y-3">
          <div className="flex justify-center mb-4">
            <Image 
              src="/pengy assistant.png" 
              alt="Pengy Assistant" 
              width={120} 
              height={120} 
              className="rounded-full shadow-md hover:shadow-lg transition-shadow duration-300"
            />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">
            Pengy {t('nav.taskAssistant')}
          </h1>
          <p className="text-gray-500 dark:text-gray-400 max-w-2xl mx-auto">
            {t('search.description')}
          </p>
        </div>
        
        <TaskManagerAgent userId={userId} />
        
        <div className="rounded-lg border bg-card p-6 text-sm shadow-md">
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