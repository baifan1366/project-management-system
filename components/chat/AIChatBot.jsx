'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Loader2, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';
import Image from 'next/image';
import PengyImage from '../../public/pengy.webp';
import { useChat } from '@/contexts/ChatContext';
import { supabase } from '@/lib/supabase';
import ChatMessage from '@/components/ui/chat-message';
import useGetUser from '@/lib/hooks/useGetUser';
import { toast } from 'sonner';
import { useUserTimezone } from '@/hooks/useUserTimezone';
import ChatSearch from '@/components/chat/ChatSearch';
import { Skeleton } from '@/components/ui/skeleton';
import { getSubscriptionLimit, trackSubscriptionUsage } from '@/lib/subscriptionService';
import { useDispatch } from 'react-redux';
import { limitExceeded } from '@/lib/redux/features/subscriptionSlice';
import { debounce } from 'lodash';

const PenguinIcon = () => (
  <div className="relative w-full h-full flex items-center justify-center">
    <Image 
      src={PengyImage} 
      alt="Project Manager Penguin" 
      fill
      style={{ objectFit: 'cover' }}
      priority
    />
  </div>
);
// AI Chat Skeleton Loading Component
const AIChatSkeleton = () => (
  <div className="flex flex-col space-y-6 animate-pulse">
    {/* Initial greeting message skeleton */}
    <div className="flex items-start gap-2 max-w-2xl">
      <Skeleton className="w-8 h-8 rounded-lg flex-shrink-0" />
      <div className="flex flex-col gap-2">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-16 w-80 rounded-md" />
        <Skeleton className="h-12 w-60 rounded-md" />
      </div>
    </div>

    {/* User message skeleton */}
    <div className="flex items-start gap-2 max-w-2xl ml-auto flex-row-reverse">
      <Skeleton className="w-8 h-8 rounded-lg flex-shrink-0" />
      <Skeleton className="h-12 w-64 rounded-md" />
    </div>

    {/* Assistant response skeleton */}
    <div className="flex items-start gap-2 max-w-2xl">
      <Skeleton className="w-8 h-8 rounded-lg flex-shrink-0" />
      <div className="flex flex-col gap-2">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-10 w-72 rounded-md" />
        <Skeleton className="h-16 w-80 rounded-md" />
        <Skeleton className="h-10 w-48 rounded-md" />
      </div>
    </div>

    {/* User follow-up question skeleton */}
    <div className="flex items-start gap-2 max-w-2xl ml-auto flex-row-reverse">
      <Skeleton className="w-8 h-8 rounded-lg flex-shrink-0" />
      <Skeleton className="h-8 w-40 rounded-md" />
    </div>

    {/* Loading indicator */}
    <div className="flex items-start gap-2 max-w-2xl">
      <Skeleton className="w-8 h-8 rounded-lg flex-shrink-0" />
      <div className="flex items-center gap-2 mt-2">
        <Skeleton className="h-4 w-4 rounded-full" />
        <Skeleton className="h-4 w-24" />
      </div>
    </div>
  </div>
);

