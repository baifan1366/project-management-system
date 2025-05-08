'use client';

import { useTranslations } from 'next-intl';
import { useUserTimezone } from './useUserTimezone';

/**
 * 用于格式化聊天消息时间的hook
 * 根据时间差返回友好的显示格式
 * @param {string} dateString - 消息发送的日期字符串
 * @returns {string} 格式化后的文本
 */
export function useChatTime() {
  const t = useTranslations('Chat');
  const { userTimezone, hourFormat, adjustTimeByOffset } = useUserTimezone();
  
  const formatChatTime = (dateString) => {
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

    // 如果是今天的消息，显示时间
    if (diffDay < 1 ) {
      return dateInUserTz.toLocaleTimeString([], {
        hour: '2-digit', 
        minute: '2-digit',
        hour12: hourFormat === '12h'
      });
    }
    
    // 如果是昨天的消息
    if (diffDay < 2) {
      return t('yesterday');
    }
    
    // 一周内的消息显示星期几
    if (diffDay < 7) {
      const weekdays = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
      // 使用调整后的日期获取星期几
      const dayOfWeek = dateInUserTz.getDay();
      return t(weekdays[dayOfWeek]);
    }
    
    // 超过一周的消息显示日期
    return dateInUserTz.toLocaleDateString([], {
      month: 'short', 
      day: 'numeric',
      hour12: hourFormat === '12h'
    });
  };

  return { formatChatTime };
} 