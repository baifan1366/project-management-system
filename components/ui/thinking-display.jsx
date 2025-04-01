import React, { useState } from 'react';
import { cn } from '@/lib/utils';

export const ThinkingDisplay = ({ content, t }) => {
  const [expanded, setExpanded] = useState(false);
  
  // 切换展开/折叠状态
  const toggleExpansion = () => {
    setExpanded(prev => !prev);
  };
  
  // 只有当内容足够长时才显示"阅读更多"按钮
  const showToggle = content.split('\n').length > 3;
  
  return (
    <div className="mb-4 px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg">
      <div className="flex items-center gap-2 mb-2 text-gray-500 dark:text-gray-400">
        <div className="w-3 h-3">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
            <path d="M12 3v3m0 12v3M3 12h3m12 0h3M5.636 5.636l2.122 2.122m8.484 8.484l2.122 2.122M5.636 18.364l2.122-2.122m8.484-8.484l2.122-2.122"></path>
          </svg>
        </div>
        <span className="text-xs font-medium">{t('thinking')}</span>
      </div>
      <div className={cn(
        "pl-5 text-xs text-gray-600 dark:text-gray-400 whitespace-pre-wrap transition-all duration-200",
        !expanded && "line-clamp-3"
      )}>
        {content}
      </div>
      {showToggle && (
        <button
          onClick={toggleExpansion}
          className="mt-1 text-xs text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 font-medium pl-5"
        >
          {expanded ? t('showLess') : t('readMore')}
        </button>
      )}
    </div>
  );
};

export default ThinkingDisplay; 