'use client';

import { useState, useRef, useEffect } from 'react';
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

// 移除原SVG组件，改用Image组件
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
        console.log('当前无选定会话，清空消息');
        setMessages([]);
        setAiSession(null);
        setIsInitialLoad(false);
        return;
      }
      
      // 确定要使用的AI会话 - 优先使用当前选择的会话
      let sessionToUse = null;
      
      if (currentSession && currentSession.type === 'AI') {
        console.log('使用当前选择的AI会话:', currentSession.id);
        sessionToUse = currentSession;
      } else {
        // 如果没有选择当前会话或当前会话不是AI类型，则查找AI类型的会话
        const currentAiSession = sessions.find(s => s.type === 'AI');
        if (currentAiSession) {
          console.log('使用找到的AI会话:', currentAiSession.id);
          sessionToUse = currentAiSession;
        } else {
          console.log('未找到AI会话');
        }
      }
      
      setAiSession(sessionToUse);
      
      if (sessionToUse) {
        console.log('正在加载会话ID为', sessionToUse.id, '的消息');
        
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
          console.log(`找到 ${data.length} 条消息记录`);
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
        console.log('无有效AI会话，显示空白对话');
        setMessages([]);
      }
      
      setIsInitialLoad(false);
    };
    
    if (chatMode === 'ai') {
      console.log('AI聊天模式激活，开始加载消息');
      loadAIChatMessages();
    }
  }, [chatMode, sessions, currentSession]);

  // 监听清空聊天事件
  useEffect(() => {
    const handleClearChat = () => {
      console.log('接收到清空AI聊天事件，正在清空会话和消息');
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!input.trim()) return;
    
    // 验证字数限制
    if (input.trim().length > 1000) {
      toast.error(t('errors.messageTooLong') || '消息过长（最多1000个字符）');
      return;
    }
    
    // 添加用户消息
    const userMessage = {
      role: 'user',
      content: input.trim(),
      timestamp: new Date().toISOString(),
      user: currentUser || { name: t('user') } // 确保即使没有currentUser也有默认值
    };
    
    // 立即显示用户消息
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);
    
    // 确保消息显示后再执行下一步操作
    // 强制React渲染更新
    await new Promise(resolve => setTimeout(resolve, 0));
    // 滚动到底部
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    
    try {
      // 首先检查是否需要创建新的AI会话
      let currentSessionId = null;
      
      // 无论是否有 aiSession，都强制创建新会话 - 确保点击 New Chat 后真正创建新会话
      if (!currentSession || !aiSession) {
        // 创建新的AI会话
        console.log('创建新的AI会话');
        try {
          // 使用 true 参数强制创建新会话，而不是复用现有会话
          const newSession = await createAIChatSession(true);
          if (newSession) {
            console.log('成功创建新的AI会话:', newSession.id);
            setAiSession(newSession);
            setCurrentSession(newSession); // 同时更新currentSession
            currentSessionId = newSession.id;
          } else {
            throw new Error('创建新会话失败');
          }
        } catch (error) {
          console.error('创建AI会话失败:', error);
          // 如果创建失败，终止消息发送
          setLoading(false);
          // 显示错误消息
          setMessages(prev => [...prev, {
            role: 'assistant',
            content: '创建新会话失败，请稍后再试',
            timestamp: new Date().toISOString()
          }]);
          return;
        }
      } else {
        // 使用现有会话
        console.log('使用现有AI会话:', aiSession.id);
        currentSessionId = aiSession.id;
      }
      
      // 发送消息到AI获取响应 - 现在用流式方式处理
      const response = await sendMessageToAI(input.trim(), messages);
      
      // 不需要再添加AI回复，因为在流式处理中已经添加了
      // 但我们需要保存到数据库
      const aiMessage = {
        role: 'assistant',
        content: response.content,
        timestamp: new Date().toISOString(),
        session_id: currentSessionId
      };
      
      // 保存消息到数据库
      console.log('保存消息到会话:', currentSessionId);
      await saveAIChatMessage({...userMessage, session_id: currentSessionId});
      await saveAIChatMessage(aiMessage);
    } catch (error) {
      console.error(t('aiResponseError'), error);
      // 添加错误消息
      const errorMessage = {
        role: 'assistant',
        content: t('errorMessage') || '发生错误，请稍后再试',
        timestamp: new Date().toISOString()
      };
      
      setMessages(prev => [...prev, errorMessage]);
      
      // 保存错误消息到数据库
      if (aiSession) {
        await saveAIChatMessage({...errorMessage, session_id: aiSession.id});
      } else {
        await saveAIChatMessage(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

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

  // 清除聊天记录
  const clearChatHistory = async () => {
    console.log('手动清空AI聊天历史');
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
        </div>
      </div>

      {/* 输入区域 */}
      <div className="p-4 border-t">
        <form onSubmit={handleSubmit} className="flex items-end gap-2">
          <div className="flex-1 bg-accent rounded-lg">
            <div className="px-3 pb-2 pt-2 relative">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit(e);
                  }
                }}
                placeholder={t('inputPlaceholder')}
                className="w-full bg-transparent border-0 focus:ring-0 resize-none text-sm py-2 max-h-32"
                rows={1}
                disabled={loading}
              />
              
              {/* 字符计数器 - 当接近限制时显示 */}
              {input.length > 700 && (
                <div className={`text-xs absolute bottom-2 right-3 ${
                  input.length > 1000 ? 'text-destructive font-medium' : 'text-muted-foreground'
                }`}>
                  {input.length}/1000
                </div>
              )}
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
      </div>
    </div>
  );
} 