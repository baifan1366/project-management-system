'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export function useChat() {
  const [sessions, setSessions] = useState([]);
  const [currentSession, setCurrentSession] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);

  // 获取聊天会话列表
  const fetchChatSessions = async () => {
    const { data: { session: authSession } } = await supabase.auth.getSession();
    if (!authSession) return;
    {console.log(authSession);}
    // 获取用户参与的所有会话
    const { data: participantData, error: participantError } = await supabase
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
        )
      `)
      .eq('user_id', authSession.user.id);

    if (participantError) {
      console.error('Error fetching chat sessions:', participantError);
      return;
    }

    // 获取每个会话的参与者信息
    const sessionsWithParticipants = await Promise.all(
      participantData.map(async (item) => {
        const { data: participants, error: participantsError } = await supabase
          .from('chat_participant')
          .select(`
            user:user_id (
              id,
              name,
              avatar_url,
              email
            )
          `)
          .eq('session_id', item.chat_session.id);

        if (participantsError) {
          console.error('Error fetching participants:', participantsError);
          return null;
        }

        // 获取最后一条消息
        const { data: lastMessage, error: messageError } = await supabase
          .from('chat_message')
          .select('*')
          .eq('session_id', item.chat_session.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        return {
          ...item.chat_session,
          participants: participants.map(p => p.user),
          lastMessage
        };
      })
    );

    setSessions(sessionsWithParticipants.filter(Boolean));
    setLoading(false);
  };

  // 获取会话消息
  const fetchMessages = async (sessionId) => {
    if (!sessionId) return;

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

  // 监听当前会话变化
  useEffect(() => {
    if (currentSession) {
      fetchMessages(currentSession.id);
    }
  }, [currentSession]);

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

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentSession]);

  // 初始加载
  useEffect(() => {
    fetchChatSessions();
  }, []);

  return {
    sessions,
    currentSession,
    setCurrentSession,
    messages,
    sendMessage,
    loading
  };
} 