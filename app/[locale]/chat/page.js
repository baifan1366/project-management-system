'use client';

import { useState, useEffect, useRef } from 'react';
import { Send, Paperclip, Smile, Image, Gift, ChevronDown } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useChat } from '@/contexts/ChatContext';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import InviteUserPopover from '@/components/InviteUserPopover';

export default function ChatPage() {
  const t = useTranslations('Chat');
  const [message, setMessage] = useState('');
  const { currentSession, messages, sendMessage, fetchChatSessions } = useChat();
  const [currentUser, setCurrentUser] = useState(null);
  const [hasUnreadMessage, setHasUnreadMessage] = useState(false);
  const messagesEndRef = useRef(null);
  const chatContainerRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // 监听新消息，自动滚动到底部
  useEffect(() => {
    if (messages.length > 0) {
      const chatContainer = chatContainerRef.current;
      const isScrolledToBottom = chatContainer && 
        (chatContainer.scrollHeight - chatContainer.scrollTop - chatContainer.clientHeight < 100);
      
      if (isScrolledToBottom) {
        scrollToBottom();
      } else {
        setHasUnreadMessage(true);
      }
    }
  }, [messages]);

  // 监听滚动事件
  useEffect(() => {
    const chatContainer = chatContainerRef.current;
    if (!chatContainer) return;

    const handleScroll = () => {
      if (chatContainer.scrollHeight - chatContainer.scrollTop - chatContainer.clientHeight < 100) {
        setHasUnreadMessage(false);
      }
    };

    chatContainer.addEventListener('scroll', handleScroll);
    return () => chatContainer.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const getUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setCurrentUser(session.user);
      }
    };
    getUser();
  }, []);

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (message.trim() && currentSession) {
      sendMessage(currentSession.id, message);
      setMessage('');
    }
  };

  if (!currentSession) {
    return (
      <div className="flex flex-col h-screen items-center justify-center text-muted-foreground">
        <p>{t('selectChat')}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* 聊天头部 */}
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-medium overflow-hidden">
            {currentSession.type === 'PRIVATE' ? (
              currentSession.participants[0]?.avatar_url && currentSession.participants[0]?.avatar_url !== '' ? (
                <img 
                  src={currentSession.participants[0].avatar_url} 
                  alt={currentSession.participants[0].name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span>{currentSession.participants[0]?.name?.charAt(0) || '?'}</span>
              )
            ) : (
              <span>{currentSession.name?.charAt(0) || '?'}</span>
            )}
          </div>
          <div>
            <h2 className="text-base font-medium">
              {currentSession.type === 'PRIVATE'
                ? currentSession.participants[0]?.name
                : currentSession.name}
            </h2>
            <p className="text-sm text-muted-foreground">
              {currentSession.type === 'PRIVATE'
                ? currentSession.participants[0]?.email
                : `${currentSession.participantsCount || 0} ${t('members')}`}
            </p>
          </div>
        </div>
        {currentSession.type !== 'PRIVATE' && (
          <div className="flex items-center gap-2">
            <InviteUserPopover 
              sessionId={currentSession.id} 
              onInvite={() => {
                // 重新获取会话信息以更新成员数量
                fetchChatSessions();
              }} 
            />
          </div>
        )}
      </div>

      {/* 聊天内容区域 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 relative" ref={chatContainerRef}>
        {messages.map((msg) => {
          console.log(msg);
          
          const isMe = msg.user_id === currentUser?.id;
          return (
            <div
              key={msg.id}
              className={cn(
                "flex items-start gap-2 max-w-2xl",
                isMe ? "ml-auto flex-row-reverse" : ""
              )}
            >
              <div className={cn(
                "w-8 h-8 rounded-lg flex items-center justify-center text-white font-medium overflow-hidden",
                isMe ? "bg-green-600" : "bg-blue-600"
              )}>
                {msg.user?.avatar_url && msg.user?.avatar_url !== '' ? (
                  <img 
                    src={msg.user.avatar_url} 
                    alt={msg.user.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span>{msg.user?.name?.charAt(0) || '?'}</span>
                )}
              </div>
              <div>
                <div className={cn(
                  "flex items-baseline gap-2",
                  isMe ? "flex-row-reverse" : ""
                )}>
                  <span className="font-medium">{msg.user?.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(msg.created_at).toLocaleTimeString()}
                  </span>
                </div>
                <div className={cn(
                  "mt-1 rounded-lg p-3 text-sm",
                  isMe 
                    ? "bg-primary text-primary-foreground" 
                    : "bg-accent"
                )}>
                  {msg.content}
                </div>
                {msg.attachments?.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {msg.attachments.map((attachment) => (
                      <a
                        key={attachment.id}
                        href={attachment.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-sm text-blue-500 hover:underline"
                      >
                        <Paperclip className="h-4 w-4" />
                        {attachment.file_name}
                      </a>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
        
        {/* 未读消息提示 */}
        {hasUnreadMessage && (
          <button
            onClick={scrollToBottom}
            className="fixed bottom-20 left-1/2 transform -translate-x-1/2 bg-primary text-primary-foreground px-4 py-2 rounded-full shadow-lg hover:bg-primary/90 transition-all flex items-center gap-2"
          >
            <span>new message</span>
            <ChevronDown className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* 输入区域 */}
      <div className="p-4 border-t">
        <form onSubmit={handleSendMessage} className="flex items-end gap-2">
          <div className="flex-1 bg-accent rounded-lg">
            <div className="flex items-center px-3 py-1 gap-1">
              <button 
                type="button" 
                className="p-1 hover:bg-accent/50 rounded"
                title={t('attachFile')}
              >
                <Paperclip className="h-5 w-5 text-muted-foreground" />
              </button>
              <button 
                type="button" 
                className="p-1 hover:bg-accent/50 rounded"
                title={t('attachGift')}
              >
                <Gift className="h-5 w-5 text-muted-foreground" />
              </button>
              <button 
                type="button" 
                className="p-1 hover:bg-accent/50 rounded"
                title={t('attachImage')}
              >
                <Image className="h-5 w-5 text-muted-foreground" />
              </button>
            </div>
            <div className="px-3 pb-2">
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    if (message.trim() && currentSession) {
                      sendMessage(currentSession.id, message);
                      setMessage('');
                    }
                  }
                }}
                placeholder={t('inputPlaceholder')}
                className="w-full bg-transparent border-0 focus:ring-0 resize-none text-sm py-2 max-h-32"
                rows={1}
              />
            </div>
          </div>
          <div className="flex items-center gap-2 pb-2">
            <button 
              type="button" 
              className="p-2 hover:bg-accent rounded-lg"
              title={t('emoji')}
            >
              <Smile className="h-5 w-5 text-muted-foreground" />
            </button>
            <button 
              type="submit" 
              className="p-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50"
              disabled={!message.trim()}
              title={t('send')}
            >
              <Send className="h-5 w-5" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
