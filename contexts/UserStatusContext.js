'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import useGetUser from '@/lib/hooks/useGetUser';
import { toast } from 'sonner';

const UserStatusContext = createContext();

export function UserStatusProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [isOnline, setIsOnline] = useState(false);
  const [lastSeen, setLastSeen] = useState(null);
  // 添加跟踪其他用户状态的状态
  const [usersStatus, setUsersStatus] = useState({});
  // Add subscription status tracking
  const [subscriptionStatus, setSubscriptionStatus] = useState({
    isActive: false,
    plan: null,
    expiresAt: null,
    autoRenewEnabled: false,
    isExpiringSoon: false,
    lastRenewalAttempt: null,
    renewalStatus: null
  });
  const { user } = useGetUser();

  // 获取当前用户信息
  useEffect(() => {
    if (user) {
      setCurrentUser(user);
      setIsOnline(user.is_online || false);
      setLastSeen(user.last_seen_at);
      
      // Check subscription status when user is set
      checkSubscriptionStatus(user.id);
    }
  }, [user]);

  // Check user's subscription status
  const checkSubscriptionStatus = async (userId) => {
    if (!userId) return;
    
    try {
      // Get user's auto-renew preference and timezone
      const { data: userData, error: userError } = await supabase
        .from('user')
        .select('auto_renew_enabled, timezone')
        .eq('id', userId)
        .single();
        
      if (userError) {
        console.error('Error fetching user auto-renew preference:', userError);
        return;
      }

      console.log('User data:', userData);

      // Get user's active subscription - don't use single() to avoid 406 errors
      const { data: subscriptions, error: subscriptionError } = await supabase
        .from('user_subscription_plan')
        .select(`
          id, 
          plan_id, 
          status, 
          start_date, 
          end_date,
          auto_renew,
          last_renewal_attempt,
          renewal_failure_count,
          plan:plan_id (
            name,
            type,
            price,
            billing_interval
          )
        `)
        .eq('user_id', userId)
        .or('status.eq.ACTIVE,status.eq.active')
        .order('created_at', { ascending: false })
        .limit(1);
      
      if (subscriptionError) {
        console.error('Error fetching subscription:', subscriptionError);
        return;
      }

      console.log('Subscription query results:', {
        userId,
        subscriptions,
        query: `SELECT * FROM user_subscription_plan WHERE user_id = '${userId}' AND status = 'ACTIVE' ORDER BY created_at DESC LIMIT 1`
      });

      // Check if we have a subscription
      if (subscriptions && subscriptions.length > 0) {
        const subscription = subscriptions[0];
        
        // Calculate if subscription is expiring soon (within 7 days)
        const endDate = new Date(subscription.end_date);
        const now = new Date();
        const sevenDaysFromNow = new Date();
        sevenDaysFromNow.setDate(now.getDate() + 7);
        
        const isExpiringSoon = endDate <= sevenDaysFromNow && endDate > now;
        
        // Determine renewal status
        let renewalStatus = 'PENDING';
        if (subscription.renewal_failure_count > 0) {
          renewalStatus = 'FAILED';
        } else if (subscription.last_renewal_attempt) {
          const lastAttempt = new Date(subscription.last_renewal_attempt);
          const oneHourAgo = new Date();
          oneHourAgo.setHours(oneHourAgo.getHours() - 1);
          
          if (lastAttempt > oneHourAgo) {
            renewalStatus = 'PROCESSING';
          }
        }
        
        setSubscriptionStatus({
          isActive: true,
          plan: subscription.plan,
          expiresAt: subscription.end_date,
          autoRenewEnabled: userData.auto_renew_enabled && subscription.auto_renew,
          isExpiringSoon,
          lastRenewalAttempt: subscription.last_renewal_attempt,
          renewalFailureCount: subscription.renewal_failure_count || 0,
          renewalStatus,
          timezone: userData.timezone || 'UTC+0'
        });
      } else {
        // No active subscription
        setSubscriptionStatus({
          isActive: false,
          plan: null,
          expiresAt: null,
          autoRenewEnabled: userData?.auto_renew_enabled || false,
          isExpiringSoon: false,
          lastRenewalAttempt: null,
          renewalFailureCount: 0,
          renewalStatus: null,
          timezone: userData.timezone || 'UTC+0'
        });
      }
    } catch (error) {
      console.error('Error checking subscription status:', error);
      // Set default values in case of error
      setSubscriptionStatus({
        isActive: false,
        plan: null,
        expiresAt: null,
        autoRenewEnabled: false,
        isExpiringSoon: false,
        lastRenewalAttempt: null,
        renewalFailureCount: 0,
        renewalStatus: null,
        timezone: 'UTC+0'
      });
    }
  };

  // 发送心跳信号
  const sendHeartbeat = async () => {
    if (!currentUser?.id) return;
    
    try {
      const response = await fetch('/api/users/heartbeat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        setIsOnline(true);
        setLastSeen(new Date().toISOString());
        
        // Periodically check subscription status (less frequently than heartbeat)
        if (Math.random() < 0.1) { // 10% chance on each heartbeat to check subscription
          checkSubscriptionStatus(currentUser.id);
        }
      }
    } catch (error) {
      console.error('Failed to send heartbeat:', error);
    }
  };

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

  // Toggle auto-renewal for subscriptions
  const toggleAutoRenewal = async (enabled) => {
    if (!currentUser?.id) return false;
    
    try {
      console.log(`Attempting to set auto-renewal to ${enabled} for user ${currentUser.id}`);
      
      // First check if user has a payment method if enabling auto-renewal
      if (enabled) {
        const paymentMethodResponse = await fetch('/api/payment-methods');
        const paymentMethodData = await paymentMethodResponse.json();
        
        console.log('Payment methods:', paymentMethodData);
        
        if (!paymentMethodResponse.ok || !paymentMethodData.payment_methods || paymentMethodData.payment_methods.length === 0) {
          console.error('No payment methods available for auto-renewal');
          toast.error('You need to add a payment method before enabling auto-renewal');
          return false;
        }
      }
      
      const response = await fetch('/api/subscription/auto-renew', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ enabled }),
      });
      
      const responseText = await response.text();
      console.log('Auto-renewal API response:', { 
        status: response.status, 
        ok: response.ok,
        text: responseText 
      });
      
      // Parse the response as JSON (if it is JSON)
      let result;
      try {
        result = JSON.parse(responseText);
      } catch (parseError) {
        console.error('Error parsing response as JSON:', parseError);
        throw new Error('Invalid response format');
      }
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to update auto-renewal preference');
      }
      
      // Update local state with the returned value from the server
      setSubscriptionStatus(prev => ({
        ...prev,
        autoRenewEnabled: result.auto_renew_enabled
      }));
      
      return true;
    } catch (error) {
      console.error('Error toggling auto-renewal:', error);
      return false;
    }
  };

  // 定期更新用户在线状态
  useEffect(() => {
    if (!currentUser) return;
    
    // 首次加载时发送心跳
    sendHeartbeat();
    
    // 设置定时器，每100秒发送一次心跳
    const intervalId = setInterval(sendHeartbeat, 600000);
    
    // 页面可见性变化时更新
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        sendHeartbeat();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // 用户离线时更新状态 - 保留但不再是主要机制
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

  // Monitor subscription changes
  useEffect(() => {
    if (!currentUser?.id) return;
    
    const subscriptionChannel = supabase
      .channel('subscription_changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'user_subscription_plan',
        filter: `user_id=eq.${currentUser.id}`,
      }, () => {
        // Refresh subscription status when changes occur
        checkSubscriptionStatus(currentUser.id);
      })
      .subscribe();
      
    return () => {
      supabase.removeChannel(subscriptionChannel);
    };
  }, [currentUser]);

  return (
    <UserStatusContext.Provider 
      value={{ 
        currentUser,
        isOnline,
        lastSeen,
        updateUserOnlineStatus,
        setUserOffline,
        getUserStatus,
        usersStatus,
        subscriptionStatus,
        checkSubscriptionStatus,
        toggleAutoRenewal
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