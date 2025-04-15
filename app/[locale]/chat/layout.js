'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Search, MessageSquare, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useChat } from '@/contexts/ChatContext';
import { useUserStatus } from '@/contexts/UserStatusContext';
import NewChatPopover from '@/components/chat/NewChatPopover';
import { useLastSeen } from '@/hooks/useLastSeen';
import { useChatTime } from '@/hooks/useChatTime';
import { useDynamicMetadata } from '@/hooks/useDynamicMetadata';
import { supabase } from '@/lib/supabase';
import Image from 'next/image';
import PengyImage from '../../../public/pengy.webp';

function ChatLayout({ children }) {
  const t = useTranslations('Chat');
  const { formatLastSeen } = useLastSeen(); // 使用上次在线时间钩子
  const { formatChatTime } = useChatTime(); // 使用聊天时间钩子
  const { usersStatus } = useUserStatus(); // 使用增强的用户状态上下文
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
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

  // 搜索聊天功能
  const handleSearch = async (query) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      // 获取当前用户会话信息
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setIsSearching(false);
        return;
      }
      
      // 获取用户参与的会话ID
      const { data: userSessions, error: sessionError } = await supabase
        .from('chat_participant')
        .select('session_id')
        .eq('user_id', session.user.id);
        
      if (sessionError) {
        console.error('搜索聊天错误:', sessionError);
        setIsSearching(false);
        return;
      }
      
      const sessionIds = userSessions.map(s => s.session_id);
      
      // 搜索消息内容
      const { data: messageResults, error: messageError } = await supabase
        .from('chat_message')
        .select(`
          id,
          content,
          created_at,
          session_id,
          user:user_id (
            id,
            name,
            avatar_url,
            email
          )
        `)
        .in('session_id', sessionIds)
        .ilike('content', `%${query}%`)
        .order('created_at', { ascending: false })
        .limit(20);
        
      if (messageError) {
        console.error('搜索消息错误:', messageError);
      }
      
      // 获取会话信息
      const { data: sessionData, error: sessionDataError } = await supabase
        .from('chat_session')
        .select(`
          id,
          type,
          name,
          participants:chat_participant(
            user:user_id (
              id,
              name,
              avatar_url,
              email,
              is_online,
              last_seen_at
            )
          )
        `)
        .in('id', sessionIds)
        .or(`name.ilike.%${query}%, type.eq.PRIVATE`);
        
      if (sessionDataError) {
        console.error('获取会话信息错误:', sessionDataError);
      }
      
      // 处理会话数据，添加匹配的消息
      const processedSessions = sessionData?.map(session => {
        // 过滤掉自己
        const filteredParticipants = session.participants
          .filter(p => p.user.id !== session.user?.id)
          .map(p => p.user);
          
        // 对于私聊，检查对方用户名是否匹配搜索词
        let matches = false;
        if (session.type === 'PRIVATE' && filteredParticipants.length > 0) {
          const otherUser = filteredParticipants[0];
          matches = otherUser.name.toLowerCase().includes(query.toLowerCase());
        } else {
          // 对于群聊，检查群名是否匹配
          matches = session.name.toLowerCase().includes(query.toLowerCase());
        }
        
        // 获取该会话中匹配的消息
        const matchedMessages = messageResults?.filter(msg => msg.session_id === session.id) || [];
        
        return {
          ...session,
          participants: filteredParticipants,
          matchedMessages,
          matches
        };
      }).filter(session => session.matches || session.matchedMessages.length > 0) || [];
      
      setSearchResults(processedSessions);
    } catch (error) {
      console.error('搜索过程中发生错误:', error);
    } finally {
      setIsSearching(false);
    }
  };
  
  // 当搜索词变化时进行搜索
  useEffect(() => {
    // 实现防抖功能
    const debounceTimeout = setTimeout(() => {
      if (searchQuery.trim()) {
        handleSearch(searchQuery);
      } else {
        setSearchResults([]);
      }
    }, 300);
    
    return () => clearTimeout(debounceTimeout);
  }, [searchQuery]);

  // 处理清除搜索
  const handleClearSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
  };

  const handleChatClick = (session) => {
    if (chatMode === 'ai' && session.type !== 'AI') {
      setChatMode('normal');
    } else if (chatMode === 'normal' && session.type === 'AI') {
      setChatMode('ai');
    }
    setCurrentSession(session);
  };
  
  const toggleChatMode = () => {
    const newMode = chatMode === 'normal' ? 'ai' : 'normal';
    setChatMode(newMode);
    setCurrentSession(null);
  };
  
  // 过滤会话列表
  const filteredSessions = useMemo(() => {
    // 如果有搜索结果，使用搜索结果
    if (searchQuery.trim() && searchResults.length > 0) {
      return searchResults;
    }
    
    // 否则根据聊天模式显示不同类型的会话
    return sessions.filter(session => 
      chatMode === 'normal' ? session.type !== 'AI' : session.type === 'AI'
    );
  }, [chatMode, sessions, searchQuery, searchResults]);

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
              placeholder={t('search.placeholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-2 bg-accent/50 rounded-md text-sm placeholder:text-muted-foreground focus:outline-none"
              aria-label={t('search.placeholder')}
            />
            {searchQuery && (
              <button 
                onClick={handleClearSearch}
                className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground hover:text-foreground"
              >
                <X size={16} />
              </button>
            )}
          </div>
          {isSearching && (
            <div className="mt-2 text-center text-sm text-muted-foreground">
              {t('search.searching')}
            </div>
          )}
          {searchQuery && !isSearching && searchResults.length === 0 && (
            <div className="mt-2 text-center text-sm text-muted-foreground">
              {t('search.noResults')}
            </div>
          )}
        </div>

        {/* 聊天列表 */}
        <div className="flex-1 overflow-y-auto">
          {filteredSessions.map((session) => {
            // 处理显示内容
            const sessionName = session.type === 'PRIVATE' 
              ? session.participants[0]?.name
              : session.name;
              
            const avatar = session.type === 'PRIVATE' 
              ? session.participants[0]?.avatar_url 
              : null;
              
            const lastMessageContent = session.matchedMessages && session.matchedMessages.length > 0
              ? session.matchedMessages[0].content 
              : session.lastMessage?.content;
              
            return (
              <div
                key={session.id}
                className={`flex items-center gap-3 p-4 hover:bg-accent/50 cursor-pointer transition-colors relative ${
                  currentSession?.id === session.id ? 'bg-accent' : ''
                }`}
                onClick={() => handleChatClick(session)}
                title={session.type === 'PRIVATE' 
                  ? t('privateChat') + ': ' + (sessionName || '')
                  : (session.type === 'AI' ? t('aiAssistant') : t('groupChat') + ': ' + (sessionName || ''))}
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
                      avatar && avatar !== '' ? (
                        <img 
                          src={avatar} 
                          alt={sessionName || t('privateChat')}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span>{sessionName?.charAt(0) || '?'}</span>
                      )
                    ) : (
                      <span>{sessionName?.charAt(0) || '?'}</span>
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
                      {sessionName}
                    </h3>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatChatTime(session.lastMessage?.created_at || session.matchedMessages?.[0]?.created_at)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <p className={`text-sm truncate ${session.unreadCount > 0 ? 'font-medium text-foreground' : 'text-muted-foreground'}`}>
                      {lastMessageContent
                        ? (session.lastMessage?.role === 'assistant' ? `🤖 ${lastMessageContent}` : lastMessageContent)
                        : t('noMessages')}
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
                  
                  {/* 如果是搜索结果，显示匹配消息数 */}
                  {searchQuery && session.matchedMessages && session.matchedMessages.length > 0 && (
                    <div className="mt-1 text-xs text-blue-500">
                      {session.matchedMessages.length} {t('search.matchesFound', { count: session.matchedMessages.length })}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          
          {/* 如果有搜索查询但没有结果 */}
          {searchQuery && filteredSessions.length === 0 && !isSearching && (
            <div className="p-4 text-center text-muted-foreground">
              {t('search.noResults')}
            </div>
          )}
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
