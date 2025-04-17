'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import SearchInput from '@/components/search/SearchInput';
import SearchResults from '@/components/search/SearchResults';
import RecentSearches from '@/components/search/RecentSearches';
import SuggestedSearches from '@/components/search/SuggestedSearches';
import { supabase } from '@/lib/supabase';
import { Skeleton } from '@/components/ui/skeleton';

export default function SearchPage() {
  const t = useTranslations();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [recentSearches, setRecentSearches] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  // Load recent searches
  useEffect(() => {
    async function loadRecentSearches() {
      setLoadingHistory(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          setLoadingHistory(false);
          return;
        }

        const { data, error } = await supabase
          .from('search_history')
          .select('search_term')
          .eq('user_id', session.user.id)
          .order('last_searched_at', { ascending: false })
          .limit(10);

        if (error) throw error;
        
        setRecentSearches(data.map(item => item.search_term));
      } catch (error) {
        console.error('Failed to load recent searches:', error);
      } finally {
        setLoadingHistory(false);
      }
    }

    loadRecentSearches();
  }, []);

  // Handle search request
  const handleSearch = async (searchQuery = query) => {
    if (!searchQuery.trim()) {
      setResults([]);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}`);
      const data = await response.json();
      
      if (response.ok) {
        setResults(data.results || []);
        
        // Update recent searches
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          // First check if this search term already exists for this user
          const { data: existingSearch, error: fetchError } = await supabase
            .from('search_history')
            .select('id, count')
            .eq('search_term', searchQuery)
            .eq('user_id', session.user.id)
            .maybeSingle();
          
          if (fetchError) {
            console.error('Failed to check existing search:', fetchError);
          } else if (existingSearch) {
            // Update existing record
            const { error: updateError } = await supabase
              .from('search_history')
              .update({
                count: existingSearch.count + 1,
                last_searched_at: new Date().toISOString()
              })
              .eq('id', existingSearch.id);
              
            if (updateError) console.error('Failed to update search history:', updateError);
          } else {
            // Insert new record
            const { error: insertError } = await supabase
              .from('search_history')
              .insert({
                search_term: searchQuery,
                user_id: session.user.id,
                count: 1
              });
              
            if (insertError) console.error('Failed to insert search history:', insertError);
          }
          
          // Reload recent searches
          const { data: recentData } = await supabase
            .from('search_history')
            .select('search_term')
            .eq('user_id', session.user.id)
            .order('last_searched_at', { ascending: false })
            .limit(10);
          
          if (recentData) {
            setRecentSearches(recentData.map(item => item.search_term));
          }
        }
      } else {
        console.error('Search failed:', data.error);
      }
    } catch (error) {
      console.error('Search request failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClearRecent = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { error } = await supabase
        .from('search_history')
        .delete()
        .eq('user_id', session.user.id);

      if (error) throw error;
      
      setRecentSearches([]);
    } catch (error) {
      console.error('Failed to clear search history:', error);
    }
  };

  // 搜索结果骨架屏组件
  const SearchResultsSkeleton = () => (
    <div className="mt-8">
      <Skeleton className="h-7 w-48 mb-6" />
      
      <div className="space-y-4">
        {[1, 2, 3, 4, 5].map((item) => (
          <div key={item} className="p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-start">
              <Skeleton className="h-5 w-5 mr-3 rounded-full" />
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-4 w-16 ml-2" />
                </div>
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-5/6 mb-1" />
                <div className="flex items-center mt-3 space-x-3">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-3 w-32" />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  // 最近搜索骨架屏组件
  const RecentSearchesSkeleton = () => (
    <div className="mt-8">
      <div className="flex items-center justify-between mb-3">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-4 w-16" />
      </div>
      <div className="flex flex-wrap gap-2">
        {[1, 2, 3, 4, 5].map((item) => (
          <Skeleton key={item} className="h-8 w-24 rounded-full" />
        ))}
      </div>
    </div>
  );

  // 推荐搜索骨架屏组件
  const SuggestedSearchesSkeleton = () => (
    <div className="mt-8">
      <Skeleton className="h-6 w-48 mb-3" />
      <div className="flex flex-wrap gap-2">
        {[1, 2, 3, 4, 5].map((item) => (
          <Skeleton key={item} className="h-8 w-28 rounded-full" />
        ))}
      </div>
    </div>
  );

  return (
    <div className="container mx-auto py-6 px-4 max-w-5xl">
      <h1 className="text-2xl font-bold mb-6">{t('search.title')}</h1>
      
      <SearchInput 
        query={query} 
        setQuery={setQuery} 
        onSearch={handleSearch} 
      />
      
      {!query && !results.length ? (
        <div className="mt-8 space-y-8">
          {loadingHistory ? (
            <RecentSearchesSkeleton />
          ) : (
            <RecentSearches 
              searches={recentSearches}
              onSearch={(term) => {
                setQuery(term);
                handleSearch(term);
              }}
              onClear={handleClearRecent}
            />
          )}
          
          {loadingHistory ? (
            <SuggestedSearchesSkeleton />
          ) : (
            <SuggestedSearches 
              onSearch={(term) => {
                setQuery(term);
                handleSearch(term);
              }} 
            />
          )}
        </div>
      ) : (
        loading ? (
          <SearchResultsSkeleton />
        ) : (
          <SearchResults 
            results={results} 
            loading={false}
            query={query}
          />
        )
      )}
    </div>
  );
} 