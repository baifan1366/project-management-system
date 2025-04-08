'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

const UserStatusContext = createContext();

export function UserStatusProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [isOnline, setIsOnline] = useState(false);
  const [lastSeen, setLastSeen] = useState(null);
  // 添加跟踪其他用户状态的状态
  const [usersStatus, setUsersStatus] = useState({});

  // 获取当前用户信息
  useEffect(() => {
    const fetchCurrentUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        // 获取用户的完整信息
        const { data: userData, error } = await supabase
          .from('user')
          .select('*')
          .eq('id', session.user.id)
          .single();
          
        if (!error && userData) {
          setCurrentUser(userData);
          setIsOnline(userData.is_online || false);
          setLastSeen(userData.last_seen_at);
        }
      }
    };
    
    fetchCurrentUser();
  }, []);

  // 更新当前用户的在线状态
  const updateUserOnlineStatus = async () => {
    if (!currentUser?.id) return;
    
    // 更新用户为在线状态
    await supabase
      .from('user')
      .update({ 
        is_online: true, 
        last_seen_at: new Date().toISOString() 
      })
      .eq('id', currentUser.id);
    
    setIsOnline(true);
    setLastSeen(new Date().toISOString());
  };

  // 设置用户离线状态
  const setUserOffline = async () => {
    if (!currentUser?.id) return;
    
    // 更新用户为离线状态
    await supabase
      .from('user')
      .update({ 
        is_online: false, 
        last_seen_at: new Date().toISOString() 
      })
      .eq('id', currentUser.id);
    
    setIsOnline(false);
    setLastSeen(new Date().toISOString());
  };

  // 添加获取用户状态的函数
  const getUserStatus = useCallback(async (userId) => {
    if (!userId) return null;
    
    try {
      // 首先检查缓存中是否已有该用户状态
      if (usersStatus[userId] && (new Date() - new Date(usersStatus[userId].lastUpdated) < 30000)) {
        return usersStatus[userId];
      }
      
      // 如果没有缓存或缓存已过期，则从服务器获取
      const { data, error } = await supabase
        .from('user')
        .select('id, is_online, last_seen_at')
        .eq('id', userId)
        .single();
        
      if (error) {
        console.error('获取用户状态出错:', error);
        return null;
      }
        
      if (data) {
        const userStatus = {
          isOnline: data.is_online || false,
          lastSeen: data.last_seen_at,
          lastUpdated: new Date().toISOString()
        };
        
        // 更新状态缓存
        setUsersStatus(prev => ({
          ...prev,
          [userId]: userStatus
        }));
        
        return userStatus;
      }
      
      return null;
    } catch (error) {
      console.error('获取用户状态失败:', error);
      return null;
    }
  }, [usersStatus]);

  // 定期更新用户在线状态
  useEffect(() => {
    if (!currentUser) return;
    
    // 首次加载时更新
    updateUserOnlineStatus();
    
    // 设置定时器，每分钟更新一次在线状态
    const intervalId = setInterval(updateUserOnlineStatus, 60000);
    
    // 页面可见性变化时更新
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        updateUserOnlineStatus();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // 用户离线时更新状态
    const updateOfflineStatus = async () => {
      await setUserOffline();
    };
    
    window.addEventListener('beforeunload', updateOfflineStatus);
    
    return () => {
      clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', updateOfflineStatus);
      updateOfflineStatus();
    };
  }, [currentUser]);

  // 监听其他用户的在线状态变化
  useEffect(() => {
    const channel = supabase
      .channel('user_status')
      .on('postgres_changes', {
        event: '*', // 监听所有事件
        schema: 'public',
        table: 'user',
        filter: 'is_online=eq.true OR is_online=eq.false',
      }, (payload) => {
        // 当有用户状态更新时，更新本地状态
        if (payload.new && payload.new.id) {
          const userId = payload.new.id;
          setUsersStatus(prev => ({
            ...prev,
            [userId]: {
              isOnline: payload.new.is_online || false,
              lastSeen: payload.new.last_seen_at,
              lastUpdated: new Date().toISOString()
            }
          }));
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <UserStatusContext.Provider 
      value={{ 
        currentUser,
        isOnline,
        lastSeen,
        updateUserOnlineStatus,
        setUserOffline,
        getUserStatus,
        usersStatus
      }}
    >
      {children}
    </UserStatusContext.Provider>
  );
}

export function useUserStatus() {
  const context = useContext(UserStatusContext);
  if (!context) {
    throw new Error('useUserStatus must be used within a UserStatusProvider');
  }
  return context;
} 