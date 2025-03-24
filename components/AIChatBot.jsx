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
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
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
      
      setMessages([]); // 先清空消息，防止显示上一个会话的内容
      
      // 从数据库获取AI会话消息记录
      const { data: { session: authSession } } = await supabase.auth.getSession();
      if (!authSession) {
        console.log('当前用户未登录，无法加载消息');
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
        } else {
          console.log('该会话没有消息记录');
          // 没有消息或发生错误，显示空白对话
          setMessages([]);
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
      user: currentUser // 添加用户信息
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
      // 引入动态导入的InferenceClient以避免服务器端渲染问题
      const { InferenceClient } = await import('@huggingface/inference');
      const client = new InferenceClient("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");

      // 添加系统消息，描述AI是企鹅形象的专业项目经理
      const systemMessage = {
        role: 'system',
        content: "You are 'Project Manager Penguin', a professional project management assistant with a penguin persona. You specialize in project planning, task organization, team coordination, and agile methodologies. Your tone is friendly but professional, and you provide concise, practical advice. When discussing project management, use industry standard terminology and best practices. You occasionally use penguin-related metaphors and references to add personality to your responses."
      };

      const formattedMessages = [systemMessage, ...messageHistory.map(msg => ({
        role: msg.role,
        content: msg.content
      }))];

      // 添加当前的用户消息
      formattedMessages.push({
        role: 'user',
        content: userInput
      });

      const chatCompletion = await client.chatCompletion({
        model: "Qwen/QwQ-32B",
        messages: formattedMessages,
        provider: "hf-inference",
        max_tokens: 500,
      });

      return chatCompletion.choices[0].message;
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
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground p-4">
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
          messages.map((msg, index) => (
            <div
              key={index}
              className={cn(
                "flex items-start gap-2 max-w-2xl",
                msg.role === 'user' ? "ml-auto flex-row-reverse" : ""
              )}
            >
              <div className={cn(
                "w-8 h-8 rounded-lg flex items-center justify-center text-white font-medium overflow-hidden flex-shrink-0",
                msg.role === 'user' ? "bg-primary" : "bg-blue-600"
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
                  <span className="font-medium truncate">
                    {msg.role === 'user' ? (msg.user?.name || currentUser?.name || t('user')) : t('aiAssistant')}
                  </span>
                  <span className="text-xs text-muted-foreground flex-shrink-0">
                    {new Date(msg.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                <div className={cn(
                  "mt-1 rounded-lg p-3 text-sm break-words",
                  msg.role === 'user' 
                    ? "bg-primary text-primary-foreground" 
                    : "bg-accent"
                )}>
                  {msg.content}
                </div>
              </div>
            </div>
          ))
        )}
        {loading && (
          <div className="flex items-start gap-2 max-w-2xl">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-medium flex-shrink-0">
              <PenguinIcon />
            </div>
            <div className="flex items-center gap-2 mt-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm text-muted-foreground">{t('thinking')}</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
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