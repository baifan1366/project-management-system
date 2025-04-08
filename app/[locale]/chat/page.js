'use client';

import { useState, useEffect, useRef } from 'react';
import { Send, Paperclip, Smile, Image as ImageIcon, Gift, ChevronDown, Bot, MessageSquare } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useChat } from '@/contexts/ChatContext';
import { useUserStatus } from '@/contexts/UserStatusContext';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import InviteUserPopover from '@/components/chat/InviteUserPopover';
import AIChatBot from '@/components/chat/AIChatBot';
import Image from 'next/image';
import PengyImage from '../../../public/pengy.webp';
import EmojiPicker from '@/components/chat/EmojiPicker';
import FileUploader from '@/components/chat/FileUploader';
import GoogleTranslator from '@/components/chat/GoogleTranslator';
import { useLastSeen } from '@/hooks/useLastSeen';
import { toast } from 'sonner';

export default function ChatPage() {
  const t = useTranslations('Chat');
  const { formatLastSeen } = useLastSeen();
  const [message, setMessage] = useState('');
  const { 
    currentSession, 
    messages, 
    sendMessage, 
    chatMode  // 从 context 中获取
  } = useChat();
  
  // 使用增强的UserStatusContext
  const { 
    currentUser: statusCurrentUser, 
    getUserStatus, 
    usersStatus 
  } = useUserStatus();
  
  const [currentUser, setCurrentUser] = useState(null);
  const messagesEndRef = useRef(null);
  const chatContainerRef = useRef(null);
  const [isPending, setIsPending] = useState(false);
  // 添加回复消息状态
  const [replyToMessage, setReplyToMessage] = useState(null);
  
  // 获取其他参与者ID
  const otherParticipantId = currentSession?.type === 'PRIVATE' ? currentSession?.participants?.[0]?.id : null;
  
  // 当对话变更时立即获取用户状态
  useEffect(() => {
    if (otherParticipantId) {
      getUserStatus(otherParticipantId);
    }
  }, [otherParticipantId, getUserStatus]);
  
  // 当页面可见性变化时刷新用户状态
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && otherParticipantId) {
        getUserStatus(otherParticipantId);
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [otherParticipantId, getUserStatus]);
  
  // 定期刷新用户状态（每60秒）
  useEffect(() => {
    if (!otherParticipantId) return;
    
    const intervalId = setInterval(() => {
      getUserStatus(otherParticipantId);
    }, 60000);
    
    return () => {
      clearInterval(intervalId);
    };
  }, [otherParticipantId, getUserStatus]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // 监听新消息，自动滚动到底部
  useEffect(() => {
    if (messages.length > 0) {
      scrollToBottom();
    }
  }, [messages]);

  useEffect(() => {
    const getUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setCurrentUser(session.user);
      }
    };
    getUser();
  }, []);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (message.trim() && currentSession) {
      try {
        await sendMessage(currentSession.id, message, replyToMessage?.id);
        setMessage('');
        setReplyToMessage(null); // 发送后清除回复状态
        
        // 发送消息后立即刷新对方状态
        if (otherParticipantId) {
          getUserStatus(otherParticipantId);
        }
      } catch (error) {
        console.error(t('errors.sendMessageFailed'), error);
      }
    }
  };

  // 回复消息处理函数
  const handleReplyMessage = (msg) => {
    setReplyToMessage(msg);
    // 聚焦输入框
    document.querySelector('textarea')?.focus();
  };
  
  // 取消回复
  const handleCancelReply = () => {
    setReplyToMessage(null);
  };

  // 处理emoji选择
  const handleEmojiSelect = (emojiData) => {
    const emoji = emojiData.emoji;
    setMessage(prev => prev + emoji);
  };

  // 处理文件上传完成
  const handleFileUploadComplete = async (uploadResults) => {
    setIsPending(true);
    try {
      // 确保用户已登录且会话ID存在
      if (!currentUser?.id || !currentSession?.id) {
        throw new Error(t('errors.userNotLoggedIn'));
      }

      toast.info(t('checkingPermission'));

      // 检查用户是否是会话参与者
      const { data: participant, error: participantError } = await supabase
        .from('chat_participant')
        .select('*')
        .eq('session_id', currentSession.id)
        .eq('user_id', currentUser.id)
        .single();

      if (participantError || !participant) {
        console.error(t('errors.checkPermissionFailed'), participantError);
        throw new Error(t('errors.notParticipant'));
      }

      // 先发送消息以获取message_id
      const { data: messageData, error: messageError } = await supabase
        .from('chat_message')
        .insert({
          session_id: currentSession.id,
          user_id: currentUser.id,
          content: message.trim() ? message : t('sentAttachment')
        })
        .select()
        .single();

      if (messageError) {
        console.error(t('errors.sendMessageFailed'), messageError);
        throw messageError;
      }

      // 关联附件到消息
      const attachmentsToInsert = uploadResults.map(item => ({
        message_id: messageData.id,
        file_url: item.file_url,
        file_name: item.file_name,
        uploaded_by: currentUser.id
      }));

      if (attachmentsToInsert.length > 0) {
        const { error: attachmentError } = await supabase
          .from('chat_attachment')
          .insert(attachmentsToInsert);

        if (attachmentError) {
          console.error(t('errors.addAttachmentFailed'), attachmentError);
          throw attachmentError;
        }
      }

      toast.success(t('attachmentAdded'));

      // 清空消息输入
      setMessage('');
      
      // 发送消息后立即刷新对方状态
      if (otherParticipantId) {
        getUserStatus(otherParticipantId);
      }
    } catch (error) {
      console.error(t('errors.uploadFailed'), error);
      toast.error(`${t('errors.uploadFailed')}: ${error.message || t('errors.unknown')}`);
    } finally {
      setIsPending(false);
    }
  };

  if (!currentSession && chatMode === 'normal') {
    return (
      <div className="flex flex-col h-screen items-center justify-center text-muted-foreground">
        <p>{t('selectChat')}</p>
      </div>
    );
  }

  // 获取其他参与者信息
  const otherParticipant = currentSession?.participants?.[0];
  // 获取实时状态
  const otherParticipantStatus = otherParticipantId ? usersStatus[otherParticipantId] : null;
  const sessionName = currentSession?.type === 'PRIVATE'
    ? otherParticipant?.name
    : currentSession?.name;
  const sessionAvatar = currentSession?.type === 'PRIVATE'
    ? otherParticipant?.avatar_url
    : null;
  const sessionEmail = currentSession?.type === 'PRIVATE'
    ? otherParticipant?.email
    : `${currentSession?.participantsCount || 0} ${t('members')}`;

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* 聊天头部 */}
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <div className="flex items-center gap-3">
          {chatMode === 'normal' ? (
            <>
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-medium overflow-hidden flex-shrink-0">
                {sessionAvatar ? (
                  <img 
                    src={sessionAvatar} 
                    alt={sessionName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span>{sessionName?.charAt(0) || '?'}</span>
                )}
              </div>
              <div>
                <h2 className="text-base font-medium">
                  {sessionName || t('unknownChat')}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {sessionEmail}
                </p>
                {/* 显示在线状态 - 使用实时更新的状态 */}
                {currentSession?.type === 'PRIVATE' && (
                  <p className="text-xs">
                    {otherParticipantStatus?.isOnline ? (
                      <span className="text-green-600">{t('online')}</span>
                    ) : (
                      <span className="text-muted-foreground">
                        {otherParticipantStatus?.lastSeen ? (
                          formatLastSeen(otherParticipantStatus.lastSeen)
                        ) : otherParticipant?.last_seen_at ? (
                          formatLastSeen(otherParticipant.last_seen_at)
                        ) : (
                          t('offline')
                        )}
                      </span>
                    )}
                  </p>
                )}
              </div>
            </>
          ) : (
            <>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center overflow-hidden flex-shrink-0">
                <div className="relative w-full h-full">
                  <Image 
                    src={PengyImage} 
                    alt="Project Manager Penguin" 
                    className="w-full h-full object-cover rounded-lg"
                  />
                </div>
              </div>
              <div>
                <h2 className="text-base font-medium">{t('aiAssistant')}</h2>
                <p className="text-sm text-muted-foreground">{t('poweredBy', { model: 'Qwen QwQ-32B' })}</p>
              </div>
            </>
          )}
        </div>
        <div className="flex items-center gap-2">
          {currentSession?.type !== 'PRIVATE' && chatMode === 'normal' && (
            <InviteUserPopover 
              sessionId={currentSession.id} 
              onInvite={() => {
                // 重新获取会话信息以更新成员数量
                fetchChatSessions();
              }} 
            />
          )}
        </div>
      </div>

      {/* 聊天内容区域 */}
      {chatMode === 'normal' ? (
        <>
          <div className="flex-1 overflow-y-auto p-4 space-y-4 relative" ref={chatContainerRef}>
            {/* 使用 Set 对象和 map 来去重消息 */}
            {(() => {
              // 使用消息ID创建一个去重的消息列表
              const uniqueMessages = [];
              const messageIds = new Set();
              
              for (const msg of messages) {
                if (!messageIds.has(msg.id)) {
                  messageIds.add(msg.id);
                  uniqueMessages.push(msg);
                }
              }
              
              return uniqueMessages.map((msg) => {    
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
                      "w-8 h-8 rounded-lg flex items-center justify-center text-white font-medium overflow-hidden flex-shrink-0",
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
                    <div className="min-w-0 max-w-full">
                      <div className={cn(
                        "flex items-baseline gap-2",
                        isMe ? "flex-row-reverse" : ""
                      )}>
                        <span className="font-medium truncate">{msg.user?.name}</span>
                        <span className="text-xs text-muted-foreground flex-shrink-0">
                          {new Date(msg.created_at).toLocaleTimeString()}
                        </span>
                      </div>
                      <div className={cn(
                        "mt-1 rounded-lg p-3 text-sm break-words group relative",
                        isMe 
                          ? "bg-primary text-primary-foreground" 
                          : "bg-accent"
                      )}>
                        {/* 如果是回复的消息，显示被回复的内容 */}
                        {msg.replied_message && (
                          <div className="mb-2 p-2 rounded bg-background/50 text-xs line-clamp-2 border-l-2 border-blue-400">
                            <p className="font-medium text-blue-600 dark:text-blue-400">
                              {t('replyTo')} {msg.replied_message.user?.name}:
                            </p>
                            <p className="text-muted-foreground truncate">
                              {msg.replied_message.content}
                            </p>
                          </div>
                        )}
                        <GoogleTranslator 
                          content={msg.content}
                          targetLang="en"
                        >
                          {msg.content}
                        </GoogleTranslator>
                        
                        {/* 消息操作菜单 */}
                        <div className="absolute top-3 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            className="p-1 rounded hover:bg-background/60 text-muted-foreground hover:text-foreground"
                            onClick={() => handleReplyMessage(msg)}
                            title={t('reply')}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="9 17 4 12 9 7"></polyline>
                              <path d="M20 18v-2a4 4 0 0 0-4-4H4"></path>
                            </svg>
                          </button>
                        </div>
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
              });
            })()}
            <div ref={messagesEndRef} />
          </div>

          {/* 输入区域 */}
          <div className="p-4 border-t">
            <form onSubmit={handleSendMessage} className="flex items-end gap-2">
              <div className="flex-1 bg-accent rounded-lg">
                {/* 回复消息提示栏 */}
                {replyToMessage && (
                  <div className="px-3 pt-2 flex items-center justify-between">
                    <div className="flex items-center text-sm">
                      <div className="w-1 h-4 bg-blue-500 rounded-full mr-2"></div>
                      <span className="text-muted-foreground mr-2">{t('replyTo')}</span>
                      <span className="font-medium truncate max-w-[150px]">{replyToMessage.user?.name}</span>
                    </div>
                    <button 
                      type="button"
                      onClick={handleCancelReply}
                      className="text-muted-foreground hover:text-foreground p-1 rounded-full"
                      title={t('cancelReply')}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                      </svg>
                    </button>
                  </div>
                )}
                <div className="flex items-center px-3 py-1 gap-1">
                  <FileUploader 
                    onUploadComplete={handleFileUploadComplete}
                    sessionId={currentSession.id}
                    userId={currentUser?.id}
                    buttonOnly={true}
                    isPending={isPending}
                    buttonClassName="p-1 hover:bg-accent/50 rounded"
                    title={t('attachFile')}
                  >
                    <Paperclip className="h-5 w-5 text-muted-foreground" />
                  </FileUploader>
                  <button 
                    type="button" 
                    className="p-1 hover:bg-accent/50 rounded"
                    title={t('attachGift')}
                  >
                    <Gift className="h-5 w-5 text-muted-foreground" />
                  </button>
                  <FileUploader 
                    onUploadComplete={handleFileUploadComplete}
                    sessionId={currentSession.id}
                    userId={currentUser?.id}
                    buttonOnly={true}
                    fileTypes="image/*"
                    isPending={isPending}
                    buttonClassName="p-1 hover:bg-accent/50 rounded"
                    title={t('attachImage')}
                  >
                    <ImageIcon className="h-5 w-5 text-muted-foreground" />
                  </FileUploader>
                </div>
                <div className="px-3 pb-2">
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage(e);
                      }
                    }}
                    placeholder={t('inputPlaceholder')}
                    className="w-full bg-transparent border-0 focus:ring-0 resize-none text-sm py-2 max-h-32"
                    rows={1}
                  />
                </div>
              </div>
              <div className="flex items-center gap-2 pb-2">
                <EmojiPicker
                  onEmojiSelect={handleEmojiSelect}
                  buttonClassName="p-2 hover:bg-accent rounded-lg"
                  buttonTitle={t('emoji')}
                  position="top"
                  isPending={isPending}
                />
                <button 
                  type="submit" 
                  className="p-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50"
                  disabled={!message.trim() || isPending}
                  title={t('send')}
                >
                  <Send className="h-5 w-5" />
                </button>
              </div>
            </form>
          </div>
        </>
      ) : (
        <div className="flex-1 flex">
          <AIChatBot />
        </div>
      )}
    </div>
  );
}
