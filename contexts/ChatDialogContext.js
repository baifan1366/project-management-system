'use client';

import { createContext, useContext, useState, useEffect } from 'react';
import { useChat } from './ChatContext';
import { supabase } from '@/lib/supabase';
import ChatDialog from '@/components/chat/ChatDialog';
import { usePathname } from 'next/navigation';
import useGetUser from '@/lib/hooks/useGetUser';

const ChatDialogContext = createContext();

export function ChatDialogProvider({ children }) {
  const [openDialogs, setOpenDialogs] = useState([]);
  const { currentSession } = useChat();
  const { user:currentUser } = useGetUser();
  const pathname = usePathname();
  const [isMobileView, setIsMobileView] = useState(false);
  // Add state for caching user's session participations
  const [userSessionsCache, setUserSessionsCache] = useState(new Set());
  
  // Check if user is a participant in a session
  const isSessionParticipant = (sessionId) => {
    return userSessionsCache.has(sessionId);
  };
  
  // Fetch and cache all sessions the user is participating in
  const fetchUserSessionParticipations = async () => {
    if (!currentUser) return;
    
    try {
      const { data, error } = await supabase
        .from('chat_participant')
        .select('session_id')
        .eq('user_id', currentUser.id);
      
      if (error) {
        console.error('Error fetching user session participations:', error);
        return;
      }
      
      if (data) {
        const sessionIds = data.map(item => item.session_id);
        setUserSessionsCache(new Set(sessionIds));
      }
    } catch (err) {
      console.error('Error caching user sessions:', err);
    }
  };
  
  // Refresh cache when user changes
  useEffect(() => {
    if (currentUser) {
      fetchUserSessionParticipations();
    }
  }, [currentUser]);
  
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
            // 使用缓存检查用户是否是该会话的参与者
            if (!isSessionParticipant(payload.new.session_id)) {
              console.log('User is not a participant in this chat session');
              return;
            }

            // 获取发送者信息
            const { data: senderData } = await supabase
              .from('user')
              .select('*')
              .eq('id', payload.new.user_id)
              .single();

            // 获取会话信息
            const { data: sessionData } = await supabase
              .from('chat_session')
              .select(`*,
                participants:chat_participant(
                  user:user_id (
                    id,
                    name,
                    avatar_url,
                    email,
                    is_online
                  )
                )`)
              .eq('id', payload.new.session_id)
              .single();

            if (!senderData || !sessionData) {
              console.error('Failed to fetch user or session data');
              return;
            }

            // 打开或更新对话框
            setOpenDialogs(prev => {
              // 检查对话框是否已经打开
              const existingIndex = prev.findIndex(d => d.sessionId === payload.new.session_id);
              
              if (existingIndex !== -1) {
                // 如果对话框已存在但不是打开状态，设为打开
                if (!prev[existingIndex].isOpen) {
                  const updated = [...prev];
                  updated[existingIndex] = {
                    ...updated[existingIndex],
                    isOpen: true,
                    isMinimized: false
                  };
                  return updated;
                }
                // 如果已经是打开状态，不做更改
                return prev;
              }
              
              // 判断是否为私聊，以及获取对话用户信息
              let chatUser;
              let chatSessionName = sessionData.name;
              
              if (sessionData.type === 'PRIVATE') {
                // 私聊，找到对方用户
                const otherParticipant = sessionData.participants.find(
                  p => p.user?.id !== currentUser?.id
                );
                
                if (otherParticipant && otherParticipant.user) {
                  chatUser = {
                    id: otherParticipant.user.id,
                    name: otherParticipant.user.name,
                    avatar_url: otherParticipant.user.avatar_url || otherParticipant.user.name.charAt(0),
                    email: otherParticipant.user.email,
                    online: otherParticipant.user.is_online || false
                  };
                  // 私聊不需要sessionName
                  chatSessionName = null;
                } else {
                  // 如果找不到对方用户，使用发送者信息（临时方案）
                  chatUser = {
                    name: senderData.name,
                    avatar_url: senderData.avatar_url || senderData.name.charAt(0),
                    online: true,
                    id: senderData.id
                  };
                }
              } else {
                // 群聊，使用发送者信息
                chatUser = {
                  name: senderData.name,
                  avatar_url: senderData.avatar_url || senderData.name.charAt(0),
                  online: true,
                  id: senderData.id
                };
              }
              
              // 如果是新对话框，添加到数组末尾
              const newDialog = {
                sessionId: payload.new.session_id,
                user: chatUser,
                sessionName: chatSessionName,
                isOpen: true,
                isMinimized: false
              };
              
              // 在移动设备上，关闭其他所有对话框
              if (isMobileView) {
                return [newDialog];
              }
              
              // 在桌面设备上，添加到现有对话框列表
              return [...prev, newDialog];
            });
          }
        } catch (error) {
          console.error('Error processing new message:', error);
        }
      })
      .subscribe();

    // 当会话发生变化时（新的会话创建或删除）时更新缓存
    const participantChannel = supabase
      .channel('chat_participant_changes')
      .on('postgres_changes', {
        event: '*',  // Listen for all event types
        schema: 'public',
        table: 'chat_participant',
        filter: `user_id=eq.${currentUser.id}`
      }, () => {
        // Update our cache when participant records change
        fetchUserSessionParticipations();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(participantChannel);
    };
  }, [currentUser, currentSession, pathname, isMobileView, userSessionsCache]);

  // 当切换到某个会话时，关闭对应的弹出对话框
  useEffect(() => {
    if (currentSession) {
      setOpenDialogs(prev => {
        const updatedDialogs = prev.map(dialog => {
          if (dialog.sessionId === currentSession.id) {
            return { ...dialog, isOpen: false };
          }
          return dialog;
        });
        return updatedDialogs;
      });
    }
  }, [currentSession]);

  const openDialog = (sessionId, user, sessionName) => {
    // 如果是当前会话，不打开对话框
    if (sessionId === currentSession?.id) return;

    setOpenDialogs(prev => {
      // 查找是否已经存在这个对话框
      const existingIndex = prev.findIndex(d => d.sessionId === sessionId);
      
      // 生成新的对话框列表
      let newDialogs = [...prev];
      
      if (existingIndex !== -1) {
        // 更新已存在的对话框
        newDialogs[existingIndex] = {
          ...newDialogs[existingIndex],
          isOpen: true,
          isMinimized: false
        };
      } else {
        // 确保提供的用户不是当前用户（针对私聊修复）
        // 对于私聊，user应该是对方的信息，而不是当前用户的信息
        if (!sessionName && user.id === currentUser.id) {
          console.error('Private chat dialog: Cannot use current user as the dialog user');
          return prev; // 不创建对话框，因为数据无效
        }
        
        // 添加新的对话框
        const newDialog = {
          sessionId,
          user,
          sessionName,
          isOpen: true,
          isMinimized: false
        };
        newDialogs = [...newDialogs, newDialog];
      }
      
      // 在移动设备上，仅保留当前打开的对话框
      if (isMobileView) {
        newDialogs = newDialogs.map(dialog => {
          if (dialog.sessionId !== sessionId) {
            return { ...dialog, isOpen: false };
          }
          return dialog;
        });
      }
      
      return newDialogs;
    });
  };

  const closeDialog = (sessionId) => {
    setOpenDialogs(prev => {
      const updatedDialogs = prev.map(dialog => {
        if (dialog.sessionId === sessionId) {
          return { ...dialog, isOpen: false };
        }
        return dialog;
      });
      
      // 过滤出仍然打开的对话框
      const stillOpen = updatedDialogs.filter(d => d.isOpen);
      
      // 如果没有打开的对话框，直接返回更新后的数组
      if (stillOpen.length === 0) {
        return updatedDialogs;
      }
      
      // 如果已删除所有对话框或只有一个，不需要特别处理
      return updatedDialogs;
    });
  };

  const minimizeDialog = (sessionId) => {
    setOpenDialogs(prev => {
      return prev.map(dialog => {
        if (dialog.sessionId === sessionId) {
          return { ...dialog, isMinimized: !dialog.isMinimized };
        }
        return dialog;
      });
    });
  };

  // 获取打开的对话框列表，并计算它们的位置
  const visibleDialogs = openDialogs.filter(dialog => dialog.isOpen).map((dialog, index) => ({
    ...dialog,
    position: index
  }));

  return (
    <ChatDialogContext.Provider value={{ openDialog, closeDialog, minimizeDialog }}>
      {children}
      {/* 渲染所有打开的对话框 */}
      {visibleDialogs.map((dialog, index) => (
        <ChatDialog
          key={dialog.sessionId}
          isOpen={true}
          sessionId={dialog.sessionId}
          user={dialog.user}
          sessionName={dialog.sessionName}
          isMinimized={dialog.isMinimized}
          position={index} // 使用数组索引作为位置，保证连续
          onClose={() => closeDialog(dialog.sessionId)}
          onMinimize={() => minimizeDialog(dialog.sessionId)}
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