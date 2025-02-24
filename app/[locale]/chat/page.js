'use client';

import { useState, useEffect } from 'react';
import { Send, Paperclip, Smile, Image, Gift } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useChat } from '@/contexts/ChatContext';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';

export default function ChatPage() {
  const t = useTranslations('Chat');
  const [message, setMessage] = useState('');
  const { currentSession, messages, sendMessage } = useChat();
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    const getUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setCurrentUser(session.user);
      }
    };
    getUser();
  }, []);

  console.log('Current session in page:', currentSession);
  console.log('Messages in page:', messages);

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
      <div className="flex items-center px-4 py-3 border-b">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-medium">
            {currentSession.type === 'PRIVATE' 
              ? currentSession.participants[0]?.name?.charAt(0) || '?'
              : currentSession.name?.charAt(0) || '?'}
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
                : `${currentSession.participants?.length || 0} members`}
            </p>
          </div>
        </div>
      </div>

      {/* 聊天内容区域 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => {
          const isMe = msg.user_id === currentSession.participants[0]?.id;
          return (
            <div
              key={msg.id}
              className={cn(
                "flex items-start gap-2 max-w-2xl",
                isMe ? "ml-auto flex-row-reverse" : ""
              )}
            >
              <div className={cn(
                "w-8 h-8 rounded-lg flex items-center justify-center text-white font-medium",
                isMe ? "bg-green-600" : "bg-blue-600"
              )}>
                {msg.user?.name?.charAt(0) || '?'}
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
