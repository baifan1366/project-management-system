'use client';

import { useTranslations } from 'next-intl';
import { Clock, X } from 'lucide-react';

export default function RecentSearches({ searches, onSearch, onClear }) {
  const t = useTranslations();
  
  if (searches.length === 0) return null;
  
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-medium flex items-center">
          <Clock className="h-5 w-5 mr-2 text-gray-500" />
          {t('search.recentSearches')}
        </h2>
        <button
          onClick={onClear}
          className="text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
        >
          {t('search.clearAll')}
        </button>
      </div>
      
      <div className="flex flex-wrap gap-2">
        {searches.map((term, index) => (
          <button
            key={index}
            onClick={() => onSearch(term)}
            className="inline-flex items-center py-1.5 px-3 rounded-full bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-sm transition-colors"
          >
            {term}
          </button>
        ))}
      </div>
    </div>
  );
} 