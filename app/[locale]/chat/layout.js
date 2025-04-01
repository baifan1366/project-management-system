'use client';

import React, { useState, useEffect } from 'react';
import { Search, MessageSquare } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useChat } from '@/contexts/ChatContext';
import NewChatPopover from '@/components/NewChatPopover';
import { supabase } from '@/lib/supabase';

import Image from 'next/image';
import PengyImage from '../../../public/pengy.webp';;

// 动态修改标题和favicon的组件
function DynamicMetadata({ unreadCount, currentSession }) {
  // 记录上一次的未读计数，用于检测新消息
  const [prevUnreadCount, setPrevUnreadCount] = useState(unreadCount);
  const [notificationPermission, setNotificationPermission] = useState('default');
  
  // 请求通知权限
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setNotificationPermission(Notification.permission);
      
      if (Notification.permission === 'default') {
        // 等待用户交互后请求权限
        const handleUserInteraction = () => {
          Notification.requestPermission().then(permission => {
            setNotificationPermission(permission);
            // 获得权限后移除事件监听器
            document.removeEventListener('click', handleUserInteraction);
          });
        };
        
        document.addEventListener('click', handleUserInteraction);
        return () => {
          document.removeEventListener('click', handleUserInteraction);
        };
      }
    }
  }, []);
  
  // 监测未读消息变化
  useEffect(() => {
    if (unreadCount > prevUnreadCount) {
      // 有新消息，尝试发送通知
      if (notificationPermission === 'granted' && document.visibilityState !== 'visible') {
        try {
          const notification = new Notification('Team Sync 有新消息', {
            body: `您有 ${unreadCount} 条未读消息`,
            icon: '/logo.png'
          });
          
          notification.onclick = () => {
            window.focus();
            notification.close();
          };
          
          // 5秒后自动关闭通知
          setTimeout(() => notification.close(), 5000);
        } catch (e) {
          console.error('无法发送通知:', e);
        }
      }
    }
    
    setPrevUnreadCount(unreadCount);
  }, [unreadCount, prevUnreadCount, notificationPermission]);
  
  useEffect(() => {
    // 只在client端执行
    if (typeof window !== 'undefined') {
      const originalTitle = "Team Sync";
      let newTitle = originalTitle;
      
      // 如果有当前会话，显示会话名称
      const sessionName = currentSession ? (
        currentSession.type === 'AI' 
          ? `AI 助手`
          : currentSession.type === 'PRIVATE'
            ? (currentSession.participants[0]?.name || '私聊')
            : (currentSession.name || '群聊')
      ) : null;
      
      if (sessionName) {
        newTitle = `${sessionName} | ${originalTitle}`;
      }
      
      // 如果有未读消息，在标题前显示未读数
      if (unreadCount > 0) {
        document.title = `(${unreadCount}) ${newTitle}`;
        
        // 寻找现有的favicon链接
        let link = document.querySelector("link[rel~='icon']");
        if (!link) {
          // 如果不存在，创建一个新的
          link = document.createElement('link');
          link.rel = 'icon';
          document.head.appendChild(link);
        }
        
        // 保存原始favicon以便清理
        const originalFavicon = link.href;
        
        // 创建带有未读数的favicon
        const canvas = document.createElement('canvas');
        canvas.width = 32;
        canvas.height = 32;
        const ctx = canvas.getContext('2d');
        
        // 加载原始favicon
        const img = new window.Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          // 绘制原始图标
          ctx.drawImage(img, 0, 0, 32, 32);
          
          // 添加红色圆形背景
          ctx.beginPath();
          ctx.arc(24, 8, 8, 0, 2 * Math.PI);
          ctx.fillStyle = '#FF4D4F';
          ctx.fill();
          
          // 添加未读计数
          ctx.font = 'bold 12px Arial';
          ctx.fillStyle = 'white';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(unreadCount > 99 ? '99+' : unreadCount.toString(), 24, 8);
          
          // 设置为新的favicon
          link.href = canvas.toDataURL('image/png');
        };
        
        // 设置图像源，尝试加载原始favicon
        try {
          img.src = originalFavicon || '/logo.png';
        } catch (e) {
          // 如果无法加载原始favicon，使用一个空白背景
          ctx.fillStyle = '#f0f0f0';
          ctx.fillRect(0, 0, 32, 32);
          
          // 添加红色圆形背景
          ctx.beginPath();
          ctx.arc(24, 8, 8, 0, 2 * Math.PI);
          ctx.fillStyle = '#FF4D4F';
          ctx.fill();
          
          // 添加未读计数
          ctx.font = 'bold 12px Arial';
          ctx.fillStyle = 'white';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(unreadCount > 99 ? '99+' : unreadCount.toString(), 24, 8);
          
          // 设置为新的favicon
          link.href = canvas.toDataURL('image/png');
        }
        
        // 清理函数
        return () => {
          document.title = originalTitle;
          if (originalFavicon) {
            link.href = originalFavicon;
          }
        };
      } else {
        // 无未读消息时显示会话标题
        document.title = newTitle;
      }
      
      return () => {
        document.title = originalTitle;
      };
    }
  }, [unreadCount, currentSession]);
  
  return null; // 这个组件不渲染任何内容，只修改文档标题
}

// 格式化聊天时间
function formatChatTime(dateString) {
  if (!dateString) return '';
  
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  // 今天的消息显示时间
  if (diffDay < 1 && date.getDate() === now.getDate()) {
    return date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
  }
  
  // 昨天的消息
  if (diffDay < 2) {
    return '昨天';
  }
  
  // 一周内的消息显示星期几
  if (diffDay < 7) {
    const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    return weekdays[date.getDay()];
  }
  
  // 超过一周的消息显示日期
  return date.toLocaleDateString([], {month: 'short', day: 'numeric'});
}

