import React from 'react';
import { Badge } from '@/components/ui/badge';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';

/**
 * ExternalBadge component
 * Displays a badge indicating a user is external (not in any shared teams)
 */
export default function ExternalBadge({ className }) {
  const t = useTranslations('Users');
  
  return (
    <Badge 
      variant="outline" 
      className={cn(
        "bg-amber-100 text-amber-800 hover:bg-amber-100 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800",
        className
      )}
    >
      {t('external') || 'External'}
    </Badge>
  );
} 