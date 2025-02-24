'use client';

import { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

const ChatContext = createContext();

export function ChatProvider({ children }) {
  const [sessions, setSessions] = useState([]);
  const [currentSession, setCurrentSession] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);

  // 获取聊天会话列表
  const fetchChatSessions = async () => {
    const { data: { session: authSession } } = await supabase.auth.getSession();
    if (!authSession) return;

    const { data, error } = await supabase
      .from('chat_participant')
      .select(`
        session_id,
        chat_session (
          id,
          type,
          name,
          team_id,
          created_at,
          updated_at
        ),
        user:user_id (
          id,
          name,
          avatar_url,
          email
        )
      `)
      .eq('user_id', authSession.user.id);

    if (error) {
      console.error('Error fetching chat sessions:', error);
      return;
    }

    setSessions(data.map(item => ({
      ...item.chat_session,
      participants: [item.user]
    })));
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

    setMessages(data);
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
      .select()
      .single();

    if (error) {
      console.error('Error sending message:', error);
      return;
    }

    setMessages(prev => [...prev, data]);
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
      }, (payload) => {
        setMessages(prev => [...prev, payload.new]);
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
  }, []);

  return (
    <ChatContext.Provider value={{
      sessions,
      currentSession,
      setCurrentSession,
      messages,
      sendMessage,
      loading
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