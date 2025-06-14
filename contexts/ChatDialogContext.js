'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useChat } from './ChatContext';
import { supabase } from '@/lib/supabase';
import ChatDialog from '@/components/chat/ChatDialog';
import { usePathname } from 'next/navigation';
import useGetUser from '@/lib/hooks/useGetUser';

const ChatDialogContext = createContext();

export function ChatDialogProvider({ children }) {
  const [openDialogs, setOpenDialogs] = useState(new Map());
  const { messages, sendMessage, currentSession, setCurrentSession } = useChat();
  const { user:currentUser } = useGetUser();
  const pathname = usePathname();
  const [isMobileView, setIsMobileView] = useState(false);
  
  // Check for mobile view
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
          if (payload.new.user_id !== currentUser.id && payload.new.session_id !== currentSession?.id) {
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
                  sessionName: sessionData.name,
                  isMinimized: false,
                  position: newMap.size // 设置新对话框的position
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

  // 重新计算位置，确保没有空缺
  const recalculatePositions = useCallback(() => {
    let position = 0;
    const activeDialogs = Array.from(openDialogs.entries())
      .filter(([_, dialog]) => dialog.isOpen)
      .sort((a, b) => (a[1].position || 0) - (b[1].position || 0));

    const updatedDialogs = new Map(openDialogs);
    
    activeDialogs.forEach(([sessionId, dialog]) => {
      updatedDialogs.set(sessionId, {
        ...dialog,
        position: position++
      });
    });
    
    return updatedDialogs;
  }, [openDialogs]);

  const openDialog = (sessionId, user, sessionName) => {
    // 如果是当前会话，不打开对话框
    if (sessionId === currentSession?.id) return;

    setOpenDialogs(prev => {
      const newMap = new Map(prev);
      const existingDialog = newMap.get(sessionId);
      
      // 在移动设备上，限制同时打开的对话框数量为1个
      if (isMobileView) {
        // 关闭所有其他对话框，只保留当前打开的
        newMap.forEach((dialog, id) => {
          if (id !== sessionId && dialog.isOpen) {
            dialog.isOpen = false;
          }
        });
      }
      
      if (existingDialog) {
        // 更新已存在的对话框
        newMap.set(sessionId, {
          ...existingDialog,
          isOpen: true,
          isMinimized: false
        });
      } else {
        // 创建新的对话框，位置为当前打开对话框数量
        const openCount = Array.from(newMap.values()).filter(d => d.isOpen).length;
        newMap.set(sessionId, {
          isOpen: true,
          sessionId,
          user,
          sessionName,
          isMinimized: false,
          position: openCount // 设置新对话框的位置
        });
      }
      
      // 重新计算所有打开对话框的位置
      return recalculatePositions();
    });
  };

  const closeDialog = (sessionId) => {
    setOpenDialogs(prev => {
      const newMap = new Map(prev);
      if (newMap.has(sessionId)) {
        newMap.get(sessionId).isOpen = false;
      }
      
      // 重新计算所有打开对话框的位置
      return recalculatePositions();
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
      {Array.from(openDialogs.entries())
        .filter(([_, dialog]) => dialog.isOpen)
        .map(([sessionId, dialog]) => (
          <ChatDialog
            key={sessionId}
            isOpen={true}
            sessionId={sessionId}
            user={dialog.user}
            sessionName={dialog.sessionName}
            isMinimized={dialog.isMinimized}
            position={dialog.position || 0}
            onClose={() => closeDialog(sessionId)}
            onMinimize={() => minimizeDialog(sessionId)}
          />
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