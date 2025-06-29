'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Search, MessageSquare, X, MoreVertical, Trash2, BellOff, BellRing, Users, User, ChevronDown } from 'lucide-react';
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
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { useConfirm } from '@/hooks/use-confirm';
import ExternalBadge from '@/components/users/ExternalBadge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { useSearchParams } from 'next/navigation';

function ChatLayout({ children }) {
  const t = useTranslations('Chat');
  const { formatLastSeen } = useLastSeen(); // 使用上次在线时间钩子
  const { formatChatTime } = useChatTime(); // 使用聊天时间钩子
  
  // Add useSearchParams hook to check for mode parameter
  const searchParams = useSearchParams();
  
  // Utility function to truncate text
  const truncateText = (text, maxLength) => {
    if (!text) return '';
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  };

  const { 
    currentUser, 
    usersStatus 
  } = useUserStatus();
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [sessionFilter, setSessionFilter] = useState('ALL'); // Add filter state
  // Add current search index tracking
  const [currentSearchIndex, setCurrentSearchIndex] = useState(0);
  // Add state to track matching messages within a session
  const [matchingMessages, setMatchingMessages] = useState([]);
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);
  const { confirm } = useConfirm();
  const { 
    sessions, 
    currentSession, 
    setCurrentSession, 
    chatMode,
    setChatMode,
    loading: chatLoading,
    fetchChatSessions,
    fetchMessages,
    setMessages,
    deleteChatSession
  } = useChat();
  
  // Notification mute state
  const [mutedSessions, setMutedSessions] = useState({});
  
  // Add state for hidden sessions
  const [hiddenSessions, setHiddenSessions] = useState({});
  
  // Add state to control showing all hidden sessions
  const [showAllHidden, setShowAllHidden] = useState(false);
  
  // Use relationship data from ChatContext directly instead of making API calls
  const { userRelationships } = useChat();
  
  // Calculate total unread count excluding muted sessions
  const totalUnreadCount = useMemo(() => {
    return sessions.reduce((total, session) => {
      // Skip muted sessions in the unread count
      if (mutedSessions[session.id]) {
        return total;
      }
      return total + (session.unreadCount || 0);
    }, 0);
  }, [sessions, mutedSessions]);
  
  // 使用动态元数据钩子
  useDynamicMetadata({
    unreadCount: totalUnreadCount,
    currentSession
  });

  // Check for mode parameter in URL and set chat mode accordingly
  useEffect(() => {
    const mode = searchParams.get('mode');
    if (mode === 'ai' && chatMode !== 'ai') {
      setChatMode('ai');
      setCurrentSession(null);
    } else if (!mode && chatMode === 'ai') {
      // If mode parameter is removed and we're still in AI mode, switch back to normal
      setChatMode('normal');
      setCurrentSession(null);
    }
  }, [searchParams, setChatMode, setCurrentSession, chatMode]);

  // 搜索聊天功能
  const handleSearch = async (query) => {
    if (!query.trim()) {
      setSearchResults([]);
      setMatchingMessages([]);
      setSelectedSearchSessionId(null);
      return;
    }

    setIsSearching(true);
    try {
      if (!currentUser) {
        setIsSearching(false);
        return;
      }
      
      // 获取用户参与的会话ID
      const { data: userSessions, error: sessionError } = await supabase
        .from('chat_participant')
        .select('session_id')
        .eq('user_id', currentUser.id);
        
      if (sessionError) {
        console.error('搜索聊天错误:', sessionError);
        setIsSearching(false);
        return;
      }
      
      const sessionIds = userSessions.map(s => s.session_id);
      
      // 获取会话信息 - 首先按名称搜索
      const { data: sessionsByName, error: sessionNameError } = await supabase
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
        .ilike('name', `%${query}%`);
      
      // 然后获取所有私聊会话
      const { data: privateChats, error: privateChatsError } = await supabase
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
        .eq('type', 'PRIVATE');
      
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
      
      const filteredMessageResults = messageResults || [];
      
      // 合并结果并去重
      const sessionData = [...(sessionsByName || [])];
      const sessionIdSet = new Set(sessionData.map(s => s.id));
      
      // 添加私聊会话，并检查对方用户名是否匹配搜索词
      if (privateChats) {
        for (const session of privateChats) {
          // 如果会话已经添加则跳过
          if (sessionIdSet.has(session.id)) continue;
          
                  // 检查私聊对方用户名是否匹配
        const otherUser = session.participants
          .filter(p => p.user && p.user.id && p.user.id !== currentUser?.id)
          .map(p => p.user)
          .filter(Boolean)[0];
            
          if (otherUser && otherUser.name.toLowerCase().includes(query.toLowerCase())) {
            sessionData.push(session);
            sessionIdSet.add(session.id);
          }
        }
      }
      
      // 添加包含匹配消息的会话
      if (filteredMessageResults.length > 0) {
        // 获取包含匹配消息的会话ID
        const messageSessionIds = [...new Set(filteredMessageResults.map(msg => msg.session_id))];
        
        // 如果会话不在结果中，获取会话详情
        const missingSessionIds = messageSessionIds.filter(id => !sessionIdSet.has(id));
        
        if (missingSessionIds.length > 0) {
          const { data: messageSessions } = await supabase
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
            .in('id', missingSessionIds);
            
          if (messageSessions) {
            sessionData.push(...messageSessions);
            messageSessions.forEach(s => sessionIdSet.add(s.id));
          }
        }
      }
      
      // 处理会话数据，为每个会话添加参与者信息和匹配的消息
      const processedSessions = sessionData.map(session => {
        // 过滤掉自己并处理可能的空值
        const filteredParticipants = session.participants
          .filter(p => p.user && p.user.id && p.user.id !== currentUser?.id)
          .map(p => p.user)
          .filter(Boolean);
          
        // 获取该会话中匹配的消息
        const matchedMessages = filteredMessageResults.filter(msg => msg.session_id === session.id);
        
        // 判断是否匹配
        let matches = false;
        if (session.type === 'PRIVATE' && filteredParticipants.length > 0) {
          // 私聊：检查用户名匹配
          matches = filteredParticipants[0].name.toLowerCase().includes(query.toLowerCase());
        } else {
          // 群聊：检查群名匹配
          matches = session.name?.toLowerCase().includes(query.toLowerCase());
        }
        
        return {
          ...session,
          participants: filteredParticipants,
          matchedMessages,
          matches
        };
      });
      
      // 过滤出有匹配的会话
      const filteredSessions = processedSessions.filter(
        session => session.matches || session.matchedMessages.length > 0
      );
        
      if (sessionNameError || privateChatsError) {
        console.error('获取会话信息错误:', sessionNameError || privateChatsError);
      }
      
      setSearchResults(filteredSessions);
      setCurrentSearchIndex(0);
      
      // 重置之前的搜索会话选择
      setSelectedSearchSessionId(null);
      
      // 自动选择第一个搜索结果（如果有）
      if (filteredSessions.length > 0) {
        const session = filteredSessions[0];
        setCurrentSession(session);
        setSelectedSearchSessionId(session.id);
        
        // 提取此会话的匹配消息
        if (session.matchedMessages && session.matchedMessages.length > 0) {
          setMatchingMessages(session.matchedMessages);
          setCurrentMessageIndex(0);
          
          // 延迟高亮第一条匹配消息
          setTimeout(() => {
            if (session.matchedMessages[0] && session.matchedMessages[0].id) {
              highlightMessage(session.matchedMessages[0].id);
            }
          }, 500);
        }
      }
      
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
        setCurrentSearchIndex(0);
      }
    }, 300);
    
    return () => clearTimeout(debounceTimeout);
  }, [searchQuery]);

  // Add state to track the currently selected chat from search
  const [selectedSearchSessionId, setSelectedSearchSessionId] = useState(null);

  // Update the handleChatClick function 
  const handleChatClick = (session) => {
    // Update chat mode if needed
    if (chatMode === 'ai' && session.type !== 'AI') {
      setChatMode('normal');
    } else if (chatMode === 'normal' && session.type === 'AI') {
      setChatMode('ai');
    }
    
    // Set current session
    setCurrentSession(session);
    
    // If searching and this is a different session than currently selected
    if (searchQuery && session.matchedMessages && session.matchedMessages.length > 0) {
      // Clear previous selection
      setSelectedSearchSessionId(null);
      
      // Set new selection with slight delay
      setTimeout(() => {
        setSelectedSearchSessionId(session.id);
        setMatchingMessages(session.matchedMessages);
        setCurrentMessageIndex(0);
        
        // Highlight the first matching message
        if (session.matchedMessages[0] && session.matchedMessages[0].id) {
          highlightMessage(session.matchedMessages[0].id);
        }
      }, 50);
    } else {
      // Not from search results, clear search selection
      setSelectedSearchSessionId(null);
      setMatchingMessages([]);
    }
  };

  // Update handleClearSearch to clear selected session
  const handleClearSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
    setCurrentSearchIndex(0);
    setMatchingMessages([]);
    setCurrentMessageIndex(0);
    setSelectedSearchSessionId(null);
  };

  // Add function to navigate through search results
  const navigateSearchResults = (direction) => {
    if (matchingMessages.length === 0) return;
    
    let newIndex;
    if (direction === 'next') {
      newIndex = (currentMessageIndex + 1) % matchingMessages.length;
    } else {
      newIndex = (currentMessageIndex - 1 + matchingMessages.length) % matchingMessages.length;
    }
    
    console.log('Navigating to message', newIndex + 1, 'of', matchingMessages.length);
    setCurrentMessageIndex(newIndex);
    
    // Make sure the current session is set as the selected search session
    if (currentSession) {
      setSelectedSearchSessionId(currentSession.id);
    }
    
    // Highlight the selected message
    if (matchingMessages[newIndex] && matchingMessages[newIndex].id) {
      highlightMessage(matchingMessages[newIndex].id);
    }
  };
  
  // Improved function to highlight a message
  const highlightMessage = (messageId) => {
    console.log('Attempting to highlight message ID:', messageId);
    
    // Try different possible message ID formats
    const possibleSelectors = [
      `#message-${messageId}`,
      `[data-message-id="${messageId}"]`,
      `[data-id="${messageId}"]`,
      `#msg-${messageId}`,
      `.message-item-${messageId}`,
      `.message-${messageId}`
    ];
    
    // Find the first selector that works
    let messageElement = null;
    for (const selector of possibleSelectors) {
      const element = document.querySelector(selector);
      if (element) {
        console.log('Found message element with selector:', selector);
        messageElement = element;
        break;
      }
    }
    
    // If we found the element, scroll to it and highlight it
    if (messageElement) {
      messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      
      // Remove any existing highlights first
      const highlighted = document.querySelectorAll('.message-highlight');
      highlighted.forEach(el => {
        el.classList.remove('bg-amber-100', 'dark:bg-amber-800/30', 'message-highlight');
        el.style.outline = '';
        el.style.outlineOffset = '';
      });
      
      // Add highlight effect
      messageElement.classList.add('bg-amber-100', 'dark:bg-amber-800/30', 'message-highlight');
      // Create a more visible temporary outline
      messageElement.style.outline = '2px solid rgba(245, 158, 11, 0.5)';
      messageElement.style.outlineOffset = '2px';
      
      // Remove highlight after delay
      setTimeout(() => {
        messageElement.classList.remove('bg-amber-100', 'dark:bg-amber-800/30', 'message-highlight');
        messageElement.style.outline = '';
        messageElement.style.outlineOffset = '';
      }, 2000);
    } else {
      console.log('Could not find message element with ID:', messageId);
      
      // If we couldn't find the specific message, at least highlight the chat
      const chatContainer = document.querySelector('.chat-messages-container');
      if (chatContainer) {
        chatContainer.scrollTop = 0; // Scroll to top of chat to make new messages visible
      }
    }
  };

  const toggleChatMode = () => {
    const newMode = chatMode === 'normal' ? 'ai' : 'normal';
    setChatMode(newMode);
    setCurrentSession(null);
    
    // Update the URL when switching modes
    const url = new URL(window.location.href);
    if (newMode === 'ai') {
      url.searchParams.set('mode', 'ai');
    } else {
      url.searchParams.delete('mode');
    }
    window.history.replaceState({}, '', url);
  };
  
  // 确保只有一个会话被选中
  useEffect(() => {
    if (selectedSearchSessionId && selectedSearchSessionId !== currentSession?.id) {
      // 如果当前会话ID和搜索选中的会话ID不同，重置搜索选择
      // 这种情况通常发生在用户手动点击不同的聊天
      if (currentSession) {
        setSelectedSearchSessionId(currentSession.id);
      }
    }
  }, [currentSession, selectedSearchSessionId]);

  // 更新处理搜索结果的函数，移除isCurrentSearchResult相关逻辑
  const filteredSessions = useMemo(() => {
    // 如果有搜索结果，使用搜索结果
    if (searchQuery.trim() && searchResults.length > 0) {
      const filteredResults = searchResults.filter(session => !hiddenSessions[session.id]);
      
      // Apply additional type filtering if not showing ALL
      if (sessionFilter !== 'ALL') {
        return filteredResults.filter(session => {
          if (sessionFilter === 'PRIVATE') return session.type === 'PRIVATE';
          if (sessionFilter === 'GROUP') return session.type === 'GROUP';
          if (sessionFilter === 'AI') return session.type === 'AI';
          return true;
        });
      }
      
      return filteredResults;
    }
    
    // 否则根据聊天模式显示不同类型的会话，并排除隐藏的会话
    let sessions_filtered = sessions
      .filter(session => 
        (chatMode === 'normal' ? session.type !== 'AI' : session.type === 'AI') && 
        !hiddenSessions[session.id]
      );
      
    // Apply additional type filtering if not in AI mode and not showing ALL
    if (chatMode === 'normal' && sessionFilter !== 'ALL') {
      sessions_filtered = sessions_filtered.filter(session => session.type === sessionFilter);
    }
    
    return sessions_filtered;
  }, [chatMode, sessions, searchQuery, searchResults, hiddenSessions, sessionFilter]);
  
  // Check if we have any visible sessions in current mode
  const hasVisibleSessions = useMemo(() => {
    return filteredSessions.length > 0;
  }, [filteredSessions]);

  // 渲染聊天会话项的骨架屏
  const ChatItemSkeleton = ({ index }) => (
    <div className="flex items-center gap-3 p-4 animate-pulse">
      <div className="relative flex-shrink-0">
        <Skeleton className="w-10 h-10 rounded-lg flex-shrink-0" />
        {/* Randomly show unread indicator or online status */}
        {index % 3 === 0 && (
          <div className="absolute -bottom-1 -right-1 w-3 h-3 rounded-full bg-muted-foreground/30"></div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline justify-between">
          <Skeleton className={`h-4 w-${index % 2 === 0 ? '1/3' : '1/2'} mb-1`} />
          <Skeleton className="h-3 w-12" />
        </div>
        <Skeleton className="h-3 w-full mt-1.5" />
        <div className="flex justify-between items-center mt-1.5">
          <Skeleton className="h-2 w-2/3" />
          {index % 4 === 0 && <Skeleton className="h-2 w-2 rounded-full" />}
        </div>
        {/* Show status line for some items */}
        {index % 2 === 1 && (
          <Skeleton className="h-2 w-16 mt-1.5" />
        )}
      </div>
      {/* Simulate action button on hover */}
      {index % 3 === 2 && (
        <Skeleton className="w-6 h-6 rounded-full" />
      )}
    </div>
  );

  // Load hidden sessions from user metadata on component mount
  useEffect(() => {
    const loadHiddenSessions = async () => {
      try {
        // Load from localStorage
        const savedHidden = JSON.parse(localStorage.getItem('hidden_sessions') || '{}');
        setHiddenSessions(savedHidden);
      } catch (error) {
        console.error('Error loading hidden sessions:', error);
      }
    };
    
    loadHiddenSessions();
  }, []);

  // Function to unhide a previously hidden session
  const handleUnhideSession = async (sessionId) => {
    try {
      // Remove the session from hidden sessions in state
      setHiddenSessions(prev => {
        const newState = { ...prev };
        delete newState[sessionId];
        return newState;
      });
      
      // Update localStorage
      try {
        const savedHidden = JSON.parse(localStorage.getItem('hidden_sessions') || '{}');
        delete savedHidden[sessionId];
        localStorage.setItem('hidden_sessions', JSON.stringify(savedHidden));
      } catch (error) {
        console.error('Error updating hidden sessions in localStorage:', error);
      }
      
      toast.success(t('chatUnhidden'));
      
      // Refresh sessions
      fetchChatSessions();
    } catch (error) {
      console.error('Error unhiding chat session:', error);
      toast.error(t('errors.unhideFailed'));
    }
  };

  // Function to delete chat session
  const handleDeleteSession = async (e, sessionId) => {
    e.stopPropagation();
    
    confirm({
      title: t('deleteChat'),
      description: t('deleteChatConfirm'),
      variant: 'destructive',
      confirmText: t('delete'),
      cancelText: t('cancel'),
      onConfirm: async () => {
        try {
          // Call the deleteChatSession function from the ChatContext
          const result = await deleteChatSession(sessionId);
          
          if (result.success) {
            // If this was the current session, it's already handled in deleteChatSession
            toast.success(t('chatDeleted'));
            
            // Refresh sessions
            fetchChatSessions();
          } else {
            // Updated error message
            toast.error(result.error === '无权操作' ? t('errors.deleteNotAllowed') : t('errors.deleteFailed'));
          }
        } catch (error) {
          console.error('Error deleting chat session:', error);
          toast.error(t('errors.deleteFailed'));
        }
      }
    });
  };
  
  // Load muted sessions from user metadata and localStorage on component mount
  useEffect(() => {
    const loadMutedSessions = async () => {
      try {
        // Load from localStorage
        const savedMutes = JSON.parse(localStorage.getItem('muted_sessions') || '{}');
        setMutedSessions(savedMutes);
      } catch (error) {
        console.error('Error loading muted sessions:', error);
      }
    };
    
    loadMutedSessions();
  }, []);

  // Function to toggle mute for a session
  const handleToggleMute = async (e, sessionId) => {
    e.stopPropagation();
    
    try {
      // Toggle mute status in state
      const newMuteStatus = !mutedSessions[sessionId];
      
      // Update local state
      setMutedSessions(prev => {
        const newState = { ...prev };
        newState[sessionId] = newMuteStatus;
        return newState;
      });
      
      // Save to localStorage
      try {
        localStorage.setItem('muted_sessions', JSON.stringify({
          ...JSON.parse(localStorage.getItem('muted_sessions') || '{}'),
          [sessionId]: newMuteStatus
        }));
      } catch (error) {
        console.error('Error saving muted sessions to localStorage:', error);
      }
      
      toast.success(newMuteStatus ? t('notificationsMuted') : t('notificationsEnabled'));
    } catch (error) {
      console.error('Error toggling mute:', error);
      toast.error(t('errors.muteFailed'));
    }
  };
  
  // Check if there are hidden sessions with new messages to show
  const hiddenSessionsWithMessages = useMemo(() => {
    return sessions
      .filter(session => 
        hiddenSessions[session.id] && 
        session.unreadCount > 0 &&
        // Only show hidden sessions that match the current mode
        (chatMode === 'normal' ? session.type !== 'AI' : session.type === 'AI')
      )
      .sort((a, b) => 
        new Date(b.lastMessage?.created_at || 0) - new Date(a.lastMessage?.created_at || 0)
      );
  }, [sessions, hiddenSessions, chatMode]);

  // Get all hidden sessions for the "Show All Hidden" section
  const allHiddenSessions = useMemo(() => {
    return sessions
      .filter(session => 
        hiddenSessions[session.id] &&
        // Only show hidden sessions that match the current mode
        (chatMode === 'normal' ? session.type !== 'AI' : session.type === 'AI')
      )
      .sort((a, b) => 
        new Date(b.lastMessage?.created_at || 0) - new Date(a.lastMessage?.created_at || 0)
      );
  }, [sessions, hiddenSessions, chatMode]);

  // Function to hide chat session
  const handleHideSession = async (e, sessionId) => {
    e.stopPropagation();
    
    confirm({
      title: t('hideChat'),
      description: t('hideChatConfirm'),
      confirmText: t('hide'),
      cancelText: t('cancel'),
      onConfirm: async () => {
        try {
          // Update hidden sessions in state
          setHiddenSessions(prev => ({
            ...prev,
            [sessionId]: true
          }));
          
          // Update localStorage
          try {
            const savedHidden = JSON.parse(localStorage.getItem('hidden_sessions') || '{}');
            savedHidden[sessionId] = true;
            localStorage.setItem('hidden_sessions', JSON.stringify(savedHidden));
          } catch (error) {
            console.error('Error saving hidden sessions to localStorage:', error);
          }
          
          // If this was the current session, clear it
          if (currentSession?.id === sessionId) {
            setCurrentSession(null);
          }
          
          // Update the sessions list in UI
          toast.success(t('chatHidden'));
          
          // Refresh sessions
          fetchChatSessions();
        } catch (error) {
          console.error('Error hiding chat session:', error);
          toast.error(t('errors.hideFailed'));
        }
      }
    });
  };

  // Add keyboard shortcut for searching
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (matchingMessages.length === 0) return;
      
      // Ignore if focus is on an input
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      
      // Down arrow for next result
      if (e.key === 'ArrowUp' && !e.ctrlKey && !e.shiftKey && !e.altKey && !e.metaKey) {
        e.preventDefault();
        console.log('Down arrow pressed, navigating to next message');
        navigateSearchResults('next');
      }
      
      // Up arrow for previous result
      if (e.key === 'ArrowDown' && !e.ctrlKey && !e.shiftKey && !e.altKey && !e.metaKey) {
        e.preventDefault();
        console.log('Up arrow pressed, navigating to previous message');
        navigateSearchResults('prev');
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [matchingMessages, currentMessageIndex, selectedSearchSessionId, currentSession]);

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
          {chatLoading ? (
            <div className="animate-pulse">
              <div className="relative">
                <Skeleton className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 rounded-full" />
                <Skeleton className="h-10 w-full rounded-md" />
              </div>
              <div className="mt-2 flex justify-center">
                <Skeleton className="h-4 w-24" />
              </div>
            </div>
          ) : (
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
          )}
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
          
          {/* Add search results navigation controls */}
          {searchQuery && matchingMessages.length > 0 && (
            <div className="mt-2 mb-4 flex justify-between items-center px-2 py-1 bg-accent/30 rounded-md relative">
              <span className="text-xs font-medium">
                {t('search.resultCount', { current: currentMessageIndex + 1, total: matchingMessages.length })}
              </span>
              <div className="flex space-x-1">
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('Next message clicked');
                    navigateSearchResults('next');
                  }}
                  className="p-2 rounded-md bg-primary hover:bg-primary/80 text-primary-foreground"
                  disabled={matchingMessages.length <= 1}
                  title={t('nextResult') + " (↓)"}
                  aria-label={t('nextResult')}
                >
                  <ChevronDown className="h-4 w-4 rotate-180" />
                </button>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('Previous message clicked');
                    navigateSearchResults('prev');
                  }}
                  className="p-2 rounded-md bg-primary hover:bg-primary/80 text-primary-foreground"
                  disabled={matchingMessages.length <= 1}
                  title={t('previousResult') + " (↑)"}
                  aria-label={t('previousResult')}
                >
                  <ChevronDown className="h-4 w-4" />
                </button>
              </div>
              
              {/* Keyboard shortcut hint */}
              <div className="absolute -bottom-6 right-0 pb-2 text-xs text-muted-foreground">
                {t('keyboardNavHint')}
              </div>
            </div>
          )}
          
          {/* Add filter buttons */}
          {!chatLoading && chatMode === 'normal' && (
            <div className="mt-3 flex gap-1 justify-between">
              <button
                onClick={() => setSessionFilter('ALL')}
                className={`px-2 py-1 text-xs rounded-md flex items-center gap-1 ${
                  sessionFilter === 'ALL' ? 'bg-primary text-primary-foreground' : 'bg-accent/50 text-muted-foreground hover:bg-accent'
                }`}
              >
                <MessageSquare size={12} />
                {t('allChats') || 'All'}
              </button>
              <button
                onClick={() => setSessionFilter('PRIVATE')}
                className={`px-2 py-1 text-xs rounded-md flex items-center gap-1 ${
                  sessionFilter === 'PRIVATE' ? 'bg-primary text-primary-foreground' : 'bg-accent/50 text-muted-foreground hover:bg-accent'
                }`}
              >
                <User size={12} />
                {t('privateChats') || 'Private'}
              </button>
              <button
                onClick={() => setSessionFilter('GROUP')}
                className={`px-2 py-1 text-xs rounded-md flex items-center gap-1 ${
                  sessionFilter === 'GROUP' ? 'bg-primary text-primary-foreground' : 'bg-accent/50 text-muted-foreground hover:bg-accent'
                }`}
              >
                <Users size={12} />
                {t('groupChats') || 'Group'}
              </button>
            </div>
          )}
        </div>

        {/* 聊天列表 */}
        <div className="flex-1 overflow-y-auto">
          {chatLoading ? (
            // 显示骨架屏
            Array(6).fill().map((_, index) => (
              <ChatItemSkeleton key={`chat-skeleton-${index}`} index={index} />
            ))
          ) : (
            <>
              {/* Show hidden sessions with new messages */}
              {hiddenSessionsWithMessages.length > 0 && (
                <div className="px-4 pt-3 pb-1">
                  <h3 className="text-sm font-semibold text-muted-foreground">
                    {chatMode === 'normal' 
                      ? (t('hiddenNormalChatsWithMessages') || 'Hidden chats with new messages')
                      : (t('hiddenAIChatsWithMessages') || 'Hidden AI chats with new messages')}
                  </h3>
                </div>
              )}
              
              {hiddenSessionsWithMessages.map((session) => {
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
                    key={`${session.id}-${new Date(session.created_at || 0).getTime()}`}
                    className={`flex items-center gap-3 p-3 hover:bg-accent/50 transition-colors relative group border-l-4 mx-2 my-1 rounded-md bg-accent/20 ${
                      session.type === 'AI' ? 'border-purple-500' : 'border-blue-500'
                    }`}
                  >
                    <div className="relative flex-shrink-0">
                      <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-medium overflow-hidden">
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
                      {session.unreadCount > 0 && !mutedSessions[session.id] && (
                        <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-red-500 rounded-full border-2 border-background flex items-center justify-center shadow-sm">
                          <span className="text-xs text-white font-bold">{session.unreadCount > 9 ? '9+' : session.unreadCount}</span>
                        </div>
                      )}
                    </div>
                                          <div className="flex-1 min-w-0">
                        <div className="flex items-baseline justify-between">
                          <div className="flex items-center gap-1">
                            <h3 className="font-medium truncate text-sm">
                              {truncateText(sessionName, 25)}
                            </h3>
                            {/* Display external badge for private chats */}
                            {(() => {
                              if (session.type === 'PRIVATE' && session.participants?.[0]?.id) {
                                const userId = session.participants[0].id;
                                const isExternal = userRelationships[userId]?.isExternal;
                                return isExternal && <ExternalBadge className="ml-1 py-0 px-1 text-[10px]" />;
                              }
                              return null;
                            })()}
                          </div>
                          <button
                            onClick={() => handleUnhideSession(session.id)}
                            className="text-xs bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 py-1 px-2 rounded-full"
                          >
                            {t('unhide')}
                          </button>
                        </div>
                      <p className="text-xs text-muted-foreground truncate">
                        {truncateText(session.lastMessage?.content || t('noRecentMessages'), 50)}
                      </p>
                    </div>
                  </div>
                );
              })}
              
              {/* Add section to show all hidden chats with toggle button */}
              {allHiddenSessions.length > 0 && (
                <div className="mt-2">
                  <div className="px-4 pt-2 pb-1 flex justify-between items-center">
                    <h3 className="text-sm font-semibold text-muted-foreground">
                      {chatMode === 'normal' 
                        ? (t('hiddenNormalChats') || 'Hidden Chats')
                        : (t('hiddenAIChats') || 'Hidden AI Chats')}
                      <span className="ml-1 text-xs">({allHiddenSessions.length})</span>
                    </h3>
                    <button 
                      onClick={() => setShowAllHidden(prev => !prev)}
                      className="text-xs text-muted-foreground hover:text-foreground"
                    >
                      {showAllHidden ? (t('hide') || 'Hide') : (t('show') || 'Show')}
                    </button>
                  </div>
                  
                  {showAllHidden && allHiddenSessions.map((session) => {
                    const sessionName = session.type === 'PRIVATE' 
                      ? session.participants[0]?.name
                      : session.name;
                      
                    const avatar = session.type === 'PRIVATE' 
                      ? session.participants[0]?.avatar_url 
                      : null;
                      
                    return (
                      <div
                        key={`${session.id}-${new Date(session.created_at || 0).getTime()}`}
                        className="flex items-center gap-3 p-3 hover:bg-accent/50 transition-colors relative group mx-2 my-1 rounded-md"
                      >
                        <div className="relative flex-shrink-0">
                          <div className="w-8 h-8 bg-muted rounded-lg flex items-center justify-center text-muted-foreground font-medium overflow-hidden">
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
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-baseline justify-between">
                            <div className="flex items-center gap-1">
                              <h3 className="font-medium truncate text-sm">
                                {truncateText(sessionName, 25)}
                              </h3>
                              {/* Display external badge for private chats */}
                              {(() => {
                                if (session.type === 'PRIVATE' && session.participants?.[0]?.id) {
                                  const userId = session.participants[0].id;
                                  const isExternal = userRelationships[userId]?.isExternal;
                                  return isExternal && <ExternalBadge className="ml-1 py-0 px-1 text-[10px]" />;
                                }
                                return null;
                              })()}
                            </div>
                            <button
                              onClick={() => handleUnhideSession(session.id)}
                              className="text-xs bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 py-1 px-2 rounded-full"
                            >
                              {t('unhide')}
                            </button>
                          </div>
                          <p className="text-xs text-muted-foreground truncate">
                            {truncateText(session.lastMessage?.content || t('noRecentMessages'), 50)}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              
              {(hiddenSessionsWithMessages.length > 0 || allHiddenSessions.length > 0) && filteredSessions.length > 0 && (
                <div className="px-4 py-1 mt-2">
                  <h3 className="text-sm font-semibold text-muted-foreground">{t('activeChats')}</h3>
                </div>
              )}
              
              {/* Show message when no active chats but hidden chats exist */}
              {!hasVisibleSessions && (hiddenSessionsWithMessages.length > 0 || (showAllHidden && allHiddenSessions.length > 0)) && (
                <div className="p-4 text-center text-muted-foreground">
                  <p>{t('noActiveChats') || 'No active chats'}</p>
                  <p className="text-sm mt-1">{t('allChatsHidden') || 'All chats are hidden'}</p>
                </div>
              )}
              
              {filteredSessions.map((session, idx) => {
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

                // Add selected chat styling 
                const isSelected = selectedSearchSessionId === session.id;
                  
                return (
                  <div
                    key={`${session.id}-${new Date(session.created_at || 0).getTime()}`}
                    className={`flex items-center gap-3 p-4 hover:bg-accent/50 cursor-pointer transition-colors relative group ${
                      currentSession?.id === session.id && !selectedSearchSessionId ? 'bg-accent' : ''
                    } ${isSelected ? 'bg-amber-100/50 dark:bg-amber-700/30 border-l-4 border-amber-500 pl-3 shadow-md ring-1 ring-amber-400/50' : ''}`}
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
                      {session.unreadCount > 0 && (session.type !== 'AI' ? !mutedSessions[session.id] : true) && (
                        <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-red-500 rounded-full border-2 border-background flex items-center justify-center shadow-sm"
                             title={t('unreadMessages', { count: session.unreadCount }) || `${session.unreadCount} 未读消息`}>
                          <span className="text-xs text-white font-bold">{session.unreadCount > 9 ? '9+' : session.unreadCount}</span>
                        </div>
                      )}
                      {session.type === 'PRIVATE' && !session.unreadCount && session.participants[0]?.is_online && (
                        <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-background"
                             title={t('online')}></div>
                      )}
                      {session.type !== 'AI' && mutedSessions[session.id] && (
                        <div className="absolute -top-1 -right-1 w-4 h-4 bg-muted text-muted-foreground rounded-full border border-background flex items-center justify-center"
                             title={t('notificationsMuted')}>
                          <BellOff className="w-3 h-3" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                                                <div className="flex items-baseline justify-between">
                            <div className="flex items-center gap-1">
                              <h3 className={`font-medium truncate ${session.unreadCount > 0 && !mutedSessions[session.id] ? 'text-foreground font-semibold' : ''}`}>
                                {truncateText(sessionName, 17)}
                              </h3>
                              {/* Display external badge for private chats */}
                              {(() => {
                                if (session.type === 'PRIVATE' && session.participants?.[0]?.id) {
                                  const userId = session.participants[0].id;
                                  const isExternal = userRelationships[userId]?.isExternal;
                                  return isExternal && <ExternalBadge className="ml-1 py-0 px-1 text-[10px]" />;
                                }
                                return null;
                              })()}
                            </div>
                            <span className="text-xs text-muted-foreground whitespace-nowrap">
                              {formatChatTime(session.lastMessage?.created_at || session.matchedMessages?.[0]?.created_at)}
                            </span>
                          </div>
                      <div className="flex items-center justify-between mt-1">
                        <p className={`text-sm truncate ${session.unreadCount > 0 && !mutedSessions[session.id] ? 'font-medium text-foreground' : 'text-muted-foreground'}`}>
                          {lastMessageContent
                              ? (session.lastMessage?.role === 'assistant' ? `🤖 ${truncateText(lastMessageContent, 40)}` : truncateText(lastMessageContent, 40))
                              : t('noRecentMessages')}
                        </p>
                        {session.unreadCount > 0 && !mutedSessions[session.id] && currentSession?.id !== session.id && (
                          <div className="ml-2 w-2 h-2 bg-blue-600 rounded-full flex-shrink-0"
                               title={t('unreadMessages', { count: session.unreadCount }) || `${session.unreadCount} 未读消息`}></div>
                        )}
                      </div>
                      {/* 在线状态指示器 */}
                      {session.type === 'PRIVATE' && (
                        <div className="mt-0.5">
                          {/* 使用usersStatus获取最新状态 */}
                          {(session.participants[0]?.id && usersStatus[session.participants[0].id]?.isOnline) || 
                           (session.participants[0]?.is_online) ? (
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
                    
                    {/* Add dropdown menu for each chat session */}
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <button className="p-1 rounded-sm hover:bg-accent text-muted-foreground hover:text-foreground">
                            <MoreVertical className="h-4 w-4" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          {/* Only show mute option for non-AI chats */}
                          {session.type !== 'AI' && (
                            <>
                              <DropdownMenuItem 
                                onClick={(e) => handleToggleMute(e, session.id)}
                                className="flex items-center gap-2 cursor-pointer"
                              >
                                {mutedSessions[session.id] ? (
                                  <>
                                    <BellRing className="h-4 w-4" />
                                    <span>{t('enableNotifications')}</span>
                                  </>
                                ) : (
                                  <>
                                    <BellOff className="h-4 w-4" />
                                    <span>{t('muteNotifications')}</span>
                                  </>
                                )}
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                            </>
                          )}
                          <DropdownMenuItem 
                            onClick={(e) => handleHideSession(e, session.id)}
                            className="flex items-center gap-2 cursor-pointer"
                          >
                            <X className="h-4 w-4" />
                            <span>{t('hideChat')}</span>
                          </DropdownMenuItem>
                          {/* Only show delete option if user is the chat creator */}
                          {session.created_by === currentUser?.id && (
                            <DropdownMenuItem 
                              onClick={(e) => handleDeleteSession(e, session.id)}
                              className="flex items-center gap-2 cursor-pointer text-destructive focus:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                              <span>{t('deleteChat')}</span>
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
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
              
              {/* 如果应用了过滤器但没有结果 */}
              {!searchQuery && filteredSessions.length === 0 && !chatLoading && sessionFilter !== 'ALL' && (
                <div className="p-4 text-center text-muted-foreground">
                  {t('noChatsOfType', {type: t(sessionFilter.toLowerCase() + 'Chats')}) || `No ${sessionFilter.toLowerCase()} chats found`}
                </div>
              )}
            </>
          )}
        </div>

        {/* 新建聊天按钮 */}
        <div className="p-4 border-t">
          {chatLoading ? (
            <div className="animate-pulse">
              <Skeleton className="h-10 w-full rounded-md" />
            </div>
          ) : (
            <NewChatPopover />
          )}
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
