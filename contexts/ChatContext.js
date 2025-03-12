'use client';

import { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

const ChatContext = createContext();

export function ChatProvider({ children }) {
  const [sessions, setSessions] = useState([]);
  const [currentSession, setCurrentSession] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);

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
          participants:chat_participant(
            user:user_id (
              id,
              name,
              avatar_url,
              email
            )
          )
        ),
        user:user_id (
          id,
          name,
          avatar_url,
          email
        )
      `)
      .eq('user_id', authSession.user.id);

    if (sessionsError) {
      console.error('Error fetching chat sessions:', sessionsError);
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
        user:user_id (
          id,
          name,
          avatar_url,
          email
        )
      `)
      .in('session_id', sessionIds)
      .order('created_at', { ascending: false });

    if (messagesError) {
      console.error('Error fetching last messages:', messagesError);
    }

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
      
      return {
        ...item.chat_session,
        participants: otherParticipants,
        participantsCount: item.chat_session.participants.length,
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
  };

  // 发送消息
  const sendMessage = async (sessionId, content, replyToMessageId = null) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

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
        user:user_id (
          id,
          name,
          avatar_url,
          email
        ),
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

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <ChatContext.Provider value={{
      sessions,
      currentSession,
      setCurrentSession,
      messages,
      sendMessage,
      loading,
      fetchChatSessions
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