'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';
import Image from 'next/image';
import PengyImage from '../public/pengy.webp';
import { useChat } from '@/contexts/ChatContext';
import { supabase } from '@/lib/supabase';

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
  const [currentUser, setCurrentUser] = useState(null);
  const chatContainerRef = useRef(null);
  // 添加展开状态管理
  const [expandedThoughts, setExpandedThoughts] = useState({});

  // 切换展开状态的函数
  const toggleThoughtExpansion = (messageIndex) => {
    setExpandedThoughts(prev => ({
      ...prev,
      [messageIndex]: !prev[messageIndex]
    }));
  };

  // 获取当前用户信息
  useEffect(() => {
    const fetchCurrentUser = async () => {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error) {
        console.error('获取当前用户失败:', error);
        return;
      }
      
      if (user) {
        // 获取用户详细信息
        const { data: userData, error: userError } = await supabase
          .from('user')
          .select('*')
          .eq('id', user.id)
          .single();
          
        if (userError) {
          console.error('获取用户详情失败:', userError);
          setCurrentUser(user);
        } else {
          setCurrentUser(userData);
        }
      }
    };
    
    fetchCurrentUser();
  }, []);

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
            user: msg.user // 包含用户信息
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
    
    // 添加用户消息
    const userMessage = {
      role: 'user',
      content: input.trim(),
      timestamp: new Date().toISOString(),
      user: currentUser || { name: t('user') } // 确保即使没有currentUser也有默认值
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);
    
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
      
      // 发送消息到AI获取响应
      const response = await sendMessageToAI(input.trim(), messages);
      
      // 添加AI回复
      const aiMessage = {
        role: 'assistant',
        content: response.content,
        timestamp: new Date().toISOString()
      };

      setMessages(prev => [...prev, aiMessage]);
      
      // 保存消息到数据库 - 确保使用正确的会话ID
      console.log('保存消息到会话:', currentSessionId);
      await saveAIChatMessage({...userMessage, session_id: currentSessionId});
      await saveAIChatMessage({...aiMessage, session_id: currentSessionId});
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

      // 调用我们的OpenAI API端点
      const response = await fetch('/api/ai-proxy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ messages: formattedMessages }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || '请求AI服务失败');
      }

      const data = await response.json();
      
      return {
        role: 'assistant',
        content: data.content
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
    
    // 可选：如果你希望此操作也触发自定义事件，可以添加以下代码
    // const clearEvent = new CustomEvent('ai-chat-clear');
    // window.dispatchEvent(clearEvent);
  };

  return (
    <div className="flex flex-col h-full w-full border rounded-lg overflow-hidden bg-background">
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
                {messages.map((msg, index) => {
                  // 检查是否是思考过程
                  const isThinking = msg.role === 'assistant' && msg.content.includes('</think>');
                  let displayContent = msg.content;
                  let thinkingContent = '';
                  
                  if (isThinking) {
                    const parts = msg.content.split('</think>');
                    thinkingContent = parts[0];
                    displayContent = parts[1] || '';
                  }

                  return (
                    <div key={index}>
                      {/* 思考过程显示 */}
                      {isThinking && thinkingContent && (
                        <div className="mb-4 px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg">
                          <div className="flex items-center gap-2 mb-2 text-gray-500 dark:text-gray-400">
                            <div className="w-3 h-3">
                              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
                                <path d="M12 3v3m0 12v3M3 12h3m12 0h3M5.636 5.636l2.122 2.122m8.484 8.484l2.122 2.122M5.636 18.364l2.122-2.122m8.484-8.484l2.122-2.122"></path>
                              </svg>
                            </div>
                            <span className="text-xs font-medium">{t('thinking')}</span>
                          </div>
                          <div className={cn(
                            "pl-5 text-xs text-gray-600 dark:text-gray-400 whitespace-pre-wrap transition-all duration-200",
                            !expandedThoughts[index] && "line-clamp-3"
                          )}>
                            {thinkingContent}
                          </div>
                          {thinkingContent.split('\n').length > 3 && (
                            <button
                              onClick={() => toggleThoughtExpansion(index)}
                              className="mt-1 text-xs text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 font-medium pl-5"
                            >
                              {expandedThoughts[index] ? t('showLess') : t('readMore')}
                            </button>
                          )}
                        </div>
                      )}
                      
                      {/* 消息内容 */}
                      <div
                        className={cn(
                          "flex items-start gap-2 max-w-2xl mb-4",
                          msg.role === 'user' ? "ml-auto flex-row-reverse" : ""
                        )}
                      >
                        <div className={cn(
                          "w-8 h-8 rounded-lg flex items-center justify-center text-white font-medium overflow-hidden flex-shrink-0",
                          msg.role === 'user' ? "bg-primary dark:bg-primary/90" : "bg-blue-600 dark:bg-blue-700"
                        )}>
                          {msg.role === 'user' ? (
                            msg.user?.avatar_url ? (
                              <img 
                                src={msg.user.avatar_url} 
                                alt={msg.user.name || t('user')}
                                className="w-full h-full object-cover"
                              />
                            ) : currentUser?.avatar_url ? (
                              <img 
                                src={currentUser.avatar_url} 
                                alt={currentUser.name || t('user')}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <span>{(msg.user?.name || currentUser?.name || t('user')).charAt(0)}</span>
                            )
                          ) : (
                            <PenguinIcon />
                          )}
                        </div>
                        <div className="min-w-0 max-w-full">
                          <div className={cn(
                            "flex items-baseline gap-2",
                            msg.role === 'user' ? "flex-row-reverse" : ""
                          )}>
                            <span className="font-medium truncate dark:text-gray-200">
                              {msg.role === 'user' ? (msg.user?.name || currentUser?.name || t('user')) : t('aiAssistant')}
                            </span>
                            <span className="text-xs text-muted-foreground dark:text-gray-400 flex-shrink-0">
                              {new Date(msg.timestamp).toLocaleTimeString()}
                            </span>
                          </div>
                          <div className={cn(
                            "mt-1 rounded-lg p-3 text-sm break-words",
                            msg.role === 'user' 
                              ? "bg-primary text-primary-foreground dark:bg-primary/90" 
                              : "bg-accent dark:bg-gray-800 dark:text-gray-200"
                          )}>
                            {displayContent}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
                {loading && (
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
            <div className="px-3 pb-2 pt-2">
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
            </div>
          </div>
          <div className="flex items-center gap-2">
            {messages.length > 0 && (
              <button
                type="button"
                onClick={clearChatHistory}
                className="p-2 hover:bg-accent rounded-lg text-muted-foreground"
                title={t('clearChat')}
                disabled={loading}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 6h18"></path>
                  <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                  <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                </svg>
              </button>
            )}
            <button 
              type="submit" 
              className="p-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50"
              disabled={!input.trim() || loading}
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