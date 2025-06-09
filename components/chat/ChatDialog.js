'use client';

import { useState, useEffect, useRef, useCallback, memo, useMemo } from 'react';
import { X, Minus, Paperclip, Image, Smile, Send, Trash, Reply, Languages, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useChat } from '@/contexts/ChatContext';
import { supabase } from '@/lib/supabase';
import useGetUser from '@/lib/hooks/useGetUser';
import EmojiPicker from 'emoji-picker-react';
import FileUploader from '@/components/chat/FileUploader';

// Custom styles for text wrapping
const customStyles = {
  messageText: {
    overflowWrap: 'break-word',
    wordBreak: 'break-all',  // Force break on long words
    wordWrap: 'break-word',
    whiteSpace: 'pre-wrap',
    hyphens: 'auto',
    maxWidth: '100%',
    msWordBreak: 'break-all'
  },
  messageContainer: {
    width: '100%',
    maxWidth: '100%',
    overflowWrap: 'break-word'
  }
};

// Add CSS variables to root for global use
if (typeof document !== 'undefined') {
  document.documentElement.style.setProperty('--chat-message-max-width', 'calc(100% - 2rem)');
}

// Debounce function to limit how often a function is called
function debounce(func, wait) {
  let timeout;
  return function(...args) {
    const context = this;
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(context, args), wait);
  };
}

