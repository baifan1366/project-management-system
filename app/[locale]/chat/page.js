'use client';

import { useState, useEffect, useRef, createRef } from 'react';
import { Send, Paperclip, Smile, Image as ImageIcon, Gift, ChevronDown, Bot, MessageSquare, Reply, Trash2, Languages, MoreVertical, Search, Link, FileText, X } from 'lucide-react';
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
import { useUserTimezone } from '@/hooks/useUserTimezone';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { useConfirm } from '@/hooks/use-confirm';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem
} from '@/components/ui/dropdown-menu';
import ChatSearch from '@/components/chat/ChatSearch';
import useGetUser from '@/lib/hooks/useGetUser';
import MentionSelector from '@/components/chat/MentionSelector';
import MentionItem from '@/components/chat/MentionItem';

// Message skeleton component for loading state
const MessageSkeleton = ({ isOwnMessage = false }) => (
  <div className={cn(
    "flex items-start gap-2 max-w-2xl animate-pulse",
    isOwnMessage ? "ml-auto flex-row-reverse" : ""
  )}>
    <Skeleton className="w-8 h-8 rounded-lg flex-shrink-0" />
    <div className="min-w-0 max-w-full">
      <div className={cn(
        "flex items-baseline gap-2",
        isOwnMessage ? "flex-row-reverse" : ""
      )}>
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-3 w-12" />
      </div>
      <Skeleton className={cn(
        "mt-1 rounded-lg h-16 w-60",
        isOwnMessage ? "ml-auto" : ""
      )} />
    </div>
  </div>
);

// Header skeleton for loading state
const HeaderSkeleton = () => (
  <div className="flex items-center gap-3 animate-pulse">
    <Skeleton className="w-8 h-8 rounded-lg flex-shrink-0" />
    <div>
      <Skeleton className="h-5 w-32 mb-1" />
      <Skeleton className="h-3 w-24 mb-1" />
      <Skeleton className="h-2 w-16" />
    </div>
  </div>
);

