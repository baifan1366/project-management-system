'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';
import Image from 'next/image';
import PengyImage from '../public/pengy.webp';

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

  // 自动滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!input.trim()) return;
    
    // 添加用户消息
    const userMessage = {
      role: 'user',
      content: input.trim()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);
    
    try {
      const response = await sendMessageToAI(input.trim(), messages);
      
      // 添加AI回复
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: response.content
      }]);
    } catch (error) {
      console.error(t('aiResponseError'), error);
      // 添加错误消息
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: t('errorMessage')
      }]);
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
                "w-8 h-8 rounded-lg flex items-center justify-center text-white font-medium overflow-hidden",
                msg.role === 'user' ? "bg-primary" : "bg-blue-600"
              )}>
                {msg.role === 'user' ? (
                  <span>{t('user')}</span>
                ) : (
                  <PenguinIcon />
                )}
              </div>
              <div>
                <div className={cn(
                  "mt-1 rounded-lg p-3 text-sm",
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
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-medium">
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
        </form>
      </div>
    </div>
  );
} 