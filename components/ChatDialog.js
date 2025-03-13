'use client';

import { useState, useEffect, useRef } from 'react';
import { X, Minus, Paperclip, Image, Smile, Send } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useChat } from '@/contexts/ChatContext';
import { supabase } from '@/lib/supabase';

export default function ChatDialog({ 
  isOpen, 
  onClose,
  onMinimize,
  isMinimized,
  sessionId,
  user,
  sessionName
}) {
  const [message, setMessage] = useState('');
  const [sessionMessages, setSessionMessages] = useState([]);
  const { sendMessage } = useChat();
  const messagesEndRef = useRef(null);
  const [currentUser, setCurrentUser] = useState(null);

  // 获取当前用户
  useEffect(() => {
    const getUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setCurrentUser(session.user);
      }
    };
    getUser();
  }, []);

  // 获取会话消息
  useEffect(() => {
    const fetchMessages = async () => {
      const { data, error } = await supabase
        .from('chat_message')
        .select(`
          *,
          user:user_id (
            id,
            name,
            avatar_url,
            email
          )
        `)
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching messages:', error);
        return;
      }

      setSessionMessages(data);
    };

    fetchMessages();

    // 订阅新消息
    const channel = supabase
      .channel(`chat_${sessionId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_message',
        filter: `session_id=eq.${sessionId}`
      }, async (payload) => {
        // 直接获取包含用户信息的消息
        const { data: messageData, error: messageError } = await supabase
          .from('chat_message')
          .select(`
            *,
            user:user_id (
              id,
              name,
              avatar_url,
              email
            )
          `)
          .eq('id', payload.new.id)
          .single();

        if (messageError) {
          console.error('Error fetching message:', messageError);
          return;
        }

        setSessionMessages(prev => [...prev, messageData]);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId]);

  // 自动滚动到底部
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // 监听新消息和最小化状态变化
  useEffect(() => {
    if (!isMinimized && sessionMessages.length > 0) {
      scrollToBottom();
    }
  }, [sessionMessages, isMinimized]);

  // 初始加载时滚动到底部
  useEffect(() => {
    if (!isMinimized) {
      scrollToBottom();
    }
  }, [isOpen]);

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (message.trim() && sessionId) {
      sendMessage(sessionId, message);
      setMessage('');
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className={cn(
        "fixed bottom-0 right-4 w-80 bg-background rounded-t-lg shadow-lg flex flex-col transition-all duration-200",
        isMinimized ? "h-12" : "h-[480px]"
      )}
    >
      {/* 对话框头部 */}
      <div className="flex items-center justify-between p-2 border-b">
        <div className="flex items-center gap-2">
          <div className="relative">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-medium overflow-hidden">
              {user.avatar_url ? (
                <img 
                  src={user.avatar_url} 
                  alt={user.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span>{user.name?.charAt(0) || '?'}</span>
              )}
            </div>
            {user.online && (
              <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-background"></div>
            )}
          </div>
          <div className="flex flex-col">
            <span className="font-medium text-sm">{user.name}</span>
            {!isMinimized && sessionName && (
              <span className="text-xs text-muted-foreground">{sessionName}</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button 
            className="p-1 hover:bg-accent rounded-lg" 
            onClick={onMinimize}
            title={isMinimized ? "展开" : "最小化"}
          >
            <Minus className="h-4 w-4" />
          </button>
          <button 
            className="p-1 hover:bg-accent rounded-lg" 
            onClick={onClose}
            title="关闭"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* 只有在非最小化状态下才显示消息和输入区域 */}
      {!isMinimized && (
        <>
          {/* 消息区域 */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {sessionMessages.map((msg) => {
              const isMe = msg.user_id === currentUser?.id;
              return (
                <div 
                  key={msg.id} 
                  className={cn(
                    "flex items-end gap-2",
                    isMe ? "flex-row-reverse" : "flex-row"
                  )}
                >
                  {!isMe && (
                    <div className="w-6 h-6 bg-blue-600 rounded-lg flex items-center justify-center text-white text-xs overflow-hidden">
                      {msg.user?.avatar_url ? (
                        <img 
                          src={msg.user.avatar_url} 
                          alt={msg.user.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span>{msg.user?.name?.charAt(0) || '?'}</span>
                      )}
                    </div>
                  )}
                  <div 
                    className={cn(
                      "max-w-[70%] rounded-lg p-2 text-sm",
                      isMe 
                        ? "bg-primary text-primary-foreground" 
                        : "bg-accent"
                    )}
                  >
                    {msg.content}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {new Date(msg.created_at).toLocaleTimeString('en-US', { 
                      hour: '2-digit', 
                      minute: '2-digit', 
                      hour12: false 
                    })}
                  </span>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* 输入区域 */}
          <div className="p-3 border-t">
            <form onSubmit={handleSendMessage} className="flex items-end gap-2">
              <div className="flex-1 bg-accent rounded-lg">
                <div className="flex items-center px-2 py-1 gap-1">
                  <button type="button" className="p-1 hover:bg-accent/50 rounded">
                    <Paperclip className="h-4 w-4 text-muted-foreground" />
                  </button>
                  <button type="button" className="p-1 hover:bg-accent/50 rounded">
                    <Image className="h-4 w-4 text-muted-foreground" />
                  </button>
                </div>
                <div className="px-2 pb-1">
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage(e);
                      }
                    }}
                    placeholder="Aa"
                    className="w-full bg-transparent border-0 focus:ring-0 resize-none text-sm py-1 max-h-32"
                    rows={1}
                  />
                </div>
              </div>
              <div className="flex items-center gap-1 pb-1">
                <button type="button" className="p-1.5 hover:bg-accent rounded-lg">
                  <Smile className="h-4 w-4 text-muted-foreground" />
                </button>
                <button 
                  type="submit" 
                  className="p-1.5 text-primary disabled:opacity-50"
                  disabled={!message.trim()}
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </form>
          </div>
        </>
      )}
    </div>
  );
} 