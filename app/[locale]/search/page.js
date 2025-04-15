'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import SearchInput from '@/components/search/SearchInput';
import SearchResults from '@/components/search/SearchResults';
import RecentSearches from '@/components/search/RecentSearches';
import SuggestedSearches from '@/components/search/SuggestedSearches';
import { supabase } from '@/lib/supabase';

export default function SearchPage() {
  const t = useTranslations();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [recentSearches, setRecentSearches] = useState([]);

  // Load recent searches
  useEffect(() => {
    async function loadRecentSearches() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

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
          <RecentSearches 
            searches={recentSearches}
            onSearch={(term) => {
              setQuery(term);
              handleSearch(term);
            }}
            onClear={handleClearRecent}
          />
          
          <SuggestedSearches 
            onSearch={(term) => {
              setQuery(term);
              handleSearch(term);
            }} 
          />
        </div>
      ) : (
        <SearchResults 
          results={results} 
          loading={loading}
          query={query}
        />
      )}
    </div>
  );
} 