'use client';

import { createContext, useContext, useState, useEffect, useId} from 'react';
import { supabase } from '@/lib/supabase';
import useGetUser from '@/lib/hooks/useGetUser';

const ChatContext = createContext();

export function ChatProvider({ children }) {
  const [sessions, setSessions] = useState([]);
  const [currentSession, setCurrentSession] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  // 添加已发送消息ID集合，用于防止重复
  const [sentMessageIds] = useState(new Set());
  // 生成基础ID
  const baseId = useId();
  // 当前AI对话ID
  const [aiConversationId, setAiConversationId] = useState(null);
  const [chatMode, setChatMode] = useState('normal');
  const { user:authSession, isLoading: authLoading } = useGetUser();
  // Add storage for user relationships to avoid repeated API calls
  const [userRelationships, setUserRelationships] = useState({});

  // Add useEffect to handle the case where authentication is taking too long
  useEffect(() => {
    // If auth is still loading after 5 seconds, set chat loading to false
    const timeoutId = setTimeout(() => {
      if (loading) {
        setLoading(false);
      }
    }, 5000);
    
    // If authSession is null and auth loading is complete, set loading to false
    if (!authLoading && !authSession) {
      setLoading(false);
    }
    
    return () => clearTimeout(timeoutId);
  }, [authSession, authLoading, loading]);

  // 处理头像URL，移除token
  const processAvatarUrl = (user) => {
    if (!user) return user;
    let avatarUrl = user.avatar_url;
    if (avatarUrl?.includes('googleusercontent.com')) {
      avatarUrl = avatarUrl.split('=')[0];
      return { ...user, avatar_url: avatarUrl };
    }
    return user;
  };

  // 每次开始新的AI聊天时生成新的会话ID
  useEffect(() => {
    if(chatMode == 'normal' ) return;
    if (!aiConversationId) {
      // 使用useId生成的基础ID加上时间戳和随机数
      const newConversationId = `${baseId.replace(/:/g, '')}_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
      setAiConversationId(newConversationId);
    }
    
    // 监听重置会话ID事件
    const handleResetConversation = () => {
      const newConversationId = `${baseId.replace(/:/g, '')}_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
      setAiConversationId(newConversationId);
    };
    
    window.addEventListener('reset-ai-conversation', handleResetConversation);
    
    return () => {
      window.removeEventListener('reset-ai-conversation', handleResetConversation);
    };
  }, [aiConversationId, baseId]);

  // 创建AI聊天会话
  const createAIChatSession = async (forceCreate = false) => {
    if (!authSession) return null;

    // 如果不强制创建新会话，检查是否已经存在AI聊天会话
    if (!forceCreate) {
      const { data: existingSessions, error: checkError } = await supabase
        .from('chat_session')
        .select('*')
        .eq('type', 'AI')
        .eq('created_by', authSession.id)
        .order('created_at', { ascending: false })
        .limit(1);

      if (checkError) {
        console.error('检查AI聊天会话失败:', checkError);
        return null;
      }

      // 如果已经存在AI聊天会话，返回现有会话
      if (existingSessions && existingSessions.length > 0) {
        return existingSessions[0];
      }
    }

    // 创建新的AI聊天会话
    const { data: newSession, error: createError } = await supabase
      .from('chat_session')
      .insert({
        type: 'AI',
        name: 'AI Chat Bot',
        created_by: authSession.id
      })
      .select()
      .single();

    if (createError) {
      console.error('创建AI聊天会话失败:', createError);
      return null;
    }

    
    // 将当前用户添加为会话参与者
    const { error: participantError } = await supabase
      .from('chat_participant')
      .insert({
        session_id: newSession.id,
        user_id: authSession.id,
        role: 'ADMIN'
      });

    if (participantError) {
      console.error('添加聊天参与者失败:', participantError);
    }

    // 重新获取会话列表
    fetchChatSessions();

    return newSession;
  };

  // 保存AI聊天消息
  const saveAIChatMessage = async (message) => {
    if (!message?.content || !message?.role) return;

 
    if (!authSession) return;

    // 确保有有效的会话ID
    const conversationId = aiConversationId || `${baseId.replace(/:/g, '')}_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
    if (!aiConversationId) {
      setAiConversationId(conversationId);
    }

    // 如果直接提供了session_id，就使用它
    let aiChatSessionId = message.session_id;
    
    // 如果没有提供session_id，查找或创建新的AI聊天会话
    if (!aiChatSessionId) {
      // 首先检查是否已经存在AI聊天会话
      let aiChatSession = null;
      
      // 查找现有的AI会话
      const { data: existingSessions, error: checkError } = await supabase
        .from('chat_session')
        .select('*')
        .eq('type', 'AI')
        .eq('created_by', authSession.id)
        .limit(1);
        
      if (checkError) {
        console.error('检查AI聊天会话失败:', checkError);
      } else if (existingSessions && existingSessions.length > 0) {
        // 如果已存在AI会话，直接使用
        aiChatSession = existingSessions[0];
      } else if (message.role === 'user') {
        // 只有在用户发送消息时才创建新的AI会话
        aiChatSession = await createAIChatSession();
      }
      
      if (!aiChatSession) {
        console.error('无法创建或获取AI聊天会话');
        return null;
      }
      
      aiChatSessionId = aiChatSession.id;
    }

    // 保存到ai_chat_message表
    const { data, error } = await supabase
      .from('ai_chat_message')
      .insert({
        user_id: authSession.id,
        role: message.role,
        content: message.content,
        conversation_id: conversationId,
        session_id: aiChatSessionId,
        timestamp: message.timestamp || new Date().toISOString(),
        metadata: { 
          saved_from: 'web_client',
          client_version: '1.0.0'
        }
      });

    if (error) {
      console.error('保存AI聊天消息失败:', error);
      return null;
    }
    
    // 如果是AI回复，并且是对话中的第一次AI回复，则生成聊天标题
    if (message.role === 'assistant') {
      // 查询此会话下有多少AI消息
      const { data: messageCount, error: countError } = await supabase
        .from('ai_chat_message')
        .select('id', { count: 'exact' })
        .eq('session_id', aiChatSessionId)
        .eq('role', 'assistant');
      
      if (!countError && messageCount !== null) {
        // 如果这是第一条或第二条AI消息（算上当前的），则生成会话名
        if (messageCount.length <= 2) {
          try {
            // 获取最近的对话内容来帮助生成标题
            const { data: recentMessages, error: recentError } = await supabase
              .from('ai_chat_message')
              .select('content, role')
              .eq('session_id', aiChatSessionId)
              .order('timestamp', { ascending: true })
              .limit(4); // 获取最近的几条消息
            
            if (recentError) {
              console.error('获取最近消息失败:', recentError);
            } else if (recentMessages && recentMessages.length > 0) {
              // 提取对话内容
              const conversation = recentMessages.map(msg => 
                `${msg.role === 'user' ? '用户' : 'AI'}: ${msg.content.substring(0, 100)}`
              ).join('\n');
              
              
              // 构建请求，使用简化版的请求直接调用AI API，而不是标准的聊天流程
              const titleResponse = await fetch('/api/ai/generate-title', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  conversation,
                  sessionId: aiChatSessionId
                }),
              });
              
              if (titleResponse.ok) {
                const { title } = await titleResponse.json();
                
                if (title) {
                  
                  // 更新会话名称
                  const { error: updateError } = await supabase
                    .from('chat_session')
                    .update({ name: title })
                    .eq('id', aiChatSessionId);
                    
                  if (updateError) {
                    console.error('更新AI会话标题失败:', updateError);
                  } else {
                    // 更新成功后，重新获取会话列表以刷新UI
                    fetchChatSessions();
                  }
                }
              } else {
                console.error('生成标题请求失败:', titleResponse.statusText);
                // 如果生成标题失败，回退到使用消息内容截取的方式
                fallbackTitleGeneration(message, aiChatSessionId);
              }
            }
          } catch (e) {
            console.error('生成标题过程出错:', e);
            // 出错时回退到简单方式
            fallbackTitleGeneration(message, aiChatSessionId);
          }
        }
      }
    }
    
    return data;
  };

  // 回退到简单的标题生成方法
  const fallbackTitleGeneration = async (message, sessionId) => {
    // 从消息内容中提取标题（取前20-30个字符，避免过长）
    let title = message.content.trim();
    
    // 移除Markdown格式
    title = title.replace(/#{1,6}\s+/g, ''); // 移除标题标记
    title = title.replace(/\*\*(.+?)\*\*/g, '$1'); // 移除粗体
    title = title.replace(/\*(.+?)\*/g, '$1'); // 移除斜体
    title = title.replace(/`(.+?)`/g, '$1'); // 移除代码
    
    // 提取第一行或一个合理的片段
    const firstLine = title.split(/\n/)[0].trim();
    title = firstLine.length > 0 ? firstLine : title;
    
    // 限制长度，避免过长
    const maxLength = 30;
    if (title.length > maxLength) {
      title = title.substring(0, maxLength) + '...';
    }
    
    // 更新会话名称
    const { error: updateError } = await supabase
      .from('chat_session')
      .update({ name: title })
      .eq('id', sessionId);
      
    if (updateError) {
      console.error('更新AI会话标题失败:', updateError);
    } else {
      // 更新成功后，重新获取会话列表以刷新UI
      fetchChatSessions();
    }
  };

  // 获取聊天会话列表
  const fetchChatSessions = async () => {    
    if (!authSession) return;

    // 首先获取会话列表
    const { data: sessionsData, error: sessionsError } = await supabase
      .from('chat_participant')
      .select(`
        session_id,
        chat_session (
          id,
          type,
          name,
          team_id,
          created_by,
          created_at,
          updated_at,
          participants:chat_participant(
            user:user_id (
              id,
              name,
              avatar_url,
              email,
              is_online,
              last_seen_at
            )
          )
        ),
        user:user_id (
          id,
          name,
          avatar_url,
          email,
          is_online,
          last_seen_at
        )
      `)
      .eq('user_id', authSession.id);

    if (sessionsError) {
      console.error('Error fetching chat sessions:', sessionsError);
      return;
    }
    
    // 获取用户元数据中的隐藏会话
    let hiddenSessions = {};
    try {
      // Get hidden sessions from localStorage
      hiddenSessions = JSON.parse(localStorage.getItem('hidden_sessions') || '{}');
    } catch (err) {
      console.error('Error checking hidden sessions:', err);
    }

    // 获取每个会话的最后一条消息
    const sessionIds = sessionsData
      .filter(item => !hiddenSessions[item.chat_session.id])
      .map(item => item.chat_session.id);
      
    if (sessionIds.length === 0) {
      setSessions([]);
      setLoading(false);
      return;
    }
    
    const { data: lastMessages, error: messagesError } = await supabase
      .from('chat_message')
      .select(`
        id,
        content,
        created_at,
        session_id,
        user:user_id (
          id,
          name,
          avatar_url,
          email,
          is_online,
          last_seen_at
        )
      `)
      .in('session_id', sessionIds)
      .order('created_at', { ascending: false });

    if (messagesError) {
      console.error('Error fetching last messages:', messagesError);
    }

    // 获取AI会话的最后一条消息
    // 区分出AI类型的会话ID
    const aiSessionIds = sessionsData
      .filter(item => item.chat_session.type === 'AI')
      .map(item => item.chat_session.id);
    
    // 如果有AI会话，获取AI会话的最后一条消息
    let aiLastMessages = [];
    if (aiSessionIds.length > 0) {
      const { data: aiMessages, error: aiMessagesError } = await supabase
        .from('ai_chat_message')
        .select(`
          id,
          content,
          timestamp,
          session_id,
          role,
          user:user_id (
            id,
            name,
            avatar_url,
            email,
            is_online,
            last_seen_at
          )
        `)
        .in('session_id', aiSessionIds)
        .order('timestamp', { ascending: false });
      
      if (aiMessagesError) {
        console.error('Error fetching AI last messages:', aiMessagesError);
      } else if (aiMessages) {
        // 转换字段名称以匹配普通消息格式
        aiLastMessages = aiMessages.map(msg => ({
          ...msg,
          created_at: msg.timestamp
        }));
      }
    }

    // 获取未读消息计数
    const { data: unreadData, error: unreadError } = await supabase
      .from('chat_message_read_status')
      .select('message_id, chat_message!inner(session_id)')
      .is('read_at', null)
      .eq('user_id', authSession.id);

    if (unreadError) {
      console.error('Error fetching unread counts:', unreadError);
    }

    // 计算每个会话的未读消息数
    const unreadCountsBySession = {};
    unreadData?.forEach(item => {
      const sessionId = item.chat_message?.session_id;
      if (sessionId) {
        unreadCountsBySession[sessionId] = (unreadCountsBySession[sessionId] || 0) + 1;
      }
    });

    // 获取每个会话的最后一条消息
    const lastMessagesBySession = {};
    
    // 处理普通聊天消息
    lastMessages?.forEach(msg => {
      if (!lastMessagesBySession[msg.session_id]) {
        lastMessagesBySession[msg.session_id] = msg;
      }
    });
    
    // 处理AI聊天消息
    aiLastMessages.forEach(msg => {
      // 确保字段统一
      const aiMsg = {
        ...msg,
        created_at: msg.timestamp // 确保AI消息使用timestamp作为created_at
      };
      
      
      if (!lastMessagesBySession[aiMsg.session_id]) {
        // 如果没有该会话的消息，直接使用此AI消息
        lastMessagesBySession[aiMsg.session_id] = aiMsg;
      } else {
        // 如果已有消息，比较时间戳并取最新的
        const existingMsg = lastMessagesBySession[aiMsg.session_id];
        const aiMsgTime = new Date(aiMsg.created_at).getTime();
        const existingMsgTime = new Date(existingMsg.created_at).getTime();
        
        
        if (aiMsgTime > existingMsgTime) {
          lastMessagesBySession[aiMsg.session_id] = aiMsg;
        }
      }
    });

    // 将最后一条消息添加到会话数据中
    const sessionsWithMessages = sessionsData.map(item => {
      const lastMessage = lastMessagesBySession[item.chat_session.id];
      const otherParticipants = item.chat_session.participants
        .map(p => {
          const processedUser = processAvatarUrl(p.user);
          // Add a unique session-specific identifier to each participant
          return {
            ...processedUser,
            // Create a unique ID for this user in this specific session
            sessionUserId: `${item.chat_session.id}_${processedUser.id}`
          };
        })
        .filter(user => user.id !== authSession.id);
      
      const sessionId = item.chat_session.id;
      // 如果是当前打开的会话，未读计数为0
      const unreadCount = currentSession?.id === sessionId ? 0 : (unreadCountsBySession[sessionId] || 0);
      
      return {
        ...item.chat_session,
        created_by: item.chat_session.created_by, // Explicitly include created_by
        participants: otherParticipants,
        participantsCount: item.chat_session.participants.length,
        unreadCount,
        lastMessage: lastMessage ? {
          ...lastMessage,
          user: processAvatarUrl(lastMessage.user)
        } : null
      };
    });

    setSessions(sessionsWithMessages);
    
    // Fetch all user relationships in one batch
    fetchAllUserRelationships(sessionsWithMessages);
    
    setLoading(false);
  };

  // Add a function to fetch all user relationships at once
  const fetchAllUserRelationships = async (sessionsData) => {
    try {
      if (!authSession || !sessionsData.length) return;
      
      // Extract all user IDs from private chat sessions
      const userIds = [];
      
      sessionsData.forEach(session => {
        if (session.type === 'PRIVATE' && session.participants?.[0]?.id) {
          userIds.push(session.participants[0].id);
        }
      });
      
      // Remove duplicates
      const uniqueUserIds = [...new Set(userIds)];
      
      if (uniqueUserIds.length === 0) return;
      
      // Batch fetch all relationships at once
      const response = await fetch('/api/users/checkRelationshipBatch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetUserIds: uniqueUserIds,
          userId: authSession.id
        }),
      });
      
      if (response.ok) {
        const data = await response.json();
        // The API returns the results directly (not nested under a "relationships" property)
        setUserRelationships(data);
      } else {
        const errorText = await response.text();
        console.error('Failed to batch fetch user relationships:', errorText);
      }
    } catch (error) {
      console.error('Error fetching user relationships:', error);
    }
  };

  // 获取会话消息
  const fetchMessages = async (sessionId) => {
    if (!authSession) return;
    
    // 先检查用户是否有权访问此会话
    const { data: participant, error: participantError } = await supabase
      .from('chat_participant')
      .select('*')
      .eq('session_id', sessionId)
      .eq('user_id', authSession.id)
      .single();
      
    if (participantError || !participant) {
      console.error('无权访问此会话的消息', participantError);
      return;
    }

    // 清空消息状态以避免显示旧消息
    setMessages([]);

    // 获取所有消息
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
        attachments:chat_attachment (
          id,
          file_url,
          file_name,
          is_image
        ),
        replied_message:reply_to_message_id (
          id,
          content,
          mentions,
          user:user_id (
            id,
            name,
            avatar_url,
            email
          )
        )
      `)
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching messages:', error);
      return;
    }

    // Set all messages with proper avatar processing
    setMessages(data.map(msg => ({
      ...msg,
      user: processAvatarUrl(msg.user),
      replied_message: msg.replied_message ? {
        ...msg.replied_message,
        user: processAvatarUrl(msg.replied_message.user)
      } : null
    })));
    
    // 标记消息为已读
    markMessagesAsRead(sessionId, authSession.id);
    
    // 更新未读消息计数
    updateUnreadCount(sessionId);
  };

  // 更新特定会话的未读消息计数
  const updateUnreadCount = async (sessionId) => {
    if (!authSession) return;
    
    // 获取所有会话的未读消息计数
    const { data, error } = await supabase
      .from('chat_message_read_status')
      .select('message_id, user_id, chat_message!inner(session_id)')
      .is('read_at', null)
      .eq('user_id', authSession.id);

    if (error) {
      console.error('获取未读消息计数失败:', error);
      return;
    }
    
    // 更新会话列表中的未读计数
    setSessions(prev => {
      return prev.map(session => {
        // 计算此会话的未读消息数量
        const unreadCount = data.filter(row => row.chat_message?.session_id === session.id).length;
        
        // 如果是当前打开的会话，强制设置未读计数为0
        const finalCount = session.id === sessionId ? 0 : unreadCount;
        
        return {
          ...session,
          unreadCount: finalCount
        };
      });
    });
  };

  // 标记消息为已读
  const markMessagesAsRead = async (sessionId, userId) => {
    const { data: unreadMessages, error: fetchError } = await supabase
      .from('chat_message_read_status')
      .select('message_id, user_id, chat_message!inner(session_id)')
      .eq('chat_message.session_id', sessionId)
      .eq('user_id', userId)
      .is('read_at', null);
      
    if (fetchError) {
      console.error('获取未读消息状态失败:', fetchError);
      return;
    }
    
    
    if (unreadMessages && unreadMessages.length > 0) {
      // 使用批量更新，按复合主键更新
      const updatePromises = unreadMessages.map(status => 
        supabase
          .from('chat_message_read_status')
          .update({ read_at: new Date().toISOString() })
          .eq('message_id', status.message_id)
          .eq('user_id', status.user_id)
      );
      
      try {
        await Promise.all(updatePromises);
        
        // 已经标记为已读，立即更新未读计数
        updateUnreadCount(sessionId);
      } catch (error) {
        console.error('标记消息为已读失败:', error);
      }
    }
  };

  // 发送消息
  const sendMessage = async (sessionId, content, replyToMessageId = null, mentions = []) => {
    if (!authSession) {
      throw new Error('User not logged in');
    }

    // 首先插入消息
    const { data, error } = await supabase
      .from('chat_message')
      .insert({
        session_id: sessionId,
        user_id: authSession.id,
        content,
        reply_to_message_id: replyToMessageId,
        mentions: mentions.length > 0 ? mentions : null // Add mentions to the message
      })
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
          mentions,
          user:user_id (
            id,
            name,
            avatar_url,
            email
          )
        )
      `)
      .single();

    if (error) {
      console.error('Error sending message:', error);
      throw error;
    }

    // 获取会话的所有参与者
    const { data: participants, error: participantsError } = await supabase
      .from('chat_participant')
      .select('user_id')
      .eq('session_id', sessionId);

    if (participantsError) {
      console.error('Error fetching participants:', participantsError);
      throw participantsError;
    }

    // 为每个参与者创建未读记录，除了发送者自己
    const readStatusRecords = participants
      .filter(p => p.user_id !== authSession.id)
      .map(p => ({
        message_id: data.id,
        user_id: p.user_id,
        read_at: null
      }));

    if (readStatusRecords.length > 0) {
      const { error: readStatusError } = await supabase
        .from('chat_message_read_status')
        .insert(readStatusRecords);

      if (readStatusError) {
        console.error('Error creating read status records:', readStatusError);
        // 这里不抛出异常，因为这只是未读状态记录，不影响消息发送
      }
    }

    // Create notifications for mentioned users
    if (mentions && mentions.length > 0) {
      try {
        // Filter out user mentions
        const userMentions = mentions.filter(mention => mention.type === 'user');
        
        if (userMentions.length > 0) {
          // Get user IDs for the mentions where we have the name
          const userNames = userMentions.map(mention => mention.name);
          
          if (userNames.length > 0) {
            // Get actual user IDs from names
            const { data: mentionedUsers, error: mentionedUsersError } = await supabase
              .from('user')
              .select('id, name')
              .in('name', userNames);
            
            if (!mentionedUsersError && mentionedUsers && mentionedUsers.length > 0) {
              // Prepare notifications for mentioned users
              const notifications = mentionedUsers.map(user => ({
                user_id: user.id,
                type: 'MENTION',
                title: `You were mentioned in a chat`,
                content: `${authSession.name} mentioned you in a message`,
                link: `/chat?session=${sessionId}`,
                data: {
                  session_id: sessionId,
                  message_id: data.id,
                  mentioned_by: authSession.id
                }
              }));
              
              // Insert notifications
              if (notifications.length > 0) {
                await supabase
                  .from('notification')
                  .insert(notifications);
              }
            }
          }
        }
      } catch (notifyError) {
        console.error('Error creating mention notifications:', notifyError);
        // Don't throw error, just log it
      }
    }

    // 记录已发送的消息ID，用于防止重复添加
    sentMessageIds.add(data.id);
    
    // Add message to the UI
    setMessages(prev => [...prev, { 
      ...data, 
      user: processAvatarUrl(data.user),
      replied_message: data.replied_message ? {
        ...data.replied_message,
        user: processAvatarUrl(data.replied_message.user)
      } : null
    }]);
    
    // 同时更新会话的最后一条消息
    setSessions(prev => {
      return prev.map(session => {
        if (session.id === sessionId) {
          return {
            ...session,
            lastMessage: {
              ...data,
              user: processAvatarUrl(data.user)
            }
          };
        }
        return session;
      });
    });
    
    // 如果发送的消息可能关联有附件（通过FileUploader组件上传的），
    // 可能需要等待一小段时间再重新获取完整的消息数据（包括附件信息）
    setTimeout(async () => {
      // 重新获取完整的消息数据，确保包含最新的附件信息
      const { data: refreshedData, error: refreshError } = await supabase
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
            mentions,
            user:user_id (
              id,
              name,
              avatar_url,
              email
            )
          )
        `)
        .eq('id', data.id)
        .single();

      if (!refreshError && refreshedData) {
        // 更新本地消息列表
        setMessages(prev => {
          // 找到并替换之前添加的消息
          return prev.map(msg => 
            msg.id === refreshedData.id 
              ? { 
                  ...refreshedData, 
                  user: processAvatarUrl(refreshedData.user),
                  replied_message: refreshedData.replied_message ? {
                    ...refreshedData.replied_message,
                    user: processAvatarUrl(refreshedData.replied_message.user)
                  } : null
                } 
              : msg
          );
        });
        
        // Also update the session's last message
        setSessions(prev => {
          return prev.map(session => {
            if (session.id === sessionId) {
              return {
                ...session,
                lastMessage: {
                  ...refreshedData,
                  user: processAvatarUrl(refreshedData.user)
                }
              };
            }
            return session;
          });
        });
      }
    }, 500); // 等待500ms确保附件处理完成
    
    return data;
  };

  // 删除消息的功能
  const deleteMessage = async (messageId) => {
    try {
      if (!authSession) {
        console.error('用户未登录，无法删除消息');
        return { success: false, error: '未登录' };
      }
      
      // 先获取消息以确认是自己的消息
      const { data: message, error: fetchError } = await supabase
        .from('chat_message')
        .select('*')
        .eq('id', messageId)
        .single();
        
      if (fetchError) {
        console.error('获取消息失败:', fetchError);
        return { success: false, error: fetchError };
      }
      
      // 确认消息属于当前用户
      if (message.user_id !== authSession.id) {
        console.error('无权删除他人消息');
        return { success: false, error: '无权操作' };
      }
      
      // 软删除消息 - 更新状态而不是删除
      const { error: updateError } = await supabase
        .from('chat_message')
        .update({
          is_deleted: true,
          content: "[Message withdrawn]" // 同时清空内容以保护隐私
        })
        .eq('id', messageId);
        
      if (updateError) {
        console.error('撤回消息失败:', updateError);
        return { success: false, error: updateError };
      }
      
      // 更新本地消息列表
      setMessages(prevMessages => prevMessages.map(msg => 
        msg.id === messageId 
          ? { ...msg, is_deleted: true, content: "[Message withdrawn]" } 
          : msg
      ));
      
      return { success: true };
    } catch (error) {
      console.error('删除消息过程中发生错误:', error);
      return { success: false, error };
    }
  };

  // 删除聊天会话功能
  const deleteChatSession = async (sessionId) => {
    try {
      if (!authSession) {
        console.error('用户未登录，无法删除会话');
        return { success: false, error: '未登录' };
      }
      
      // 获取会话信息以检查权限
      const { data: session, error: sessionError } = await supabase
        .from('chat_session')
        .select('*')
        .eq('id', sessionId)
        .single();
        
      if (sessionError) {
        console.error('获取会话信息失败:', sessionError);
        return { success: false, error: sessionError };
      }
      
      // 严格检查是否为会话创建者，只有创建者可以删除
      if (session.created_by !== authSession.id) {
        console.error('无权删除此会话，只有会话创建者可以删除');
        return { success: false, error: '无权操作' };
      }
      
      // 开始删除会话相关数据

      // 首先获取所有与此会话相关的消息ID
      const { data: messageIds, error: messageIdsError } = await supabase
        .from('chat_message')
        .select('id')
        .eq('session_id', sessionId);
        
      if (messageIdsError) {
        console.error('获取消息ID失败:', messageIdsError);
        // 继续执行，不中断流程
      }
      
      // 如果有消息ID，删除相关的附件和阅读状态
      if (messageIds && messageIds.length > 0) {
        // 提取ID数组
        const ids = messageIds.map(msg => msg.id);
        
        // 1. 删除所有附件
        const { error: attachmentsError } = await supabase
          .from('chat_attachment')
          .delete()
          .in('message_id', ids);
          
        if (attachmentsError) {
          console.error('删除附件失败:', attachmentsError);
          // 继续执行，不中断流程
        }
        
        // 2. 删除消息读取状态
        const { error: readStatusError } = await supabase
          .from('chat_message_read_status')
          .delete()
          .in('message_id', ids);
          
        if (readStatusError) {
          console.error('删除消息读取状态失败:', readStatusError);
          // 继续执行，不中断流程
        }
      }
      
      // 3. 删除所有消息
      const { error: messagesError } = await supabase
        .from('chat_message')
        .delete()
        .eq('session_id', sessionId);
        
      if (messagesError) {
        console.error('删除消息失败:', messagesError);
        // 继续执行，不中断流程
      }
      
      // 4. 删除AI消息 (如果有)
      const { error: aiMessagesError } = await supabase
        .from('ai_chat_message')
        .delete()
        .eq('session_id', sessionId);
        
      if (aiMessagesError) {
        console.error('删除AI消息失败:', aiMessagesError);
        // 继续执行，不中断流程
      }
      
      // 5. 删除会话参与者
      const { error: participantsError } = await supabase
        .from('chat_participant')
        .delete()
        .eq('session_id', sessionId);
        
      if (participantsError) {
        console.error('删除会话参与者失败:', participantsError);
        // 继续执行，不中断流程
      }
      
      // 6. 最后删除会话本身
      const { error: deleteSessionError } = await supabase
        .from('chat_session')
        .delete()
        .eq('id', sessionId);
        
      if (deleteSessionError) {
        console.error('删除会话失败:', deleteSessionError);
        return { success: false, error: deleteSessionError };
      }
      
      // 如果是当前会话，清除当前会话
      if (currentSession?.id === sessionId) {
        setCurrentSession(null);
        setMessages([]);
      }
      
      // 更新会话列表
      setSessions(prevSessions => prevSessions.filter(s => s.id !== sessionId));
      
      return { success: true };
    } catch (error) {
      console.error('删除会话过程中发生错误:', error);
      return { success: false, error };
    }
  };

  // 离开群聊功能
  const leaveGroupChat = async (sessionId) => {
    try {
      if (!authSession || !sessionId) {
        console.error('用户未登录或会话ID无效');
        return { success: false, error: '参数无效' };
      }
      
      // 先验证会话类型是否为群聊
      const { data: session, error: sessionError } = await supabase
        .from('chat_session')
        .select('*')
        .eq('id', sessionId)
        .single();
        
      if (sessionError || !session) {
        console.error('获取会话信息失败:', sessionError);
        return { success: false, error: sessionError };
      }
      
      if (session.type !== 'GROUP') {
        console.error('只能退出群聊');
        return { success: false, error: '只能退出群聊' };
      }
      
      // 检查用户是否为群聊创建者
      if (session.created_by === authSession.id) {
        console.error('群聊创建者不能退出群聊，请先转让群主或解散群聊');
        return { success: false, error: '群聊创建者不能退出群聊' };
      }
      
      // 从参与者表中删除用户
      const { error: removeError } = await supabase
        .from('chat_participant')
        .delete()
        .eq('session_id', sessionId)
        .eq('user_id', authSession.id);
        
      if (removeError) {
        console.error('退出群聊失败:', removeError);
        return { success: false, error: removeError };
      }
      
      // 如果当前会话正好是这个群聊，清除它
      if (currentSession?.id === sessionId) {
        setCurrentSession(null);
      }
      
      // 更新会话列表
      await fetchChatSessions();
      
      return { success: true };
    } catch (error) {
      console.error('退出群聊过程中发生错误:', error);
      return { success: false, error };
    }
  };

  // 实时消息订阅
  useEffect(() => {
    if (!currentSession) return;

    const channel = supabase
      .channel(`chat_${currentSession.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_message',
        filter: `session_id=eq.${currentSession.id}`
      }, async (payload) => {
        // 获取当前用户
        if (!authSession) return;
        
        // 如果消息ID已在sentMessageIds中，说明是自己发的消息，忽略实时更新
        if (sentMessageIds.has(payload.new.id)) {
          return;
        }
        
        // 获取完整的消息信息，包括用户信息
        const { data: messageData, error } = await supabase
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
              mentions,
              user:user_id (
                id,
                name,
                avatar_url,
                email
              )
            )
          `)
          .eq('id', payload.new.id)
          .single();

        if (error) {
          console.error('Error fetching complete message data:', error);
          return;
        }
        
        // Always add new messages to the UI without filtering
        setMessages(prev => {
          // 检查消息是否已经存在
          const messageExists = prev.some(msg => msg.id === messageData.id);
          if (messageExists) {
            return prev;
          }
          return [...prev, { 
            ...messageData, 
            user: processAvatarUrl(messageData.user),
            replied_message: messageData.replied_message ? {
              ...messageData.replied_message,
              user: processAvatarUrl(messageData.replied_message.user)
            } : null 
          }];
        });
        
        // Always update the session's last message regardless of cleared history status
        // This ensures the chat list shows the latest message
        setSessions(prev => {
          return prev.map(session => {
            if (session.id === payload.new.session_id) {
              return {
                ...session,
                lastMessage: {
                  ...messageData,
                  user: processAvatarUrl(messageData.user)
                }
              };
            }
            return session;
          });
        });
        
        // 如果是当前会话，且不是当前用户发送的消息，立即标记为已读
        if (messageData.user_id !== authSession.id) {
          // 查找此消息的未读状态记录
          const { data: readStatusList, error: readStatusError } = await supabase
            .from('chat_message_read_status')
            .select('message_id, user_id')
            .eq('message_id', messageData.id)
            .eq('user_id', authSession.id)
            .is('read_at', null);
            
          if (readStatusError) {
            console.error('Error fetching read status:', readStatusError);
            return;
          }
          
          if (readStatusList && readStatusList.length > 0) {
            
            // 使用直接更新，按复合主键更新
            const { error: updateError } = await supabase
              .from('chat_message_read_status')
              .update({ read_at: new Date().toISOString() })
              .eq('message_id', messageData.id)
              .eq('user_id', authSession.id);
              
            if (updateError) {
              console.error('Error updating read status:', updateError);
            } else {
              // 更新未读计数
              updateUnreadCount(currentSession.id);
            }
          }
        }
      })
      .subscribe();

    // 获取当前会话的消息
    fetchMessages(currentSession.id);

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentSession]);

  // 初始加载
  useEffect(() => {
    fetchChatSessions();

    // 订阅聊天参与者变化
    const channel = supabase
      .channel('chat_participants')
      .on('postgres_changes', {
        event: '*', // 监听所有事件（INSERT, UPDATE, DELETE）
        schema: 'public',
        table: 'chat_participant'
      }, () => {
        // 当有变化时，重新获取会话列表
        fetchChatSessions();
      })
      .subscribe();
      
    // 订阅所有聊天消息变化来更新lastMessage
    const messagesChannel = supabase
      .channel('chat_messages_updates')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_message'
      }, async (payload) => {
        // 获取当前用户
        if (!authSession) return;
        
        // 如果消息ID已在sentMessageIds中，说明是自己发的消息，直接用现有数据更新
        if (sentMessageIds.has(payload.new.id)) {
          return;
        }
        
        // 获取完整的消息信息
        const { data: messageData, error } = await supabase
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
              mentions,
              user:user_id (
                id,
                name,
                avatar_url,
                email
              )
            )
          `)
          .eq('id', payload.new.id)
          .single();

        if (error) {
          console.error('Error fetching complete message data:', error);
          return;
        }
        
        // 获取用户元数据，检查该会话是否被隐藏
        let isHiddenSession = false;
        try {
          // Check from localStorage instead of user metadata
          const hiddenSessions = JSON.parse(localStorage.getItem('hidden_sessions') || '{}');
          isHiddenSession = !!hiddenSessions[payload.new.session_id];
        } catch (err) {
          console.error('Error checking hidden sessions:', err);
        }

        // 检查消息是否需要标记为未读（如果发送者不是当前用户，且不是当前打开的会话）
        const isFromOtherUser = messageData.user_id !== authSession.id;
        const isNotCurrentSession = currentSession?.id !== payload.new.session_id;
        
        // 更新会话列表中的最后一条消息和未读计数
        setSessions(prev => {
          let newSessions = [...prev];
          
          // 找到对应的会话
          const sessionIndex = newSessions.findIndex(s => s.id === payload.new.session_id);
          
          // 如果会话不存在且不是被隐藏的，可能需要重新获取会话列表
          if (sessionIndex === -1 && !isHiddenSession) {
            fetchChatSessions();
            return prev;
          }
          
          // 如果会话存在，更新它
          if (sessionIndex !== -1) {
            // 如果是其他用户发送的消息，且不是当前打开的会话，则增加未读计数
            const shouldIncrementUnread = isFromOtherUser && isNotCurrentSession;
            
            const newUnreadCount = shouldIncrementUnread
              ? (newSessions[sessionIndex].unreadCount || 0) + 1 
              : newSessions[sessionIndex].unreadCount || 0;
              
            newSessions[sessionIndex] = {
              ...newSessions[sessionIndex],
              unreadCount: newUnreadCount,
              lastMessage: {
                ...messageData,
                user: processAvatarUrl(messageData.user),
                replied_message: messageData.replied_message ? {
                  ...messageData.replied_message,
                  user: processAvatarUrl(messageData.replied_message.user)
                } : null
              }
            };
          }
          
          return newSessions;
        });
        
        // 如果是当前会话，且是当前用户打开的，立即标记为已读
        if (!isNotCurrentSession && isFromOtherUser) {
          // 查找此消息的未读状态记录
          const { data: readStatusList, error: readStatusError } = await supabase
            .from('chat_message_read_status')
            .select('message_id, user_id')
            .eq('message_id', messageData.id)
            .eq('user_id', authSession.id)
            .is('read_at', null);
            
          if (readStatusError) {
            console.error('Error fetching read status:', readStatusError);
            return;
          }
          
          if (readStatusList && readStatusList.length > 0) {
            
            // 使用直接更新，按复合主键更新
            const { error: updateError } = await supabase
              .from('chat_message_read_status')
              .update({ read_at: new Date().toISOString() })
              .eq('message_id', messageData.id)
              .eq('user_id', authSession.id);
              
            if (updateError) {
              console.error('Error updating read status:', updateError);
            } else {
              // 更新未读计数
              updateUnreadCount(currentSession.id);
            }
          }
        }
      })
      // Add a handler for UPDATE events to handle message deletions and edits
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'chat_message'
      }, async (payload) => {
        if (!authSession) return;
        
        // If message was deleted/withdrawn or content was edited, update it in our state
        if (payload.new.is_deleted !== payload.old.is_deleted || payload.new.content !== payload.old.content) {
          // Update the messages array if this is for the current session
          if (currentSession?.id === payload.new.session_id) {
            setMessages(prevMessages => 
              prevMessages.map(msg => 
                msg.id === payload.new.id 
                  ? { ...msg, is_deleted: payload.new.is_deleted, content: payload.new.content } 
                  : msg
              )
            );
          }
          
          // Also update the last message in the sessions list if this was the last message
          setSessions(prevSessions => 
            prevSessions.map(session => {
              if (session.id === payload.new.session_id && 
                  session.lastMessage?.id === payload.new.id) {
                return {
                  ...session,
                  lastMessage: {
                    ...session.lastMessage,
                    is_deleted: payload.new.is_deleted,
                    content: payload.new.content
                  }
                };
              }
              return session;
            })
          );
        }
      })
      .subscribe();
      
    // 订阅AI聊天消息变化
    const aiMessagesChannel = supabase
      .channel('ai_chat_messages_updates')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'ai_chat_message'
      }, async (payload) => {
        // 获取当前用户
        if (!authSession) return;
        
        // 获取完整的AI消息信息
        const { data: messageData, error } = await supabase
          .from('ai_chat_message')
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

        if (error) {
          console.error('Error fetching complete AI message data:', error);
          return;
        }
        
        // 更新会话列表中的最后一条消息
        setSessions(prev => {
          return prev.map(session => {
            if (session.id === payload.new.session_id) {
              // 转换timestamp字段为created_at以保持格式一致
              const formattedMessage = {
                ...messageData,
                created_at: messageData.timestamp,
                user: processAvatarUrl(messageData.user)
              };
              
              // 检查是否应该更新lastMessage（如果现有的lastMessage较旧或不存在）
              if (!session.lastMessage || 
                  new Date(formattedMessage.created_at) > new Date(session.lastMessage.created_at)) {
                return {
                  ...session,
                  lastMessage: formattedMessage
                };
              }
            }
            return session;
          });
        });
      })
      .subscribe();

    // 订阅消息读取状态变化
    const readStatusChannel = supabase
      .channel('read_status_updates')
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'chat_message_read_status'
      }, async (payload) => {
        // 当有消息标记为已读时，更新未读计数
        if (payload.new.read_at && !payload.old.read_at) {
          if (!authSession) return;
          
          // 如果是当前用户的消息读取状态
          if (payload.new.user_id === authSession.id) {
            // 获取该消息所属的会话ID
            const { data: messageData } = await supabase
              .from('chat_message')
              .select('session_id')
              .eq('id', payload.new.message_id)
              .single();
              
            if (messageData) {
              // 更新未读消息计数
              updateUnreadCount(messageData.session_id);
            }
          }
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(messagesChannel);
      supabase.removeChannel(aiMessagesChannel);
      supabase.removeChannel(readStatusChannel);
    };
  }, [authSession]);

  // 更新会话时进行检查和处理
  const setCurrentSessionWithCheck = (session) => {
    // 检查session是否在用户的会话列表中
    const isAuthorized = sessions.some(s => s.id === session?.id);
    // 如果是AI模式，允许访问AI会话
    const isAISession = session?.type === 'AI';
    
    // 如果切换到了新的会话，更新未读计数
    if (session && (!currentSession || session.id !== currentSession.id)) {
      // 立即更新UI显示，将该会话的未读计数设为0
      setSessions(prev => {
        return prev.map(s => {
          if (s.id === session.id) {
            return { ...s, unreadCount: 0 };
          }
          return s;
        });
      });
    }
    
    // 立即标记该会话所有消息为已读
    const setMessagesRead = async () => {
      if (authSession && session) {
        await markMessagesAsRead(session.id, authSession.id);
      }
    };
    
    // 如果是相同的会话，合并新旧数据以确保所有字段都保留
    if (session && currentSession && session.id === currentSession.id) {
      // 合并旧数据和新数据，保留created_by字段
      const mergedSession = {
        ...currentSession,
        ...session,
        // 特别确保created_by被正确保留
        created_by: session.created_by || currentSession.created_by
      };
      setCurrentSession(mergedSession);
      
      // 如果是普通会话，确保将其消息标记为已读
      if (session.type !== 'AI') {
        setMessagesRead();
      }
    } else {
      // 清除旧的消息
      if (session?.id !== currentSession?.id) {
        setMessages([]);
      }
      
      setCurrentSession(session);
      
      // 如果是普通会话，确保将其消息标记为已读
      if (session?.type !== 'AI') {
        setMessagesRead();
      }
    }
  };

  return (
    <ChatContext.Provider value={{
      sessions,
      currentSession,
      setCurrentSession: setCurrentSessionWithCheck,
      messages,
      sendMessage,
      loading,
      fetchChatSessions,
      saveAIChatMessage,
      createAIChatSession,
      chatMode,
      setChatMode,
      fetchMessages,
      deleteMessage,
      deleteChatSession,
      leaveGroupChat,
      userRelationships
    }}>
      {children}
    </ChatContext.Provider>
  );
}
  
export function useChat() {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
} 