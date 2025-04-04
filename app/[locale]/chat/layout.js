'use client';

import React, { useState, useEffect } from 'react';
import { Search, MessageSquare } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useChat } from '@/contexts/ChatContext';
import { useUserStatus } from '@/contexts/UserStatusContext';
import NewChatPopover from '@/components/NewChatPopover';
import { useLastSeen } from '@/hooks/useLastSeen';
import { useChatTime } from '@/hooks/useChatTime';
import { useDynamicMetadata } from '@/hooks/useDynamicMetadata';

import Image from 'next/image';
import PengyImage from '../../../public/pengy.webp';

function ChatLayout({ children }) {
  const t = useTranslations('Chat');
  const { formatLastSeen } = useLastSeen(); // 使用上次在线时间钩子
  const { formatChatTime } = useChatTime(); // 使用聊天时间钩子
  const { usersStatus } = useUserStatus(); // 使用增强的用户状态上下文
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
  
  // 使用动态元数据钩子
  useDynamicMetadata({
    unreadCount: totalUnreadCount,
    currentSession
  });
  
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
                    alt={t('switchToAI')} 
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
              aria-label={t('searchPlaceholder')}
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
                title={session.type === 'PRIVATE' 
                  ? t('privateChat') + ': ' + (session.participants[0]?.name || '')
                  : (session.type === 'AI' ? t('aiAssistant') : t('groupChat') + ': ' + (session.name || ''))}
              >
                <div className="relative flex-shrink-0">
                  <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center text-white font-medium overflow-hidden">
                    {session.type === 'AI' ? (
                      <div className="w-full h-full">
                        <Image 
                          src={PengyImage} 
                          alt={t('aiAssistant')}
                          className="w-full h-full object-cover rounded-lg"
                        />
                      </div>
                    ) : session.type === 'PRIVATE' ? (
                      session.participants[0]?.avatar_url && session.participants[0]?.avatar_url !== '' ? (
                        <img 
                          src={session.participants[0].avatar_url} 
                          alt={session.participants[0].name || t('privateChat')}
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
                    <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-red-500 rounded-full border-2 border-background flex items-center justify-center shadow-sm"
                         title={t('unreadMessages', { count: session.unreadCount }) || `${session.unreadCount} 未读消息`}>
                      <span className="text-xs text-white font-bold">{session.unreadCount > 9 ? '9+' : session.unreadCount}</span>
                    </div>
                  )}
                  {session.type === 'PRIVATE' && !session.unreadCount && session.participants[0]?.is_online && (
                    <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-background"
                         title={t('online')}></div>
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
                      <div className="ml-2 w-2 h-2 bg-blue-600 rounded-full flex-shrink-0"
                           title={t('unreadMessages', { count: session.unreadCount }) || `${session.unreadCount} 未读消息`}></div>
                    )}
                  </div>
                  {/* 在线状态指示器 */}
                  {session.type === 'PRIVATE' && (
                    <div className="mt-0.5">
                      {/* 使用usersStatus获取最新状态 */}
                      {session.participants[0]?.id && usersStatus[session.participants[0].id]?.isOnline ? (
                        <p className="text-xs text-green-600">{t('online')}</p>
                      ) : (
                        <p className="text-xs text-muted-foreground">
                          {session.participants[0]?.id && usersStatus[session.participants[0].id]?.lastSeen ? 
                            formatLastSeen(usersStatus[session.participants[0].id].lastSeen) :
                            formatLastSeen(session.participants[0]?.last_seen_at)
                          }
                        </p>
                      )}
                    </div>
                  )}
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
