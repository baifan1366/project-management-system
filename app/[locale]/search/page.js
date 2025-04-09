'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import SearchInput from '@/components/search/SearchInput';
import SearchResults from '@/components/search/SearchResults';
import RecentSearches from '@/components/search/RecentSearches';
import SuggestedSearches from '@/components/search/SuggestedSearches';

export default function SearchPage() {
  const t = useTranslations();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [recentSearches, setRecentSearches] = useState([]);

  // 加载最近搜索记录
  useEffect(() => {
    const storedSearches = localStorage.getItem('recentSearches');
    if (storedSearches) {
      setRecentSearches(JSON.parse(storedSearches));
    }
  }, []);

  // 保存搜索记录
  const saveSearch = (searchQuery) => {
    if (!searchQuery.trim()) return;
    
    const searches = [...recentSearches];
    // 如果已经存在相同搜索，移除它
    const existingIndex = searches.findIndex(s => s.toLowerCase() === searchQuery.toLowerCase());
    if (existingIndex !== -1) {
      searches.splice(existingIndex, 1);
    }
    
    // 添加到数组开头
    searches.unshift(searchQuery);
    
    // 最多保存10条搜索记录
    const updatedSearches = searches.slice(0, 10);
    setRecentSearches(updatedSearches);
    localStorage.setItem('recentSearches', JSON.stringify(updatedSearches));
  };

  // 处理搜索请求
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
        saveSearch(searchQuery);
      } else {
        console.error('搜索失败:', data.error);
      }
    } catch (error) {
      console.error('搜索请求失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClearRecent = () => {
    setRecentSearches([]);
    localStorage.removeItem('recentSearches');
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