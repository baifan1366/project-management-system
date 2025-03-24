'use client';

import { createContext, useContext, useState, useEffect, useId } from 'react';
import { supabase } from '@/lib/supabase';

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
    if (!aiConversationId) {
      // 使用useId生成的基础ID加上时间戳和随机数
      const newConversationId = `${baseId.replace(/:/g, '')}_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
      setAiConversationId(newConversationId);
    }
    
    // 监听重置会话ID事件
    const handleResetConversation = () => {
      console.log('重置AI对话ID');
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
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return null;

    // 如果不强制创建新会话，检查是否已经存在AI聊天会话
    if (!forceCreate) {
      const { data: existingSessions, error: checkError } = await supabase
        .from('chat_session')
        .select('*')
        .eq('type', 'AI')
        .eq('created_by', session.user.id)
        .order('created_at', { ascending: false })
        .limit(1);

      if (checkError) {
        console.error('检查AI聊天会话失败:', checkError);
        return null;
      }

      // 如果已经存在AI聊天会话，返回现有会话
      if (existingSessions && existingSessions.length > 0) {
        console.log('发现现有AI会话:', existingSessions[0].id);
        return existingSessions[0];
      }
    }

    // 创建新的AI聊天会话
    console.log('正在创建全新的AI会话');
    const { data: newSession, error: createError } = await supabase
      .from('chat_session')
      .insert({
        type: 'AI',
        name: 'AI Chat Bot',
        created_by: session.user.id
      })
      .select()
      .single();

    if (createError) {
      console.error('创建AI聊天会话失败:', createError);
      return null;
    }

    console.log('新AI会话创建成功:', newSession.id);
    
    // 将当前用户添加为会话参与者
    const { error: participantError } = await supabase
      .from('chat_participant')
      .insert({
        session_id: newSession.id,
        user_id: session.user.id,
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

    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return;

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
        .eq('created_by', session.user.id)
        .limit(1);
        
      if (checkError) {
        console.error('检查AI聊天会话失败:', checkError);
      } else if (existingSessions && existingSessions.length > 0) {
        // 如果已存在AI会话，直接使用
        aiChatSession = existingSessions[0];
        console.log('使用现有AI会话:', aiChatSession.id);
      } else if (message.role === 'user') {
        // 只有在用户发送消息时才创建新的AI会话
        console.log('创建新的AI会话');
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
        user_id: session.user.id,
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
    
    // 只有用户发送的消息才保存到chat_message表中
    if (message.role === 'user') {
      const { data: chatMsgData, error: chatMsgError } = await supabase
        .from('chat_message')
        .insert({
          session_id: aiChatSessionId,
          user_id: session.user.id,
          content: message.content
        });
        
      if (chatMsgError) {
        console.error('保存消息到常规聊天失败:', chatMsgError);
      }
    }
    
    return data;
  };

  // 获取聊天会话列表
  const fetchChatSessions = async () => {
    const { data: { session: authSession } } = await supabase.auth.getSession();
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
          created_at,
          updated_at,
          participants:chat_participant(user:"user"(*))
        ),
        "user"(*)
      `)
      .eq('user_id', authSession.user.id);

    if (sessionsError) {
      console.error('Error fetching chat sessions:', sessionsError);
      // 如果是新用户可能没有聊天记录，返回空数组
      setSessions([]);
      setLoading(false);
      return;
    }

    // 如果没有会话数据，直接返回空数组
    if (!sessionsData || sessionsData.length === 0) {
      setSessions([]);
      setLoading(false);
      return;
    }

    // 获取每个会话的最后一条消息
    const sessionIds = sessionsData.map(item => item.chat_session.id);
    const { data: lastMessages, error: messagesError } = await supabase
      .from('chat_message')
      .select(`
        id,
        content,
        created_at,
        session_id,
        "user"(*)
      `)
      .in('session_id', sessionIds)
      .order('created_at', { ascending: false });

    if (messagesError) {
      console.error('Error fetching last messages:', messagesError);
    }

    // 获取未读消息计数
    const { data: unreadData, error: unreadError } = await supabase
      .from('chat_message_read_status')
      .select('message_id, chat_message!inner(session_id)')
      .is('read_at', null)
      .eq('user_id', authSession.user.id);

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
    lastMessages?.forEach(msg => {
      if (!lastMessagesBySession[msg.session_id]) {
        lastMessagesBySession[msg.session_id] = msg;
      }
    });

    // 将最后一条消息添加到会话数据中
    const sessionsWithMessages = sessionsData.map(item => {
      const lastMessage = lastMessagesBySession[item.chat_session.id];
      const otherParticipants = item.chat_session.participants
        .map(p => processAvatarUrl(p.user))
        .filter(user => user.id !== authSession.user.id);
      
      const sessionId = item.chat_session.id;
      // 如果是当前打开的会话，未读计数为0
      const unreadCount = currentSession?.id === sessionId ? 0 : (unreadCountsBySession[sessionId] || 0);
      
      return {
        ...item.chat_session,
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
    setLoading(false);
  };

  // 获取会话消息
  const fetchMessages = async (sessionId) => {
    const { data: { session: authSession } } = await supabase.auth.getSession();
    if (!authSession) return;
    
    // 先检查用户是否有权访问此会话
    const { data: participant, error: participantError } = await supabase
      .from('chat_participant')
      .select('*')
      .eq('session_id', sessionId)
      .eq('user_id', authSession.user.id)
      .single();
      
    if (participantError || !participant) {
      console.error('无权访问此会话的消息', participantError);
      return;
    }

    const { data, error } = await supabase
      .from('chat_message')
      .select(`
        *,
        "user"(*),
        attachments:chat_attachment (
          id,
          file_url,
          file_name
        )
      `)
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching messages:', error);
      return;
    }

    setMessages(data.map(msg => ({
      ...msg,
      user: processAvatarUrl(msg.user)
    })));
    
    // 标记消息为已读
    markMessagesAsRead(sessionId, authSession.user.id);
    
    // 更新未读消息计数
    updateUnreadCount(sessionId);
  };

  // 更新特定会话的未读消息计数
  const updateUnreadCount = async (sessionId) => {
    const { data: { session: authSession } } = await supabase.auth.getSession();
    if (!authSession) return;
    
    // 获取所有会话的未读消息计数
    const { data, error } = await supabase
      .from('chat_message_read_status')
      .select('message_id, user_id, chat_message!inner(session_id)')
      .is('read_at', null)
      .eq('user_id', authSession.user.id);

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
    
    console.log(`准备标记 ${unreadMessages?.length || 0} 条未读消息为已读`);
    
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
        console.log(`成功将 ${unreadMessages.length} 条消息标记为已读`);
        
        // 已经标记为已读，立即更新未读计数
        updateUnreadCount(sessionId);
      } catch (error) {
        console.error('标记消息为已读失败:', error);
      }
    }
  };

  // 发送消息
  const sendMessage = async (sessionId, content, replyToMessageId = null) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    // 首先插入消息
    const { data, error } = await supabase
      .from('chat_message')
      .insert({
        session_id: sessionId,
        user_id: session.user.id,
        content,
        reply_to_message_id: replyToMessageId
      })
      .select(`
        *,
        "user"(*),
        attachments:chat_attachment (
          id,
          file_url,
          file_name
        )
      `)
      .single();

    if (error) {
      console.error('Error sending message:', error);
      return;
    }

    // 获取会话的所有参与者
    const { data: participants, error: participantsError } = await supabase
      .from('chat_participant')
      .select('user_id')
      .eq('session_id', sessionId);

    if (participantsError) {
      console.error('Error fetching participants:', participantsError);
      return;
    }

    // 为每个参与者创建未读记录，除了发送者自己
    const readStatusRecords = participants
      .filter(p => p.user_id !== session.user.id)
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
      }
    }

    // 记录已发送的消息ID，用于防止重复添加
    sentMessageIds.add(data.id);
    
    // 将消息添加到本地状态
    setMessages(prev => [...prev, { ...data, user: processAvatarUrl(data.user) }]);
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
        const { data: { session: authSession } } = await supabase.auth.getSession();
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
            "user"(*),
            attachments:chat_attachment (
              id,
              file_url,
              file_name
            )
          `)
          .eq('id', payload.new.id)
          .single();

        if (error) {
          console.error('Error fetching complete message data:', error);
          return;
        }

        setMessages(prev => {
          // 检查消息是否已经存在
          const messageExists = prev.some(msg => msg.id === messageData.id);
          if (messageExists) {
            return prev;
          }
          return [...prev, { ...messageData, user: processAvatarUrl(messageData.user) }];
        });
        
        // 更新会话列表中的最后一条消息
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
        if (messageData.user_id !== authSession.user.id) {
          // 查找此消息的未读状态记录
          const { data: readStatusList, error: readStatusError } = await supabase
            .from('chat_message_read_status')
            .select('message_id, user_id')
            .eq('message_id', messageData.id)
            .eq('user_id', authSession.user.id)
            .is('read_at', null);
            
          if (readStatusError) {
            console.error('Error fetching read status:', readStatusError);
            return;
          }
          
          if (readStatusList && readStatusList.length > 0) {
            console.log(`标记当前会话新消息 ${messageData.id} 为已读`);
            
            // 使用直接更新，按复合主键更新
            const { error: updateError } = await supabase
              .from('chat_message_read_status')
              .update({ read_at: new Date().toISOString() })
              .eq('message_id', messageData.id)
              .eq('user_id', authSession.user.id);
              
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
        const { data: { session: authSession } } = await supabase.auth.getSession();
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
            "user"(*),
            attachments:chat_attachment (
              id,
              file_url,
              file_name
            )
          `)
          .eq('id', payload.new.id)
          .single();

        if (error) {
          console.error('Error fetching complete message data:', error);
          return;
        }
        
        // 检查消息是否需要标记为未读（如果发送者不是当前用户，且不是当前打开的会话）
        const isFromOtherUser = messageData.user_id !== authSession.user.id;
        const isNotCurrentSession = currentSession?.id !== payload.new.session_id;
        
        // 更新会话列表中的最后一条消息和未读计数
        setSessions(prev => {
          return prev.map(session => {
            if (session.id === payload.new.session_id) {
              // 如果是其他用户发送的消息，且不是当前打开的会话，增加未读计数
              const newUnreadCount = isFromOtherUser && isNotCurrentSession 
                ? (session.unreadCount || 0) + 1 
                : session.unreadCount || 0;
                
              return {
                ...session,
                unreadCount: newUnreadCount,
                lastMessage: {
                  ...messageData,
                  user: processAvatarUrl(messageData.user)
                }
              };
            }
            return session;
          });
        });
        
        // 如果是当前会话，且是当前用户打开的，立即标记为已读
        if (!isNotCurrentSession && isFromOtherUser) {
          // 查找此消息的未读状态记录
          const { data: readStatusList, error: readStatusError } = await supabase
            .from('chat_message_read_status')
            .select('message_id, user_id')
            .eq('message_id', messageData.id)
            .eq('user_id', authSession.user.id)
            .is('read_at', null);
            
          if (readStatusError) {
            console.error('Error fetching read status:', readStatusError);
            return;
          }
          
          if (readStatusList && readStatusList.length > 0) {
            console.log(`标记当前会话新消息 ${messageData.id} 为已读`);
            
            // 使用直接更新，按复合主键更新
            const { error: updateError } = await supabase
              .from('chat_message_read_status')
              .update({ read_at: new Date().toISOString() })
              .eq('message_id', messageData.id)
              .eq('user_id', authSession.user.id);
              
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
          const { data: { session: authSession } } = await supabase.auth.getSession();
          if (!authSession) return;
          
          // 如果是当前用户的消息读取状态
          if (payload.new.user_id === authSession.user.id) {
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
      supabase.removeChannel(readStatusChannel);
    };
  }, []);

  // 包装setCurrentSession，添加权限检查
  const setCurrentSessionWithCheck = (session) => {
    // 检查session是否在用户的会话列表中
    const isAuthorized = sessions.some(s => s.id === session?.id);
    if (session && !isAuthorized) {
      console.error('无权访问此会话');
      return;
    }
    
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
      
      // 立即标记该会话所有消息为已读
      const setMessagesRead = async () => {
        const { data: { session: authSession } } = await supabase.auth.getSession();
        if (authSession) {
          await markMessagesAsRead(session.id, authSession.user.id);
        }
      };
      
      setMessagesRead();
    }
    
    setCurrentSession(session);
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
      setChatMode
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