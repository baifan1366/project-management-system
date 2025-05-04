'use client';

import { useState, useEffect } from 'react';
import { User, Briefcase, ListChecks } from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

/**
 * MentionItem component
 * Displays a mention in a message with the appropriate styling
 */
const MentionItem = ({ 
  type, 
  id, 
  name,
  projectName = null,
  showIcon = true,
  className
}) => {
  const t = useTranslations('Chat');
  
  // Determine the styling based on mention type
  const getTypeStyles = () => {
    switch (type) {
      case 'user':
        return "bg-blue-100 text-blue-800 hover:bg-blue-200 dark:bg-blue-800/70 dark:text-blue-100 dark:hover:bg-blue-700/90";
      case 'project':
        return "bg-orange-100 text-orange-800 hover:bg-orange-200 dark:bg-orange-800/70 dark:text-orange-100 dark:hover:bg-orange-700/90";
      case 'task':
        return "bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-800/70 dark:text-green-100 dark:hover:bg-green-700/90";
      default:
        return "bg-gray-100 text-gray-800 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-100 dark:hover:bg-gray-600";
    }
  };

  // Get the appropriate icon
  const getIcon = () => {
    switch (type) {
      case 'user':
        return <User className="h-3 w-3" />;
      case 'project':
        return <Briefcase className="h-3 w-3" />;
      case 'task':
        return <ListChecks className="h-3 w-3" />;
      default:
        return null;
    }
  };

  // Determine the link URL
  const getLinkUrl = () => {
    switch (type) {
      case 'user':
        return `/profile/${id}`;
      case 'project':
        return `/projects/${id}`;
      case 'task':
        return `/tasks/${id}`;
      default:
        return '#';
    }
  };

  // Format the display text
  const getDisplayText = () => {
    switch (type) {
      case 'user':
        return `@${name}`;
      case 'project':
        return `#${name}`;
      case 'task':
        return projectName ? `${name} (${projectName})` : name;
      default:
        return name;
    }
  };

  return (
    <Link href={getLinkUrl()}>
      <span 
        className={cn(
          "inline-flex items-center gap-1 py-0.5 px-1.5 rounded text-xs font-medium",
          getTypeStyles(),
          className
        )}
      >
        {showIcon && getIcon()}
        <span>{getDisplayText()}</span>
      </span>
    </Link>
  );
};

export default MentionItem; 