export default function AIChatBot() {
  const t = useTranslations('Chat');
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const { saveAIChatMessage, createAIChatSession, currentSession, setCurrentSession, chatMode, sessions } = useChat();
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [aiSession, setAiSession] = useState(null);
  const { user: currentUser } = useGetUser();
  const chatContainerRef = useRef(null);
  const { hourFormat, adjustTimeByOffset } = useUserTimezone();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const dispatch = useDispatch();

  // 自动滚动到底部
  useEffect(() => {
    if (messages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // 加载AI聊天记录
  useEffect(() => {
    const loadAIChatMessages = async () => {
      setIsInitialLoad(true);
      
      // 从会话切换或无会话时清空消息
      if (!currentSession) {
        
        setMessages([]);
        setAiSession(null);
        setIsInitialLoad(false);
        return;
      }
      
      // 确定要使用的AI会话 - 优先使用当前选择的会话
      let sessionToUse = null;
      
      if (currentSession && currentSession.type === 'AI') {
        
        sessionToUse = currentSession;
      } else {
        // 如果没有选择当前会话或当前会话不是AI类型，则查找AI类型的会话
        const currentAiSession = sessions.find(s => s.type === 'AI');
        if (currentAiSession) {
          
          sessionToUse = currentAiSession;
        } else {
          
        }
      }
      
      setAiSession(sessionToUse);
      
      if (sessionToUse) {
        
        
        // 从 ai_chat_message 表获取消息并关联用户信息
        const { data, error } = await supabase
          .from('ai_chat_message')
          .select(`*, user:user(*)`)
          .eq('session_id', sessionToUse.id)
          .order('timestamp', { ascending: true });

        if (error) {
          console.error('获取AI聊天记录失败:', error);
          setIsInitialLoad(false);
          return;
        }

        if (data && data.length > 0) {
          
          // 格式化消息，包含用户信息
          setMessages(data.map(msg => ({
            role: msg.role,
            content: msg.content,
            timestamp: msg.timestamp,
            user: msg.user, // 包含用户信息
            id: msg.id, // 添加id字段用于搜索功能
            created_at: msg.timestamp // 添加created_at字段用于搜索功能
          })));
        }
      } else {
        // 没有选中的AI会话，显示空白对话
        
        setMessages([]);
      }
      
      setIsInitialLoad(false);
    };
    
    if (chatMode === 'ai') {
      
      loadAIChatMessages();
    }
  }, [chatMode, sessions, currentSession]);

  // 监听清空聊天事件
  useEffect(() => {
    const handleClearChat = () => {
      
      setMessages([]);
      setAiSession(null);
      setIsInitialLoad(true); // 设置为初始加载状态，避免显示过渡动画
      
      // 强制更新 aiConversationId，确保下一次是全新对话
      if (typeof window !== 'undefined') {
        const resetEvent = new CustomEvent('reset-ai-conversation');
        window.dispatchEvent(resetEvent);
      }
      
      setTimeout(() => setIsInitialLoad(false), 100); // 短暂延迟后重置状态
    };
    
    // 添加事件监听器
    window.addEventListener('ai-chat-clear', handleClearChat);
    
    // 清理函数
    return () => {
      window.removeEventListener('ai-chat-clear', handleClearChat);
    };
  }, []);

  // 发送消息到AI
  const sendMessageToAI = async (userInput, messageHistory) => {
    try {
      // 格式化消息历史
      const formattedMessages = messageHistory.map(msg => ({
        role: msg.role,
        content: msg.content
      }));

      // 添加当前的用户消息
      formattedMessages.push({
        role: 'user',
        content: userInput
      });

      // 创建一个临时的AI消息对象，用于流式更新
      const tempAiMessage = {
        role: 'assistant',
        content: '',
        timestamp: new Date().toISOString(),
        isStreaming: true // 添加流式标记
      };
      
      // 先添加一个空消息，后续会更新它
      setMessages(prev => [...prev, tempAiMessage]);

      // 调用流式API端点
      const response = await fetch('/api/ai-proxy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          messages: formattedMessages,
          language: currentUser?.language || 'en' // 传递用户语言设置
        }),
      });

      if (!response.ok) {
        throw new Error('请求AI服务失败');
      }

      // 处理流式响应
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let accumulatedContent = '';

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          break;
        }
        
        // 解码收到的数据
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.substring(6));
              
              // 检查是否为最终消息
              if (data.content === "[DONE]") {
                // 使用完整内容更新消息，并移除流式标记
                if (data.fullContent) {
                  setMessages(prev => prev.map((msg, idx) => 
                    idx === prev.length - 1 ? { ...msg, content: data.fullContent, isStreaming: false } : msg
                  ));
                  accumulatedContent = data.fullContent;
                }
                break;
              }
              
              // 累加内容并更新消息
              if (data.content) {
                accumulatedContent += data.content;
                
                // 更新消息数组中的最后一条消息
                setMessages(prev => prev.map((msg, idx) => 
                  idx === prev.length - 1 ? { ...msg, content: accumulatedContent } : msg
                ));
                
                // 滚动到底部以跟随新内容
                messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
              }
            } catch (e) {
              console.error('解析流数据出错:', e);
            }
          }
        }
      }
      
      // 返回累积的完整内容
      return {
        role: 'assistant',
        content: accumulatedContent
      };
    } catch (error) {
      console.error(t('aiApiError'), error);
      throw error;
    }
  };

  // Modified handleSubmit to be memoized with useCallback for debouncing
  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    
    if (!input.trim() || !currentUser) return;
    
    // Check subscription limit
    const limitCheck = await getSubscriptionLimit(currentUser.id, 'ai_chat');
    if (!limitCheck.allowed) {
      dispatch(limitExceeded({
        actionType: 'ai_chat',
        limitInfo: limitCheck,
      }));
      return;
    }

    // Validate character limit
    if (input.trim().length > 1000) {
      toast.error(t('errors.messageTooLong'));
      return;
    }
    
    // Add user message
    const userMessage = {
      role: 'user',
      content: input.trim(),
      timestamp: new Date().toISOString(),
      user: currentUser || { name: t('user') }
    };
    
    // Immediately display user message
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);
    
    // Ensure message is displayed before proceeding
    await new Promise(resolve => setTimeout(resolve, 0));
    // Scroll to bottom
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    
    try {
      // Check if a new AI session needs to be created
      let currentSessionId = null;
      
      if (!currentSession || !aiSession) {
        try {
          const newSession = await createAIChatSession(true);
          if (newSession) {
            setAiSession(newSession);
            setCurrentSession(newSession);
            currentSessionId = newSession.id;
          } else {
            throw new Error('Failed to create new session');
          }
        } catch (error) {
          console.error('Failed to create AI session:', error);
          setLoading(false);
          setMessages(prev => [...prev, {
            role: 'assistant',
            content: 'Failed to create new session, please try again later',
            timestamp: new Date().toISOString()
          }]);
          return;
        }
      } else {
        currentSessionId = aiSession.id;
      }
      
      // Send message to AI to get response
      const response = await sendMessageToAI(input.trim(), messages);
      
      // Save to database
      const aiMessage = {
        role: 'assistant',
        content: response.content,
        timestamp: new Date().toISOString(),
        session_id: currentSessionId
      };
      
      await saveAIChatMessage({...userMessage, session_id: currentSessionId});
      await saveAIChatMessage(aiMessage);

      // Track subscription usage
      await trackSubscriptionUsage({
        userId: currentUser.id,
        actionType: 'ai_chat',
        entityType: 'aiChat',
        deltaValue: 1,
      });
    } catch (error) {
      console.error(t('aiResponseError'), error);
      const errorMessage = {
        role: 'assistant',
        content: t('errorMessage') || 'An error occurred, please try again later',
        timestamp: new Date().toISOString()
      };
      
      setMessages(prev => [...prev, errorMessage]);
      
      if (aiSession) {
        await saveAIChatMessage({...errorMessage, session_id: aiSession.id});
      } else {
        await saveAIChatMessage(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  }, [input, currentUser, messages, currentSession, aiSession, t, saveAIChatMessage, createAIChatSession, dispatch, setCurrentSession]);

  // Create a debounced version of the submit handler
  const debouncedSubmit = useCallback(
    debounce((e) => {
      handleSubmit(e);
    }, 500, { leading: true, trailing: false }),
    [handleSubmit]
  );

  // 清除聊天记录
  const clearChatHistory = async () => {
    
    setMessages([]);
    setAiSession(null);
    setCurrentSession(null);
  };

  return (
    <div className="flex flex-col h-full w-full border rounded-lg overflow-hidden bg-background">
      {/* 搜索按钮 - 放在右上角 */}
      {messages.length > 0 && (
        <div className="absolute top-4 right-4 z-10">
          <button
            onClick={() => setIsSearchOpen(true)}
            className="p-2 rounded-full hover:bg-accent text-muted-foreground hover:text-foreground bg-background/80"
            title={t('searchChat')}
          >
            <Search className="h-5 w-5" />
          </button>
        </div>
      )}

      {/* ChatSearch 组件 */}
      <ChatSearch 
        isOpen={isSearchOpen}
        onOpenChange={setIsSearchOpen}
        messages={messages}
        hourFormat={hourFormat}
        adjustTimeByOffset={adjustTimeByOffset}
      />
      
      {/* 聊天内容区域 */}
      <div className="flex-1 overflow-hidden relative">
        <div className="absolute inset-0 overflow-y-auto p-4" ref={chatContainerRef}>
          {isInitialLoad ? (
            // Show skeleton while initially loading
            <AIChatSkeleton />
          ) : (
            <div className="flex flex-col space-y-4 min-h-full">
              {messages.length === 0 && !loading ? (
                <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
                  <div className="relative text-blue-600 mb-2 w-16 h-16">
                    <Image 
                      src={PengyImage} 
                      alt="Project Manager Penguin"
                      width={64}
                      height={64}
                      style={{ objectFit: 'contain' }}
                      className="rounded-lg"
                      priority
                    />
                  </div>
                  <p className="text-lg font-medium mb-2">{t('welcomeTitle')}</p>
                  <p className="text-sm">{t('welcomeMessage')}</p>
                </div>
              ) : (
                <div className="flex flex-col space-y-4">
                  {messages.map((msg, index) => (
                    <ChatMessage 
                      key={index}
                      message={msg}
                      currentUser={currentUser}
                      t={t}
                      PenguinIcon={PenguinIcon}
                      hourFormat={hourFormat}
                      adjustTimeByOffset={adjustTimeByOffset}
                    />
                  ))}
                  
                  {/* 将loading状态指示器移除，因为现在使用isStreaming标记在每条消息内部显示 */}
                  {loading && !messages.some(msg => msg.isStreaming) && (
                    <div className="flex items-start gap-2 max-w-2xl">
                      <div className="w-8 h-8 bg-blue-600 dark:bg-blue-700 rounded-lg flex items-center justify-center text-white font-medium flex-shrink-0">
                        <PenguinIcon />
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <Loader2 className="h-4 w-4 animate-spin text-gray-500 dark:text-gray-400" />
                        <span className="text-sm text-muted-foreground dark:text-gray-400">{t('thinking')}</span>
                      </div>
                    </div>
                  )}
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
      </div>

      {/* 输入区域 */}
      <div className="p-4 border-t">
        {isInitialLoad ? (
          <div className="flex items-end gap-2 animate-pulse">
            <div className="flex-1 bg-accent rounded-lg p-3">
              <Skeleton className="h-8 w-full rounded-md" />
            </div>
            <div>
              <Skeleton className="w-10 h-10 rounded-lg" />
            </div>
          </div>
        ) : (
          <form onSubmit={debouncedSubmit} className="flex items-end gap-2">
            <div className="flex-1 bg-accent rounded-lg">
              <div className="px-3 pb-2 pt-2 relative">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      debouncedSubmit(e);
                    }
                  }}
                  placeholder={t('inputPlaceholder')}
                  className="w-full bg-transparent border-0 focus:ring-0 resize-none text-sm py-2 max-h-32"
                  rows={1}
                  disabled={loading}
                />
                
                {/* 字符计数器已移至表单下方 */}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button 
                type="submit" 
                className="p-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50"
                disabled={!input.trim() || loading || input.length > 1000}
                title={input.length > 1000 ? t('errors.messageTooLong') || '消息过长（最多1000个字符）' : t('send')}
              >
                {loading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Send className="h-5 w-5" />
                )}
              </button>
            </div>
          </form>
        )}
        
        {/* 字符计数器 - 当接近限制时显示 */}
        {!isInitialLoad && input.length > 700 && (
          <div className={`text-xs text-right mt-1 mr-2 ${
            input.length > 1000 ? 'text-destructive font-medium' : 'text-muted-foreground'
          }`}>
            {input.length}/1000
          </div>
        )}
      </div>
    </div>
  );
} 