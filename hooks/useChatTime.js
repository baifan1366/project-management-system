'use client';

import { useTranslations } from 'next-intl';

/**
 * 用于格式化聊天消息时间的hook
 * 根据时间差返回友好的显示格式
 * @param {string} dateString - 消息发送的日期字符串
 * @returns {string} 格式化后的文本
 */
export function useChatTime() {
  const t = useTranslations('Chat');
  
  const formatChatTime = (dateString) => {
    if (!dateString) return '';
    
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);

    // 如果是今天的消息，显示时间
    if (diffDay < 1 && date.getDate() === now.getDate()) {
      return date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    }
    
    // 如果是昨天的消息
    if (diffDay < 2) {
      return t('yesterday');
    }
    
    // 一周内的消息显示星期几
    if (diffDay < 7) {
      const weekdays = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
      return t(weekdays[date.getDay()]);
    }
    
    // 超过一周的消息显示日期
    return date.toLocaleDateString([], {month: 'short', day: 'numeric'});
  };

  return { formatChatTime };
} 