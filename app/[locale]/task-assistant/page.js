'use client';

import { useState, useEffect } from 'react';
import TaskManagerAgent from '@/components/ui/TaskManagerAgent';
import { useTranslations } from 'next-intl';
import { useGetUser } from '@/lib/hooks/useGetUser';
import { Loader2, AlertCircle } from 'lucide-react';
import Image from 'next/image';

export default function TaskAssistantPage() {
  const t = useTranslations();
  const [userId, setUserId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [inputText, setInputText] = useState('');
  const [isOverLimit, setIsOverLimit] = useState(false);
  const MAX_CHARS = 1000;
  const { user, error, isLoading } = useGetUser();
  
  useEffect(() => {
    if (!isLoading) {
      if (user) {
        setUserId(user.id);
      }
      setLoading(false);
      
      if (error) {
        setLoadError(error.message || 'Failed to load user data');
      }
    }
  }, [user, isLoading, error]);
  
  const handleInputChange = (text) => {
    setInputText(text);
    setIsOverLimit(text.length > MAX_CHARS);
  };
  
  if (loading || isLoading) {
    return (
      <div className="flex items-center justify-center h-[70vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  if (loadError) {
    return (
      <div className="container w-full py-12 px-4 md:px-6 h-[calc(100vh-64px)] overflow-auto">
        <div className="text-center space-y-3 w-full">
          <div className="flex justify-center mb-4 w-full">
            <AlertCircle className="h-16 w-16 text-red-500" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">
            {t('nav.taskAssistant')}
          </h1>
          <p className="text-red-500">
            {loadError}
          </p>
          <button 
            onClick={() => window.location.reload()} 
            className="mt-4 px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90"
          >
            Refresh
          </button>
        </div>
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
        
        <TaskManagerAgent 
          userId={userId} 
          onInputChange={handleInputChange}
          maxCharacters={MAX_CHARS}
        />
        
        <div className="flex justify-between items-center px-4 mt-2">
          <div className={`text-sm ${isOverLimit ? 'text-red-500 font-medium' : 'text-gray-500'}`}>
            {inputText.length} / {MAX_CHARS}
          </div>
          {isOverLimit && (
            <div className="text-sm text-red-500 font-medium">
              {t('errors.characterLimit', { defaultValue: 'Character limit exceeded' })}
            </div>
          )}
        </div>
        
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