// Memoized ChatMessage component to prevent unnecessary re-renders
const ChatMessage = memo(({ 
  msg, 
  isMe, 
  currentUser, 
  handleReply, 
  handleTranslateMessage, 
  handleRemoveMessage 
}) => {
  return (
    <div 
      className={cn(
        "flex flex-col gap-1 max-w-full",
        isMe ? "items-end" : "items-start"
      )}
    >
      {/* Reply reference if exists */}
      {msg.reply_to_message && (
        <div className={cn(
          "max-w-[80%] text-xs bg-accent/50 p-1.5 rounded mb-1 break-words",
          isMe ? "mr-8" : "ml-8"
        )}>
          <span className="font-semibold">
            {msg.reply_to_message.user_id === currentUser?.id ? "You" : "Them"}:
          </span> {' '}
          {msg.reply_to_message.content}
        </div>
      )}
      
      <div 
        className={cn(
          "flex items-end gap-2 max-w-full",
          isMe ? "flex-row-reverse" : "flex-row"
        )}
      >
        {!isMe && (
          <div className="w-6 h-6 bg-blue-600 rounded-lg flex items-center justify-center text-white text-xs overflow-hidden flex-shrink-0">
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
          className="group relative max-w-[72%] min-w-0" 
          style={{
            ...customStyles.messageContainer,
            maxWidth: 'var(--chat-message-max-width, 72%)'
          }}
        >
          <div 
            className={cn(
              "rounded-lg p-2 text-sm px-3 break-words overflow-hidden w-full",
              isMe 
                ? "bg-primary text-primary-foreground" 
                : "bg-accent"
            )}
          >
            <span 
              className="whitespace-pre-wrap break-words overflow-wrap-anywhere word-break-all"
              style={customStyles.messageText}
            >
              {msg.content}
            </span>
            
            {/* Display attachments from chat_attachment table */}
            {msg.attachments && msg.attachments.length > 0 && (
              <div className="mt-2">
                {msg.attachments.map((attachment) => (
                  <div key={attachment.id} className="mt-1">
                    {attachment.is_image ? (
                      <img 
                        src={attachment.file_url} 
                        alt={attachment.file_name || "Image"}
                        className="max-w-full rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                        onClick={() => window.open(attachment.file_url, '_blank')}
                        loading="lazy"
                        onError={(e) => {
                          console.error("Failed to load image:", attachment.file_url);
                          e.target.onerror = null;
                          e.target.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Crect width='18' height='18' x='3' y='3' rx='2' ry='2'/%3E%3Ccircle cx='9' cy='9' r='2'/%3E%3Cpath d='m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21'/%3E%3C/svg%3E";
                          e.target.style.padding = "20px";
                          e.target.style.background = "#f0f0f0";
                        }}
                        style={{
                          maxHeight: "200px",
                          objectFit: "contain"
                        }}
                      />
                    ) : (
                      <a 
                        href={attachment.file_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-xs underline"
                      >
                        <Paperclip className="h-3 w-3" />
                        {attachment.file_name || "Attachment"}
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
            
            {/* Translated content if exists */}
            {msg.translatedContent && (
              <div className="mt-1 pt-1 border-t text-xs opacity-80">
                {msg.translatedContent}
              </div>
            )}
          </div>
          
          {/* Message actions */}
          <div className={cn(
            "absolute top-0 hidden group-hover:flex gap-1 p-1 bg-background/80 rounded-lg shadow-sm",
            isMe ? "left-0 transform -translate-x-full" : "right-0 transform translate-x-full"
          )}>
            <button 
              className="p-1 hover:bg-accent rounded-lg"
              onClick={() => handleReply(msg)}
              title="Reply"
            >
              <Reply className="h-3 w-3" />
            </button>
            <button 
              className="p-1 hover:bg-accent rounded-lg"
              onClick={() => handleTranslateMessage(msg.id, msg.content)}
              title="Translate"
            >
              <Languages className="h-3 w-3" />
            </button>
            {isMe && (
              <button 
                className="p-1 hover:bg-accent rounded-lg text-destructive"
                onClick={() => handleRemoveMessage(msg.id)}
                title="Delete"
              >
                <Trash className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>
        <span className="text-xs text-muted-foreground flex-shrink-0">
          {new Date(msg.created_at).toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit', 
            hour12: false 
          })}
        </span>
      </div>
    </div>
  );
});
ChatMessage.displayName = 'ChatMessage';

export default function ChatDialog({ 
  isOpen, 
  onClose,
  onMinimize,
  isMinimized,
  sessionId,
  user,
  sessionName,
  position = 0
}) {
  const [message, setMessage] = useState('');
  const [sessionMessages, setSessionMessages] = useState([]);
  const { sendMessage } = useChat();
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);
  const { user: currentUser } = useGetUser();
  const [replyTo, setReplyTo] = useState(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  // Calculate right position based on the position prop
  const dialogPosition = useMemo(() => {
    // Base position is 1rem (16px) from right edge
    // Each additional dialog will be positioned with a gap of 16px + dialog width (384px)
    const basePosition = 16; // 1rem = 16px
    const dialogWidth = 384; // w-96 = 24rem = 384px
    const gap = 16; // 1rem gap between dialogs
    
    return basePosition + (position * (dialogWidth + gap));
  }, [position]);

  // Handle responsive behavior for mobile and small screens
  const [isMobileView, setIsMobileView] = useState(false);
  
  // Add window resize listener for responsive behavior
  useEffect(() => {
    const checkMobileView = () => {
      setIsMobileView(window.innerWidth < 768); // 768px is the md breakpoint in Tailwind
    };

    // Initial check
    checkMobileView();

    // Add resize listener
    window.addEventListener('resize', checkMobileView);
    
    // Cleanup
    return () => window.removeEventListener('resize', checkMobileView);
  }, []);

  // Create a debounced version of the message setter
  const debouncedSetMessage = useCallback(
    debounce((value) => {
      setMessage(value);
    }, 50),
    []
  );
  
  // Handle message input change with debounce
  const handleMessageChange = useCallback((e) => {
    // For immediate UI feedback, we can directly set the input value
    // but use the debounced version for state updates
    e.persist(); // Keep the event around for the debounced function
    const value = e.target.value;
    
    // Use requestAnimationFrame to schedule the update in the next frame
    // This helps prevent blocking the main thread
    requestAnimationFrame(() => {
      // Update the input value directly for immediate feedback if ref is available
      if (textareaRef.current) {
        textareaRef.current.value = value;
      }
      // Use debounced version for state update
      debouncedSetMessage(value);
    });
  }, [debouncedSetMessage, textareaRef]);

  // Fetch session messages
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
          ),
          attachments:chat_attachment(
            id,
            file_url,
            file_name,
            file_type,
            is_image
          )
        `)
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching messages:', error);
        return;
      }

      // Fetch reply-to messages separately to avoid foreign key relationship issues
      if (data && data.length > 0) {
        const messageIds = data.filter(msg => msg.reply_to_message_id).map(msg => msg.reply_to_message_id);
        
        if (messageIds.length > 0) {
          const { data: replyMessages, error: replyError } = await supabase
            .from('chat_message')
            .select(`
              id,
              content,
              user_id,
              created_at,
              user:user_id (
                id,
                name,
                avatar_url,
                email
              )
            `)
            .in('id', messageIds);
            
          if (!replyError && replyMessages) {
            // Attach reply messages to their respective messages
            const messagesWithReplies = data.map(msg => {
              if (msg.reply_to_message_id) {
                const replyMsg = replyMessages.find(rm => rm.id === msg.reply_to_message_id);
                if (replyMsg) {
                  return {
                    ...msg,
                    reply_to_message: replyMsg
                  };
                }
              }
              return msg;
            });
            
            setSessionMessages(messagesWithReplies);
          } else {
            setSessionMessages(data);
          }
        } else {
          setSessionMessages(data);
        }
      } else {
        setSessionMessages(data || []);
      }
    };

    fetchMessages();

    // Subscribe to new messages - with specific filter for this session only
    const channel = supabase
      .channel(`chat_dialog_${sessionId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_message',
        filter: `session_id=eq.${sessionId}`
      }, async (payload) => {
        // Only process messages for this specific session
        if (payload.new.session_id !== sessionId) return;
        
        // Directly fetch message with user info
        const { data: messageData, error: messageError } = await supabase
          .from('chat_message')
          .select(`
            *,
            user:user_id (
              id,
              name,
              avatar_url,
              email
            ),
            attachments:chat_attachment(
              id,
              file_url,
              file_name,
              file_type,
              is_image
            )
          `)
          .eq('id', payload.new.id)
          .single();

        if (messageError) {
          console.error('Error fetching message:', messageError);
          return;
        }

        // If message has a reply_to_message_id, fetch the replied message
        if (messageData.reply_to_message_id) {
          const { data: replyMessage, error: replyError } = await supabase
            .from('chat_message')
            .select(`
              id,
              content,
              user_id,
              created_at,
              user:user_id (
                id,
                name,
                avatar_url,
                email
              )
            `)
            .eq('id', messageData.reply_to_message_id)
            .single();
            
          if (!replyError && replyMessage) {
            messageData.reply_to_message = replyMessage;
          }
        }

        setSessionMessages(prev => [...prev, messageData]);
      })
      .on('postgres_changes', {
        event: 'DELETE',
        schema: 'public',
        table: 'chat_message',
        filter: `session_id=eq.${sessionId}`
      }, (payload) => {
        setSessionMessages(prev => prev.filter(msg => msg.id !== payload.old.id));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId]);

  // Auto scroll to bottom
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messagesEndRef]);

  // Monitor new messages and minimized state changes
  useEffect(() => {
    if (!isMinimized && sessionMessages.length > 0) {
      // We need to add a small delay to ensure the component is fully rendered
      // before scrolling, which can improve performance
      setTimeout(() => {
        scrollToBottom();
      }, 0);
    }
  }, [sessionMessages, isMinimized, scrollToBottom]);

  // Initial load scroll to bottom
  useEffect(() => {
    if (!isOpen) return;
    if (!isMinimized) {
      // Use setTimeout to ensure component is rendered before scrolling
      setTimeout(() => {
        scrollToBottom();
      }, 0);
    }
  }, [isOpen, isMinimized, scrollToBottom]);

  // Function to optimize message list rendering
  // Only render messages that would be visible in the viewport plus a buffer
  const getOptimizedMessageList = useCallback(() => {
    // For small lists, render all messages
    if (sessionMessages.length < 50) {
      return sessionMessages;
    }
    
    // For larger lists, render only the most recent messages
    // This is a simple approach - a more sophisticated virtual list could be implemented
    return sessionMessages.slice(-50);
  }, [sessionMessages]);
  
  // Memoized optimized message list
  const optimizedMessageList = useMemo(() => {
    return getOptimizedMessageList();
  }, [getOptimizedMessageList]);

  const handleReply = useCallback((msg) => {
    setReplyTo(msg);
  }, []);

  const handleSendMessage = useCallback(async (e) => {
    e.preventDefault();
    if (!message.trim() || !sessionId) return;
    
    try {
      // 只发送文本消息，附件会通过FileUploader处理
      const sentMessage = await sendMessage(
        sessionId, 
        message, 
        replyTo?.id || null,  // Using the id of the message being replied to
        [] // Empty array for mentions
      );
      
      // Reset states after sending
      setMessage('');
      setReplyTo(null);
    } catch (error) {
      console.error('Error sending message:', error);
    }
  }, [message, sessionId, replyTo, sendMessage]);

  const handleSendMessageWithAttachments = useCallback(async (messageText, attachments) => {
    try {
      // 发送消息获取消息ID
      const sentMessage = await sendMessage(
        sessionId,
        messageText || 'Sent an attachment', // 如果没有消息文本，则使用默认文本
        replyTo?.id || null,
        [] // 空数组作为mentions参数
      );
      
      if (sentMessage && sentMessage.id) {
        // 为每个附件创建记录
        for (const attachment of attachments) {
          const { error: attachmentError } = await supabase
            .from('chat_attachment')
            .insert({
              message_id: sentMessage.id,
              file_url: attachment.file_url,
              file_name: attachment.file_name,
              file_type: attachment.file_type,
              is_image: attachment.is_image,
              uploaded_by: currentUser.id // Use currentUser.id from the useGetUser hook
            });
            
          if (attachmentError) {
            console.error('Error creating attachment record:', attachmentError);
          }
        }
      }
      
      // 重置状态
      setMessage('');
      setReplyTo(null);
    } catch (error) {
      console.error('Error sending message with attachments:', error);
    }
  }, [sessionId, replyTo, sendMessage]);

  const handleRemoveMessage = useCallback(async (messageId) => {
    if (!messageId) return;
    
    const { error } = await supabase
      .from('chat_message')
      .delete()
      .eq('id', messageId);
      
    if (error) {
      console.error('Error deleting message:', error);
    }
  }, []);

  const handleTranslateMessage = useCallback(async (messageId, content) => {
    // Example translation API call
    try {
      // This is a placeholder - you would use an actual translation service
      const translatedText = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: content, targetLang: 'en' }) // Default to English
      }).then(res => res.json());
      
      // Update message with translation
      setSessionMessages(prev => prev.map(msg => {
        if (msg.id === messageId) {
          return { ...msg, translatedContent: translatedText.translated };
        }
        return msg;
      }));
    } catch (error) {
      console.error('Translation error:', error);
    }
  }, []);

  const handleEmojiClick = useCallback((emojiData) => {
    setMessage(prev => prev + emojiData.emoji);
    setShowEmojiPicker(false);
  }, []);

  if (!isOpen) return null;

  return (
    <div 
      className={cn(
        "fixed bottom-0 bg-background rounded-t-lg shadow-lg flex flex-col transition-all duration-200",
        isMinimized ? "h-12" : "h-[520px]"
      )}
      style={{ 
        right: isMobileView ? '16px' : `${dialogPosition}px`,  // On mobile, always position at the right edge
        width: isMobileView ? 'calc(100% - 32px)' : '384px', // Full width on mobile with margin
        maxWidth: isMobileView ? '100%' : '384px',
        // On mobile with multiple dialogs open, stack them with slight offset
        bottom: isMobileView && position > 0 ? `${position * 10}px` : 0,
        zIndex: isMobileView ? 50 - position : 50 // Higher dialogs appear on top
      }}
    >
      {/* Dialog header */}
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
          <div className="flex flex-col overflow-hidden">
            <span className="font-medium text-sm truncate">{user.name}</span>
            {!isMinimized && sessionName && (
              <span className="text-xs text-muted-foreground truncate">{sessionName}</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button 
            className="p-1 hover:bg-accent rounded-lg" 
            onClick={onMinimize}
            title={isMinimized ? "Expand" : "Minimize"}
          >
            <Minus className="h-4 w-4" />
          </button>
          <button 
            className="p-1 hover:bg-accent rounded-lg" 
            onClick={onClose}
            title="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Only display messages and input area in non-minimized state */}
      {!isMinimized && (
        <>
          {/* Message area */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3 overflow-x-hidden">
            {optimizedMessageList.map((msg) => {
              const isMe = msg.user_id === currentUser?.id;
              return (
                <ChatMessage
                  key={msg.id}
                  msg={msg}
                  isMe={isMe}
                  currentUser={currentUser}
                  handleReply={handleReply}
                  handleTranslateMessage={handleTranslateMessage}
                  handleRemoveMessage={handleRemoveMessage}
                />
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Reply indicator */}
          {replyTo && (
            <div className="px-3 pt-2 flex items-center justify-between bg-accent/30 border-t">
              <div className="flex items-center gap-2 text-xs">
                <Reply className="h-3 w-3" />
                <span className="font-medium">
                  Replying to: <span className="text-primary">{replyTo.content.substring(0, 30)}{replyTo.content.length > 30 ? '...' : ''}</span>
                </span>
              </div>
              <button 
                className="p-1 hover:bg-accent rounded-full"
                onClick={() => setReplyTo(null)}
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          )}

          {/* Input area */}
          <div className="p-3 border-t relative">
            <form onSubmit={handleSendMessage} className="flex items-center gap-2 bg-accent/50 rounded-full px-3 py-2">
              <div className="flex-1 flex items-center">
                <textarea
                  ref={textareaRef}
                  value={message}
                  onChange={handleMessageChange}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage(e);
                    }
                  }}
                  placeholder="Type a message here..."
                  className="w-full bg-transparent border-0 focus:ring-0 resize-none text-sm py-1 max-h-32 placeholder:text-muted-foreground"
                  rows={1}
                />
              </div>
              <div className="flex items-center gap-2">
                <FileUploader
                  buttonOnly={true}
                  sessionId={sessionId}
                  userId={currentUser?.id}
                  onUploadComplete={(attachments, uploadMessage) => {
                    if (attachments && attachments.length > 0) {
                      const messageToSend = uploadMessage || message;
                      handleSendMessageWithAttachments(messageToSend, attachments);
                    }
                  }}
                  buttonClassName="p-2 hover:bg-accent/80 rounded-full"
                >
                  <Paperclip className="h-5 w-5 text-muted-foreground" />
                </FileUploader>
                <div className="relative">
                  <button 
                    type="button" 
                    className="p-2 hover:bg-accent/80 rounded-full"
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  >
                    <Smile className="h-5 w-5 text-muted-foreground" />
                  </button>
                  
                  {showEmojiPicker && (
                    <div className="absolute bottom-12 right-0 z-10">
                      <EmojiPicker
                        onEmojiClick={handleEmojiClick}
                        width={280}
                        height={350}
                      />
                    </div>
                  )}
                </div>
                <button 
                  type="submit" 
                  className="p-2 bg-primary text-primary-foreground rounded-full flex items-center justify-center hover:bg-primary/90 disabled:opacity-50"
                  disabled={!message.trim()}
                >
                  <Send className="h-5 w-5" />
                </button>
              </div>
            </form>
          </div>
        </>
      )}
    </div>
  );
} 