export default function ChatPage() {
  const t = useTranslations('Chat');
  const { formatLastSeen } = useLastSeen();
  const { userTimezone, hourFormat, adjustTimeByOffset } = useUserTimezone();
  const [message, setMessage] = useState('');
  const { confirm } = useConfirm();
  const { 
    currentSession, 
    messages, 
    sendMessage, 
    chatMode,
    fetchChatSessions,
    loading: messagesLoading,
    fetchMessages,
    deleteMessage
  } = useChat();
  
  // 使用增强的UserStatusContext
  const { 
    currentUser, 
    getUserStatus, 
    usersStatus 
  } = useUserStatus();
 
  const messagesEndRef = useRef(null);
  const chatContainerRef = useRef(null);
  const [isPending, setIsPending] = useState(false);
  // 添加回复消息状态
  const [replyToMessage, setReplyToMessage] = useState(null);
  
  // Chat search state
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  
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

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (message.trim() && currentSession) {
      try {
        // Extract mentions from the message
        const extractedMentions = mentions.length > 0 ? mentions : extractMentionsFromMessage(message);
        
        // Send message with mentions
        await sendMessage(
          currentSession.id, 
          message, 
          replyToMessage?.id, 
          extractedMentions
        );
        
        setMessage('');
        setReplyToMessage(null); // 发送后清除回复状态
        setMentions([]); // Clear mentions after sending
        
        // 发送消息后立即刷新对方状态
        if (otherParticipantId) {
          getUserStatus(otherParticipantId);
        }
      } catch (error) {
        console.error(t('errors.sendMessageFailed'), error);
      }
    }
  };
  
  // Extract mentions from message text using regex patterns
  const extractMentionsFromMessage = (text) => {
    const mentions = [];
    const userPattern = /@([a-zA-Z0-9_.-]+)/g;
    const projectPattern = /#([a-zA-Z0-9_.-]+)/g;
    const taskPattern = /(.+) \((.+)\)/g;
    
    // Extract user mentions
    let match;
    while ((match = userPattern.exec(text)) !== null) {
      mentions.push({
        type: 'user',
        name: match[1],
        startIndex: match.index,
        endIndex: match.index + match[0].length
      });
    }
    
    // Extract project mentions
    while ((match = projectPattern.exec(text)) !== null) {
      mentions.push({
        type: 'project',
        name: match[1],
        startIndex: match.index,
        endIndex: match.index + match[0].length
      });
    }
    
    return mentions;
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
  const handleFileUploadComplete = async (uploadResults, messageContent) => {
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
          content: messageContent || t('sentAttachment')
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
        uploaded_by: currentUser.id,
        is_image: item.is_image || false // 添加图片标识
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
      
      // 立即获取该消息的完整信息（包括附件）并显示
      setTimeout(async () => {
        const { data: completeMessage, error: fetchError } = await supabase
          .from('chat_message')
          .select(`
            *,
            user:user_id (
              id,
              name,
              avatar_url,
              email
            ),
            attachments:chat_attachment (
              id,
              file_url,
              file_name,
              is_image
            ),
            replied_message:reply_to_message_id (
              id,
              content,
              user:user_id (
                id,
                name,
                avatar_url,
                email
              )
            )
          `)
          .eq('id', messageData.id)
          .single();
          
        if (fetchError) {
          console.error('获取完整消息数据失败:', fetchError);
        } else if (completeMessage) {
          // 使用聊天上下文的功能重新获取消息列表
          fetchMessages(currentSession.id);
        }
      }, 300); // 短暂延迟确保附件已处理完成
      
    } catch (error) {
      console.error(t('errors.uploadFailed'), error);
      toast.error(`${t('errors.uploadFailed')}: ${error.message || t('errors.unknown')}`);
    } finally {
      setIsPending(false);
    }
  };

  // 处理删除消息
  const handleDeleteMessage = async (messageId) => {
    confirm({
      title: t('confirmDelete'),
      description: t('confirmDeleteDesc'),
      variant: 'warning',
      confirmText: t('delete'),
      cancelText: t('cancel'),
      onConfirm: async () => {
        try {
          const result = await deleteMessage(messageId);
          if (result.success) {
            toast.success(t('messageDeleted'));
          } else {
            toast.error(t('errors.deleteFailed') + ': ' + (result.error?.message || t('errors.unknown')));
          }
        } catch (error) {
          console.error('Failed to delete message:', error);
          toast.error(t('errors.deleteFailed'));
        }
      }
    });
  };

  // 添加一个ref集合来存储每条消息的GoogleTranslator组件引用
  const translatorRefs = useRef({});
  // 跟踪哪些消息已被翻译
  const [translatedMessages, setTranslatedMessages] = useState({});
  
  // 添加处理翻译的函数
  const handleTranslateMessage = (msgId) => {
    const translatorRef = translatorRefs.current[`translator-${msgId}`];
    if (translatorRef && typeof translatorRef.translateText === 'function') {
      translatorRef.translateText();
      
      // 更新翻译状态
      setTranslatedMessages(prev => {
        const newState = { ...prev };
        newState[msgId] = !prev[msgId]; // 切换状态
        return newState;
      });
    }
  };

  // @mention state
  const [isMentionOpen, setIsMentionOpen] = useState(false);
  const [mentionSearchText, setMentionSearchText] = useState('');
  const [mentionPosition, setMentionPosition] = useState({ top: 0, left: 0 });
  const textareaRef = useRef(null);
  const [mentions, setMentions] = useState([]);

  // Process the input to check for @ mentions
  const handleInputChange = (e) => {
    const curValue = e.target.value;
    const cursorPosition = e.target.selectionStart;
    
    // Find if we're currently in a mention context (after an @ symbol)
    const textBeforeCursor = curValue.substring(0, cursorPosition);
    const mentionMatch = textBeforeCursor.match(/@(\S*)$/);
    
    if (mentionMatch) {
      // We found an @ symbol followed by some text
      const mentionText = mentionMatch[1];
      
      // Calculate position for the mention selector
      const textareaElement = textareaRef.current;
      if (textareaElement) {
        // Create a hidden div to calculate text position
        const hiddenDiv = document.createElement('div');
        hiddenDiv.style.position = 'absolute';
        hiddenDiv.style.top = '0';
        hiddenDiv.style.left = '0';
        hiddenDiv.style.visibility = 'hidden';
        hiddenDiv.style.whiteSpace = 'pre-wrap';
        hiddenDiv.style.width = `${textareaElement.clientWidth}px`;
        hiddenDiv.style.font = window.getComputedStyle(textareaElement).font;
        hiddenDiv.style.padding = window.getComputedStyle(textareaElement).padding;
        
        // Calculate the position of the @ symbol
        const atSymbolIndex = textBeforeCursor.lastIndexOf('@');
        const textBeforeAt = textBeforeCursor.substring(0, atSymbolIndex);
        
        hiddenDiv.textContent = textBeforeAt;
        document.body.appendChild(hiddenDiv);
        
        // Get position of cursor
        const rect = textareaElement.getBoundingClientRect();
        const textareaScrollTop = textareaElement.scrollTop;
        
        // Calculate line height
        const lineHeight = parseInt(window.getComputedStyle(textareaElement).lineHeight) || 18;
        
        // Count newlines before the @ symbol
        const newlines = (textBeforeAt.match(/\n/g) || []).length;
        
        // Calculate the position
        const left = rect.left + (hiddenDiv.clientWidth % textareaElement.clientWidth);
        
        // Get the cursor position relative to the viewport
        const cursorTop = rect.top + Math.floor(hiddenDiv.clientWidth / textareaElement.clientWidth) * lineHeight - textareaScrollTop;
        
        // Clean up
        document.body.removeChild(hiddenDiv);
        
        // Set position and open mention selector
        setMentionPosition({ 
          top: cursorTop, 
          left: left 
        });
        setMentionSearchText(mentionText);
        setIsMentionOpen(true);
      }
    } else {
      // Close the mention selector if no @ symbol is found
      setIsMentionOpen(false);
    }
  };

  // Handle selecting a mention from the dropdown
  const handleMentionSelect = (mention) => {
    // Get the current text and cursor position
    const curValue = message;
    const cursorPosition = textareaRef.current ? textareaRef.current.selectionStart : 0;
    
    // Find the position of the @ symbol before the cursor
    const textBeforeCursor = curValue.substring(0, cursorPosition);
    const atIndex = textBeforeCursor.lastIndexOf('@');
    
    if (atIndex !== -1) {
      // Replace the @text with the selected mention's displayText
      const newText = 
        curValue.substring(0, atIndex) + 
        mention.displayText + 
        ' ' + 
        curValue.substring(cursorPosition);
      
      setMessage(newText);
      
      // Add to mentions array for later processing
      setMentions(prev => [...prev, {
        ...mention,
        startIndex: atIndex,
        endIndex: atIndex + mention.displayText.length
      }]);
      
      // Close the mention selector
      setIsMentionOpen(false);
      
      // Focus back on textarea and position cursor after the inserted mention
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
          const newPosition = atIndex + mention.displayText.length + 1; // +1 for the space
          textareaRef.current.setSelectionRange(newPosition, newPosition);
        }
      }, 0);
    }
  };
  
  // Process message content to render mentions properly
  const formatMessageContent = (content) => {
    // Simple regex pattern to detect mentions for display
    const userPattern = /@([a-zA-Z0-9_.-]+)/g;
    const projectPattern = /#([a-zA-Z0-9_.-]+)/g;
    const taskPattern = /\[([^\]]+)\]/g;
    
    let formattedContent = content;
    
    // Replace user mentions
    formattedContent = formattedContent.replace(userPattern, (match, username) => {
      return `<span class="mention-user">@${username}</span>`;
    });
    
    // Replace project mentions
    formattedContent = formattedContent.replace(projectPattern, (match, projectName) => {
      return `<span class="mention-project">#${projectName}</span>`;
    });
    
    // Replace task mentions
    formattedContent = formattedContent.replace(taskPattern, (match, taskName) => {
      return `<span class="mention-task">${taskName}</span>`;
    });
    
    return formattedContent;
  };

  // Process message to display mentions with proper components
  const processMessageWithMentions = (content, msgMentions = null) => {
    if (!content) return '';
    
    // If we have stored mentions data, use it for better display
    if (msgMentions && Array.isArray(msgMentions) && msgMentions.length > 0) {
      // Sort mentions by startIndex in reverse order to replace from end to start
      // This ensures indices remain valid during replacement
      const sortedMentions = [...msgMentions].sort((a, b) => b.startIndex - a.startIndex);
      
      // Create an array of content pieces
      let contentPieces = [content];
      
      // Process each mention
      sortedMentions.forEach(mention => {
        const lastPiece = contentPieces.pop();
        
        // Split the content at the mention position
        const before = lastPiece.substring(0, mention.startIndex);
        const after = lastPiece.substring(mention.endIndex);
        
        // Create the appropriate mention component
        const mentionComponent = (
          <MentionItem 
            key={`${mention.type}-${mention.id || mention.name}`}
            type={mention.type}
            id={mention.id || mention.name}
            name={mention.name}
            projectName={mention.projectName}
          />
        );
        
        // Push the parts back into the content array
        contentPieces.push(before, mentionComponent, after);
      });
      
      return contentPieces;
    }
    
    // Fallback to regex-based parsing if no stored mentions data
    // Parse the message content to identify mentions
    // Format: @username for users, #project-name for projects, task title (project) for tasks
    
    // Pattern for user mentions: @username
    const userPattern = /@([a-zA-Z0-9_.-]+)/g;
    
    // Pattern for project mentions: #project-name
    const projectPattern = /#([a-zA-Z0-9_.-]+)/g;
    
    // Pattern for task mentions with the project in parentheses: TaskTitle (ProjectName)
    const taskPattern = /(.+) \((.+)\)/g;
    
    // Create a temporary div to hold the message with mention components
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = content.replace(/</g, '&lt;').replace(/>/g, '&gt;');
    
    // Process the message text
    const processedContent = tempDiv.textContent;
    
    // We'll use React's createElement to build our component structure
    const elements = [];
    let lastIndex = 0;
    
    // Helper function to add text segments
    const addTextSegment = (text, index) => {
      if (text) {
        elements.push(text);
      }
      lastIndex = index;
    };
    
    // Find user mentions
    processedContent.replace(userPattern, (match, username, index) => {
      // Add text before the mention
      addTextSegment(processedContent.substring(lastIndex, index), index);
      
      // Add the mention component
      elements.push(
        <MentionItem 
          key={`user-${index}`}
          type="user"
          id={username} // This is just a placeholder, we don't have the actual user ID
          name={username}
        />
      );
      
      lastIndex = index + match.length;
      return match; // This doesn't affect the output, just satisfies the replace function
    });
    
    // Find project mentions
    processedContent.replace(projectPattern, (match, projectName, index) => {
      // Check if this index is already processed (part of a user mention)
      if (index < lastIndex) return match;
      
      // Add text before the mention
      addTextSegment(processedContent.substring(lastIndex, index), index);
      
      // Add the mention component
      elements.push(
        <MentionItem 
          key={`project-${index}`}
          type="project"
          id={projectName} // This is just a placeholder
          name={projectName}
        />
      );
      
      lastIndex = index + match.length;
      return match;
    });
    
    // Add any remaining text
    if (lastIndex < processedContent.length) {
      elements.push(processedContent.substring(lastIndex));
    }
    
    return elements.length > 0 ? elements : processedContent;
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
        {messagesLoading ? (
          <HeaderSkeleton />
        ) : (
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
        )}
        <div className="flex items-center gap-2">
          {chatMode === 'normal' && (
            <button
              onClick={() => setIsSearchOpen(true)}
              className="p-2 rounded-full hover:bg-accent text-muted-foreground hover:text-foreground"
              title={t('searchChat')}
            >
              <Search className="h-5 w-5" />
            </button>
          )}
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

      {/* Use the ChatSearch component */}
      <ChatSearch 
        isOpen={isSearchOpen}
        onOpenChange={setIsSearchOpen}
        messages={messages}
        hourFormat={hourFormat}
        adjustTimeByOffset={adjustTimeByOffset}
      />
      
      {/* 聊天内容区域 */}
      {chatMode === 'normal' ? (
        <>
          <div className="flex-1 overflow-y-auto p-4 space-y-4 relative" ref={chatContainerRef}>
            {messagesLoading ? (
              // 骨架屏加载状态
              Array(5).fill().map((_, index) => (
                <MessageSkeleton 
                  key={`message-skeleton-${index}`}
                  isOwnMessage={index % 2 === 0}
                />
              ))
            ) : (
              // 正常消息显示
              (() => {
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
                  const isDeleted = msg.is_deleted;
                  
                  return (
                    <div
                      key={msg.id}
                      id={`message-${msg.id}`}
                      className={cn(
                        "flex items-start gap-2 max-w-2xl transition-colors duration-300",
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
                            {adjustTimeByOffset && new Date(msg.created_at) ? 
                              adjustTimeByOffset(new Date(msg.created_at)).toLocaleTimeString([], {
                                hour: '2-digit', 
                                minute: '2-digit',
                                hour12: hourFormat === '12h'
                              }) : 
                              new Date(msg.created_at).toLocaleTimeString()
                            }
                          </span>
                        </div>
                        <div className={cn(
                          "mt-1 rounded-lg p-3 text-sm break-words group relative",
                          isDeleted ? "bg-muted text-muted-foreground italic" : (
                            isMe 
                              ? "bg-primary text-primary-foreground" 
                              : "bg-accent"
                          )
                        )}>
                          {/* 如果是回复的消息，显示被回复的内容 */}
                          {msg.replied_message && !isDeleted && (
                            <div className="mb-2 p-2 rounded bg-background/50 text-xs line-clamp-2 border-l-2 border-blue-400">
                              <p className="font-medium text-blue-600 dark:text-blue-400">
                                {t('replyTo')} {msg.replied_message.user?.name}:
                              </p>
                              <p className="text-muted-foreground truncate">
                                {msg.replied_message.content}
                              </p>
                            </div>
                          )}
                          
                          {isDeleted ? (
                            <span className="pr-7">{t('messageWithdrawn')}</span>
                          ) : (
                            <div className="pr-7">
                              <GoogleTranslator 
                                content={msg.content}
                                targetLang="en"
                                showButton={false}
                                ref={ref => {
                                  // 存储组件引用，以便在下拉菜单中调用
                                  if (ref) translatorRefs.current[`translator-${msg.id}`] = ref;
                                }}
                              >
                                {processMessageWithMentions(msg.content, msg.mentions)}
                              </GoogleTranslator>
                            </div>
                          )}
                          
                          {/* 消息操作菜单 */}
                          {!isDeleted && (
                            <div className="absolute top-3 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <button className="p-1 rounded-sm hover:bg-background/60 text-muted-foreground hover:text-foreground">
                                    <MoreVertical className="h-4 w-4" />
                                  </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-48 bg-popover border border-border text-foreground dark:bg-gray-800">
                                  <DropdownMenuItem 
                                    onClick={() => handleReplyMessage(msg)}
                                    className="flex items-center gap-2 hover:cursor-pointer hover:bg-accent hover:text-accent-foreground dark:hover:bg-gray-900"
                                  >
                                    <Reply className="h-4 w-4" />
                                    <span>{t('reply')}</span>
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => handleTranslateMessage(msg.id)}
                                    className="flex items-center gap-2 hover:cursor-pointer hover:bg-accent hover:text-accent-foreground dark:hover:bg-gray-900"
                                  >
                                    <Languages className="h-4 w-4" />
                                    <span>{translatedMessages[msg.id] ? t('seeOriginal') : t('translate')}</span>
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => {
                                      // 复制消息内容功能
                                      navigator.clipboard.writeText(msg.content);
                                      toast.success(t('copiedToClipboard'));
                                    }}
                                    className="flex items-center gap-2 hover:cursor-pointer hover:bg-accent hover:text-accent-foreground dark:hover:bg-gray-900"
                                  >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                                      <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
                                      <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
                                    </svg>
                                    <span>{t('copy')}</span>
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator className="dark:bg-slate-700" />
                                  {isMe && (
                                    <DropdownMenuItem 
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeleteMessage(msg.id);
                                      }}
                                      className="flex items-center gap-2 hover:cursor-pointer hover:bg-accent hover:text-destructive dark:hover:bg-gray-900"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                      <span>{t('delete')}</span>
                                    </DropdownMenuItem>
                                  )}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          )}
                        </div>
                        {!isDeleted && msg.attachments?.length > 0 && (
                          <div className="mt-2 space-y-1">
                            {msg.attachments.map((attachment) => (
                              attachment.is_image ? (
                                <div key={attachment.id} className="mt-2">
                                  <img 
                                    src={attachment.file_url} 
                                    alt={attachment.file_name}
                                    className="max-h-80 rounded-lg object-cover cursor-pointer"
                                    onClick={() => window.open(attachment.file_url, '_blank')}
                                  />
                                </div>
                              ) : (
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
                              )
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                });
              })()
            )}
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
                <div className="px-3 p-1 relative">
                  <textarea
                    value={message}
                    onChange={(e) => {
                      setMessage(e.target.value);
                      handleInputChange(e);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage(e);
                      }
                      // 处理提及建议导航
                      if (isMentionOpen) {
                        if (e.key === 'ArrowDown') {
                          e.preventDefault();
                          // 处理向下箭头键（让MentionSelector内部处理）
                        } else if (e.key === 'ArrowUp') {
                          e.preventDefault();
                          // 处理向上箭头键（让MentionSelector内部处理）
                        } else if (e.key === 'Escape') {
                          e.preventDefault();
                          setIsMentionOpen(false);
                        }
                      }
                    }}
                    placeholder={t('inputPlaceholder')}
                    className="w-full bg-transparent border-0 focus:ring-0 resize-none text-sm p-2 max-h-60"
                    rows={1}
                    ref={textareaRef}
                  />
                  
                  {/* @提及选择器 */}
                  <MentionSelector
                    isOpen={isMentionOpen}
                    searchText={mentionSearchText}
                    onSelect={handleMentionSelect}
                    onClose={() => setIsMentionOpen(false)}
                    position={mentionPosition}
                  />
                </div>
              </div>
              <div className="flex items-center gap-2 pb-2">
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
