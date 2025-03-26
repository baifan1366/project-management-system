'use client';

import React, { useState, useEffect } from 'react';
import { Search, MessageSquare } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useChat } from '@/contexts/ChatContext';
import NewChatPopover from '@/components/NewChatPopover';
import { supabase } from '@/lib/supabase';
import Image from 'next/image';
import PengyImage from '../../../public/pengy.webp';

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
                    alt="Switch to AI" 
                    width={20}
                    height={20}
                    style={{ objectFit: 'contain' }}
                    className="rounded-sm"
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
                className={`flex items-center gap-3 p-4 hover:bg-accent/50 cursor-pointer transition-colors ${
                  currentSession?.id === session.id ? 'bg-accent' : ''
                }`}
                onClick={() => handleChatClick(session)}
              >
                <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center text-white font-medium overflow-hidden flex-shrink-0">
                  {session.type === 'PRIVATE' ? (
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
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline justify-between">
                    <h3 className="font-medium truncate">
                      {session.type === 'PRIVATE' 
                        ? session.participants[0]?.name
                        : session.name}
                    </h3>
                    {session.unreadCount > 0 && (
                      <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                        {session.unreadCount}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground truncate">
                      {session.lastMessage?.content || t('noMessages')}
                    </p>
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
