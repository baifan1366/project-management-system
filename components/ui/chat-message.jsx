import React from 'react';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';
import MarkdownRenderer from './markdown-renderer';
import ThinkingDisplay from './thinking-display';

export const ChatMessage = ({ 
  message, 
  currentUser, 
  t,
  PenguinIcon 
}) => {
  // 检查是否是思考过程
  const isThinking = message.role === 'assistant' && message.content.includes('</think>');
  let displayContent = message.content;
  let thinkingContent = '';
  
  if (isThinking) {
    const parts = message.content.split('</think>');
    thinkingContent = parts[0];
    displayContent = parts[1] || '';
  }

  return (
    <div>
      {/* 思考过程显示 */}
      {isThinking && thinkingContent && (
        <ThinkingDisplay content={thinkingContent} t={t} />
      )}
      
      {/* 消息内容 */}
      <div
        className={cn(
          "flex items-start gap-2 max-w-2xl mb-4",
          message.role === 'user' ? "ml-auto flex-row-reverse" : ""
        )}
      >
        <div className={cn(
          "w-8 h-8 rounded-lg flex items-center justify-center text-white font-medium overflow-hidden flex-shrink-0",
          message.role === 'user' ? "bg-primary dark:bg-primary/90" : "bg-blue-600 dark:bg-blue-700"
        )}>
          {message.role === 'user' ? (
            message.user?.avatar_url ? (
              <img 
                src={message.user.avatar_url} 
                alt={message.user.name || t('user')}
                className="w-full h-full object-cover"
              />
            ) : currentUser?.avatar_url ? (
              <img 
                src={currentUser.avatar_url} 
                alt={currentUser.name || t('user')}
                className="w-full h-full object-cover"
              />
            ) : (
              <span>{(message.user?.name || currentUser?.name || t('user')).charAt(0)}</span>
            )
          ) : (
            <PenguinIcon />
          )}
        </div>
        <div className="min-w-0 max-w-full">
          <div className={cn(
            "flex items-baseline gap-2",
            message.role === 'user' ? "flex-row-reverse" : ""
          )}>
            <span className="font-medium truncate dark:text-gray-200">
              {message.role === 'user' ? (message.user?.name || currentUser?.name || t('user')) : t('aiAssistant')}
            </span>
            <span className="text-xs text-muted-foreground dark:text-gray-400 flex-shrink-0">
              {new Date(message.timestamp).toLocaleTimeString()}
            </span>
          </div>
          <div className={cn(
            "mt-1 rounded-lg p-3 text-sm break-words",
            message.role === 'user' 
              ? "bg-primary text-primary-foreground dark:bg-primary/90" 
              : "bg-accent dark:bg-gray-800 dark:text-gray-200"
          )}>
            {message.role === 'assistant' ? (
              <MarkdownRenderer content={displayContent} />
            ) : (
              displayContent
            )}
          </div>
          
          {/* 对于流式显示的消息，在消息底部显示thinking指示器 */}
          {message.isStreaming && (
            <div className="flex items-center gap-2 mt-2 text-gray-500 dark:text-gray-400">
              <Loader2 className="h-3 w-3 animate-spin" />
              <span className="text-xs">{t('thinking')}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatMessage; 