function ChatLayout({ children }) {
  const t = useTranslations('Chat');
  const [searchQuery, setSearchQuery] = useState('');
  const { 
    sessions, 
    currentSession, 
    setCurrentSession, 
    chatMode,
    setChatMode 
  } = useChat();
  
  // 计算总未读消息数
  const totalUnreadCount = sessions.reduce((total, session) => total + (session.unreadCount || 0), 0);
  
  // 添加日志查看所有sessions
  console.log('所有聊天会话:', sessions);

  const handleChatClick = (session) => {
    if (chatMode === 'ai' && session.type !== 'AI') {
      setChatMode('normal');
    } else if (chatMode === 'normal' && session.type === 'AI') {
      setChatMode('ai');
    }
    setCurrentSession(session);
  };
  
  const toggleChatMode = () => {
    console.log('当前聊天模式:', chatMode);
    const newMode = chatMode === 'normal' ? 'ai' : 'normal';
    console.log('切换到新模式:', newMode);
    setChatMode(newMode);
    setCurrentSession(null);
  };

  return (
    <div className="flex h-screen">
      {/* 动态修改标题的组件 */}
      <DynamicMetadata unreadCount={totalUnreadCount} currentSession={currentSession} />
      
      {/* 聊天列表侧边栏 */}
      <div className="w-80 border-r flex flex-col bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="p-4 border-b flex items-center justify-between">
          <h2 className="text-lg font-semibold">{t('title')}</h2>
          <button
            onClick={toggleChatMode}
            className="p-2 rounded-lg hover:bg-accent flex items-center gap-1 text-sm"
            title={chatMode === 'normal' ? t('switchToAI') : t('switchToNormal')}
          >
            {chatMode === 'normal' ? (
              <>
                <div className="w-5 h-5 relative">
                  <Image 
                    src={PengyImage} 
                    alt="Switch to AI" 
                    className="w-5 h-5 object-contain rounded-sm"
                  />
                </div>
                <span className="hidden md:inline">{t('switchToAI')}</span>
              </>
            ) : (
              <>
                <MessageSquare size={16} />
                <span className="hidden md:inline">{t('switchToNormal')}</span>
              </>
            )}
          </button>
        </div>
        <div className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder={t('searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-accent/50 rounded-md text-sm placeholder:text-muted-foreground focus:outline-none"
            />
          </div>
        </div>

        {/* 聊天列表 */}
        <div className="flex-1 overflow-y-auto">
          {sessions
            .filter(session => chatMode === 'normal' ? session.type !== 'AI' : session.type === 'AI') // 根据模式显示不同类型的会话
            .map((session) => {
            return (
              <div
                key={session.id}
                className={`flex items-center gap-3 p-4 hover:bg-accent/50 cursor-pointer transition-colors relative ${
                  currentSession?.id === session.id ? 'bg-accent' : ''
                }`}
                onClick={() => handleChatClick(session)}
              >
                <div className="relative flex-shrink-0">
                  <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center text-white font-medium overflow-hidden">
                    {session.type === 'AI' ? (
                      <div className="w-full h-full">
                        <Image 
                          src={PengyImage} 
                          alt="AI Assistant"
                          className="w-full h-full object-cover rounded-lg"
                        />
                      </div>
                    ) : session.type === 'PRIVATE' ? (
                      session.participants[0]?.avatar_url && session.participants[0]?.avatar_url !== '' ? (
                        <img 
                          src={session.participants[0].avatar_url} 
                          alt={session.participants[0].name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span>{session.participants[0]?.name?.charAt(0) || '?'}</span>
                      )
                    ) : (
                      <span>{session.name?.charAt(0) || '?'}</span>
                    )}
                  </div>
                  {session.unreadCount > 0 && (
                    <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-red-500 rounded-full border-2 border-background flex items-center justify-center shadow-sm">
                      <span className="text-xs text-white font-bold">{session.unreadCount > 9 ? '9+' : session.unreadCount}</span>
                    </div>
                  )}
                  {session.type === 'PRIVATE' && !session.unreadCount && (
                    <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-background"></div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline justify-between">
                    <h3 className={`font-medium truncate ${session.unreadCount > 0 ? 'text-foreground font-semibold' : ''}`}>
                      {session.type === 'PRIVATE' 
                        ? session.participants[0]?.name
                        : session.name}
                    </h3>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatChatTime(session.lastMessage?.created_at)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <p className={`text-sm truncate ${session.unreadCount > 0 ? 'font-medium text-foreground' : 'text-muted-foreground'}`}>
                      {session.lastMessage ? (
                        session.lastMessage.role === 'assistant' ? 
                          `🤖 ${session.lastMessage.content || t('noMessages')}` : 
                          session.lastMessage.content || t('noMessages')
                      ) : t('noMessages')}
                    </p>
                    {session.unreadCount > 0 && currentSession?.id !== session.id && (
                      <div className="ml-2 w-2 h-2 bg-blue-600 rounded-full flex-shrink-0"></div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* 新建聊天按钮 */}
        <div className="p-4 border-t">
          <NewChatPopover />
        </div>
      </div>

      {/* 聊天内容区域 */}
      <div className="flex-1">
        {/* 将 chatMode 传递给子组件 */}
        {children}
      </div>
    </div>
  );
}

// 包装组件以提供 ChatContext
export default function WrappedChatLayout({ children }) {
  return (
      <ChatLayout>{children}</ChatLayout>
  );
}
