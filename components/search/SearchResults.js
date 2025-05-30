'use client';

import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useLocale } from 'next-intl';
import { Loader, FolderKanban, CheckSquare, User, Calendar, MessageSquare, Search, Users } from 'lucide-react';

// 高亮匹配文本
function HighlightText({ text, query }) {
  if (!query || !text) return text;
  
  const parts = text.split(new RegExp(`(${query})`, 'gi'));
  
  return (
    <>
      {parts.map((part, i) => 
        part.toLowerCase() === query.toLowerCase() ? 
          <span key={i} className="bg-yellow-200 dark:bg-yellow-800 rounded">{part}</span> : 
          part
      )}
    </>
  );
}

// 获取结果项的图标
function getItemIcon(type) {
  switch (type) {
    case 'project':
      return <FolderKanban className="h-5 w-5" />;
    case 'task':
      return <CheckSquare className="h-5 w-5" />;
    case 'user':
      return <User className="h-5 w-5" />;
    case 'team':
      return <Users className="h-5 w-5" />;
    case 'calendar':
      return <Calendar className="h-5 w-5" />;
    case 'message':
      return <MessageSquare className="h-5 w-5" />;
    default:
      return <div className="h-5 w-5" />;
  }
}

// 获取结果项的链接
function getItemLink(item, locale) {
  switch (item.type) {
    case 'project':
      return `/${locale}/projects/${item.id}`;
    case 'task':
      return `/${locale}/tasks/${item.id}`;
    case 'user':
      return `/${locale}/users/${item.id}`;
    case 'team':
      return `/${locale}/projects/${item.project_id || item.id}`;
    case 'calendar':
      return `/${locale}/calendar/${item.id}`;
    case 'message':
      return `/${locale}/chat/${item.chat_id || item.session_id}`;
    default:
      return '#';
  }
}

// 获取显示名称
function getDisplayName(item, t) {
  switch (item.type) {
    case 'project':
      return item.project_name;
    case 'task':
      return item.title;
    case 'user':
      return item.name;
    case 'team':
      return item.name;
    case 'message':
      return item.chat_name || t('search.message');
    default:
      return item.title || item.name || item.project_name || t('search.untitled');
  }
}

export default function SearchResults({ results, loading, query, onUserClick }) {
  const t = useTranslations();
  const locale = useLocale();

  // Create a wrapper component to handle conditional rendering of Link vs div
  const ResultItem = ({ item, children }) => {
    // If it's a user type and we have an onUserClick handler, render a div with onClick
    if (item.type === 'user' && typeof onUserClick === 'function') {
      return (
        <div 
          className="block p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer"
          onClick={() => onUserClick(item)}
        >
          {children}
        </div>
      );
    }
    
    // Otherwise, render a Link as before
    return (
      <Link 
        href={getItemLink(item, locale)} 
        className="block p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
      >
        {children}
      </Link>
    );
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center mt-16 py-12">
        <Loader className="h-8 w-8 animate-spin text-primary mb-4" />
        <p className="text-gray-500 dark:text-gray-400">{t('search.searching')}</p>
      </div>
    );
  }

  if (results.length === 0 && query) {
    return (
      <div className="flex flex-col items-center justify-center mt-16 py-12">
        <div className="bg-gray-100 dark:bg-gray-800 rounded-full p-4 mb-4">
          <Search className="h-8 w-8 text-gray-400" />
        </div>
        <h3 className="text-lg font-medium mb-2">{t('search.noResults')}</h3>
        <p className="text-gray-500 dark:text-gray-400">{t('search.tryDifferent')}</p>
      </div>
    );
  }

  return (
    <div className="mt-8">
      <h2 className="text-lg font-medium mb-4">
        {results.length} {t('search.resultsFound')}
      </h2>
      
      <div className="space-y-4">
        {results.map((item) => (
          <ResultItem item={item} key={`${item.type}-${item.id}`}>
            <div className="flex items-start">
              <div className="mr-3 mt-0.5 text-gray-500 dark:text-gray-400">
                {getItemIcon(item.type)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="text-base font-medium truncate">
                    <HighlightText text={getDisplayName(item, t)} query={query} />
                  </h3>
                  <span className="text-sm text-gray-500 dark:text-gray-400 ml-2">
                    {t(`search.types.${item.type}`)}
                  </span>
                </div>
                
                {item.description && (
                  <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2 mb-2">
                    <HighlightText text={item.description} query={query} />
                  </p>
                )}
                
                <div className="flex items-center text-xs text-gray-500 dark:text-gray-400 mt-1 space-x-3">
                  {item.created_at && (
                    <span>
                      {t('search.createdAt')}: {new Date(item.created_at).toLocaleDateString()}
                    </span>
                  )}
                  
                  {(item.project_name && item.type !== 'project' && item.type !== 'team') && (
                    <span>
                      {t('search.project')}: {item.project_name}
                    </span>
                  )}

                  {item.type === 'team' && item.project_name && (
                    <span>
                      {t('search.project')}: {item.project_name}
                    </span>
                  )}
                  
                  {item.status && (
                    <span className="capitalize">
                      {t('search.status')}: {t(`Projects.status.${item.status}`)}
                    </span>
                  )}

                  {item.type === 'user' && item.email && (
                    <span>
                      {t('profile.email')}: {item.email}
                    </span>
                  )}

                  {item.type === 'team' && item.creator_name && (
                    <span>
                      {t('search.creator')}: {item.creator_name}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </ResultItem>
        ))}
      </div>
    </div>
  );
} 