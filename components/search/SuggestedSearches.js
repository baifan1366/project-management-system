'use client';

import { useTranslations } from 'next-intl';
import { Sparkles } from 'lucide-react';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function SuggestedSearches({ onSearch }) {
  const t = useTranslations();
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    async function fetchSuggestions() {
      try {
        // 获取热门搜索
        const { data, error } = await supabase
          .from('search_history')
          .select('search_term, count')
          .order('count', { ascending: false })
          .limit(5);
        
        if (error) throw error;
        
        // 如果没有足够的热门搜索，添加一些默认推荐
        const defaultSuggestions = [
          t('search.suggestions.projects'),
          t('search.suggestions.tasks'),
          t('search.suggestions.reports'),
          t('search.suggestions.team')
        ];
        
        let mergedSuggestions = [];
        
        if (data && data.length > 0) {
          // 添加来自数据库的热门搜索
          mergedSuggestions = data.map(item => item.search_term);
          
          // 如果热门搜索不足5个，添加一些默认推荐
          if (mergedSuggestions.length < 5) {
            const remainingCount = 5 - mergedSuggestions.length;
            // 过滤掉已经在热门搜索中的默认推荐
            const filteredDefaults = defaultSuggestions
              .filter(term => !mergedSuggestions.includes(term))
              .slice(0, remainingCount);
            
            mergedSuggestions = [...mergedSuggestions, ...filteredDefaults];
          }
        } else {
          // 如果没有热门搜索，使用所有默认推荐
          mergedSuggestions = defaultSuggestions;
        }
        
        setSuggestions(mergedSuggestions);
      } catch (error) {
        console.error('加载推荐搜索失败:', error);
        // 出错时使用默认推荐
        setSuggestions([
          t('search.suggestions.projects'),
          t('search.suggestions.tasks'),
          t('search.suggestions.reports'),
          t('search.suggestions.team')
        ]);
      } finally {
        setLoading(false);
      }
    }
    
    fetchSuggestions();
  }, [t]);
  
  if (loading) return null;
  
  return (
    <div>
      <h2 className="text-lg font-medium flex items-center mb-3">
        <Sparkles className="h-5 w-5 mr-2 text-gray-500" />
        {t('search.suggestedSearches')}
      </h2>
      
      <div className="flex flex-wrap gap-2">
        {suggestions.map((term, index) => (
          <button
            key={index}
            onClick={() => onSearch(term)}
            className="inline-flex items-center py-1.5 px-3 rounded-full bg-primary/10 hover:bg-primary/20 text-primary dark:bg-primary/20 dark:hover:bg-primary/30 text-sm transition-colors"
          >
            {term}
          </button>
        ))}
      </div>
    </div>
  );
} 