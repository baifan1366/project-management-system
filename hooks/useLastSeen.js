'use client';

import { useTranslations } from 'next-intl';
import { useUserTimezone } from './useUserTimezone';

/**
 * 用于格式化用户最后在线时间的hook
 * 根据时间差返回友好的显示格式
 * @param {string} dateString - 用户上次在线的日期字符串
 * @returns {string} 格式化后的文本
 */
export function useLastSeen() {
  const t = useTranslations('Chat');
  const { adjustTimeByOffset } = useUserTimezone();
  
  const formatLastSeen = (dateString) => {
    if (!dateString) return '';
    
    const date = new Date(dateString);
    const now = new Date();
    
    // 使用手动时区调整
    const dateInUserTz = adjustTimeByOffset(date);
    const nowInUserTz = adjustTimeByOffset(now);
    
    const diffMs = nowInUserTz - dateInUserTz;
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);

    // 一分钟内：刚刚在线
    if (diffMin < 1) {
      return t('justNow');
    }
    
    // 一小时内：XX分钟前在线
    if (diffHour < 1) {
      return t('minutesAgo', { minutes: diffMin });
    }
    
    // 今天内：XX小时前在线
    if (diffDay < 1 && dateInUserTz.getDate() === nowInUserTz.getDate()) {
      return t('hoursAgo', { hours: diffHour });
    }
    
    // 昨天：昨天在线
    if (diffDay < 2) {
      return t('yesterday');
    }
    
    // 一周内：周X在线
    if (diffDay < 7) {
      const weekdays = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
      return t(weekdays[dateInUserTz.getDay()]);
    }
    
    // 超过一周：显示具体日期
    return t('daysAgo', { days: diffDay });
  };

  return { formatLastSeen };
} 