'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useChat } from './ChatContext';
import { supabase } from '@/lib/supabase';
import ChatDialog from '@/components/ChatDialog';
import { usePathname } from 'next/navigation';

const ChatDialogContext = createContext();

export function ChatDialogProvider({ children }) {
  const [openDialogs, setOpenDialogs] = useState(new Map());
  const { messages, sendMessage, currentSession, setCurrentSession } = useChat();
  const [currentUser, setCurrentUser] = useState(null);
  const pathname = usePathname();
  
  // 获取当前用户
  useEffect(() => {
    const getUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setCurrentUser(session.user);
      }
    };
    getUser();
  }, []);

  // 监听新消息
  useEffect(() => {
    if (!currentUser) return;

    const channel = supabase
      .channel('chat_notifications')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_message',
      }, async (payload) => {
        try {
          // 如果在聊天页面，不显示对话框
          if (pathname.includes('/chat')) return;
          
          // 如果消息不是自己发的，且不是当前打开的会话，则显示对话框
          if (payload.new.user_id !== currentUser.id) {
            // 获取发送者信息
            const { data: senderData } = await supabase
              .from('user')
              .select('*')
              .eq('id', payload.new.user_id)
              .single();

            // 获取会话信息
            const { data: sessionData } = await supabase
              .from('chat_session')
              .select('*')
              .eq('id', payload.new.session_id)
              .single();

            if (!senderData || !sessionData) {
              console.error('Failed to fetch user or session data');
              return;
            }

            // 打开或更新对话框
            setOpenDialogs(prev => {
              const newMap = new Map(prev);
              // 如果对话框已经打开，就不要重新打开
              if (!newMap.has(payload.new.session_id) || !newMap.get(payload.new.session_id).isOpen) {
                newMap.set(payload.new.session_id, {
                  isOpen: true,
                  sessionId: payload.new.session_id,
                  user: {
                    name: senderData.name,
                    avatar_url: senderData.avatar_url || senderData.name.charAt(0),
                    online: true
                  },
                  sessionName: sessionData.name
                });
              }
              return newMap;
            });
          }
        } catch (error) {
          console.error('Error processing new message:', error);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUser, currentSession, pathname]);

  // 当切换到某个会话时，关闭对应的弹出对话框
  useEffect(() => {
    if (currentSession) {
      setOpenDialogs(prev => {
        const newMap = new Map(prev);
        if (newMap.has(currentSession.id)) {
          newMap.get(currentSession.id).isOpen = false;
        }
        return newMap;
      });
    }
  }, [currentSession]);

  const openDialog = (sessionId, user, sessionName) => {
    // 如果是当前会话，不打开对话框
    if (sessionId === currentSession?.id) return;

    setOpenDialogs(prev => {
      const newMap = new Map(prev);
      newMap.set(sessionId, {
        isOpen: true,
        sessionId,
        user,
        sessionName
      });
      return newMap;
    });
  };

  const closeDialog = (sessionId) => {
    setOpenDialogs(prev => {
      const newMap = new Map(prev);
      if (newMap.has(sessionId)) {
        newMap.get(sessionId).isOpen = false;
      }
      return newMap;
    });
  };

  const minimizeDialog = (sessionId) => {
    setOpenDialogs(prev => {
      const newMap = new Map(prev);
      if (newMap.has(sessionId)) {
        const dialog = newMap.get(sessionId);
        newMap.set(sessionId, {
          ...dialog,
          isMinimized: !dialog.isMinimized
        });
      }
      return newMap;
    });
  };

  return (
    <ChatDialogContext.Provider value={{ openDialog, closeDialog, minimizeDialog }}>
      {children}
      {/* 渲染所有打开的对话框 */}
      {Array.from(openDialogs.entries()).map(([sessionId, dialog]) => (
        dialog.isOpen && (
          <ChatDialog
            key={sessionId}
            isOpen={true}
            sessionId={sessionId}
            user={dialog.user}
            sessionName={dialog.sessionName}
            isMinimized={dialog.isMinimized}
            onClose={() => closeDialog(sessionId)}
            onMinimize={() => minimizeDialog(sessionId)}
          />
        )
      ))}
    </ChatDialogContext.Provider>
  );
}

export function useChatDialog() {
  const context = useContext(ChatDialogContext);
  if (!context) {
    throw new Error('useChatDialog must be used within a ChatDialogProvider');
  }
  return context;
} 