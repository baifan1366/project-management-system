'use client';

import { useTranslations } from 'next-intl';
import { useUserTimezone } from './useUserTimezone';

/**
 * Custom hook for formatting user's last seen time
 * Returns friendly formatted text based on time difference
 * @param {string} dateString - Date string of user's last seen time
 * @returns {string} Formatted text
 */
export function useLastSeen() {
  const t = useTranslations('Chat');
  const { adjustTimeByOffset, hourFormat } = useUserTimezone();
  
  const formatLastSeen = (dateString) => {
    // If no dateString is provided, return empty string
    // This ensures we don't display last seen time for users who haven't been online
    if (!dateString) return '';
    
    // Create date objects
    const date = new Date(dateString);
    const now = new Date();

    // Check if the date is valid
    if (isNaN(date.getTime())) return '';

    // Then adjust both dates for display purposes
    const dateInUserTz = adjustTimeByOffset(date);
    const nowInUserTz = adjustTimeByOffset(now);

    // Calculate time difference in milliseconds
    const diffMs = now.getTime() - dateInUserTz.getTime();
    
    // Calculate time difference components
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);

    // Less than a minute: just now
    if (diffMin < 1) {
      return t('justNow');
    }
    
    // Less than an hour: XX minutes ago
    if (diffHour < 1) {
      return t('minutesAgo', { minutes: diffMin });
    }
    
    // Today: XX hours ago
    if (diffDay < 1) {
      return t('hoursAgo', { hours: diffHour });
    }
    
    // Yesterday: yesterday
    if (diffDay < 2) {
      return t('yesterday');
    }
    
    // Less than a week: day of week
    if (diffDay < 7) {
      const weekdays = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
      return t(weekdays[dateInUserTz.getDay()]);
    }
    
    // More than a week: days ago
    return t('daysAgo', { days: diffDay });
  };

  return { formatLastSeen };
} 