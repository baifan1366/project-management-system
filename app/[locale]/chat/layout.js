'use client';

import { useState, useEffect } from 'react';
import { Search } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useChat } from '@/contexts/ChatContext';
import NewChatPopover from '@/components/NewChatPopover';
import { supabase } from '@/lib/supabase';

function ChatLayout({ children }) {
  const t = useTranslations('Chat');
  const [searchQuery, setSearchQuery] = useState('');
  const { sessions, currentSession, setCurrentSession } = useChat();

  // 添加日志查看所有sessions
  console.log('所有聊天会话:', sessions);

  const handleChatClick = (session) => {
    setCurrentSession(session);
  };

  return (
    <div className="flex h-screen">
      {/* 聊天列表侧边栏 */}
      <div className="w-80 border-r flex flex-col bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="p-4 border-b">
          <h2 className="text-lg font-semibold mb-4">{t('title')}</h2>
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
          {sessions.map((session) => {
            return (
              <div
                key={session.id}
                className={`flex items-center gap-3 p-4 hover:bg-accent/50 cursor-pointer transition-colors ${
                  currentSession?.id === session.id ? 'bg-accent' : ''
                }`}
                onClick={() => handleChatClick(session)}
              >
                <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center text-white font-medium overflow-hidden">
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
