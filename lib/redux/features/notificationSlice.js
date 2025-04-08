import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { api } from '@/lib/api';
import { supabase } from '@/lib/supabase';

// 实时订阅相关变量
let notificationSubscription = null;
let currentUserId = null;

// 异步操作：获取用户的通知
export const fetchNotifications = createAsyncThunk(
  'notifications/fetchNotifications',
  async (userId, { rejectWithValue, dispatch }) => {
    try {
      if (!userId) {
        console.error('获取通知失败: 用户ID为空');
        return rejectWithValue('用户ID不能为空');
      }
      
      // 如果用户ID变更，先取消旧的订阅
      if (currentUserId && currentUserId !== userId) {
        unsubscribeNotifications();
      }
      
      // 如果没有订阅，则创建订阅
      if (!notificationSubscription) {
        dispatch(subscribeToNotifications(userId));
      }
      
      // 仍然获取一次初始数据
      const data = await api.notifications.list(userId);
      console.log(`成功获取到 ${data?.length || 0} 条通知`);
      return data || [];
    } catch (error) {
      console.error('获取通知失败:', error.message);
      return rejectWithValue(error.message);
    }
  }
);

// 订阅通知更新
export const subscribeToNotifications = createAsyncThunk(
  'notifications/subscribeToNotifications',
  async (userId, { dispatch }) => {
    try {
      // 确保之前的订阅被清理
      unsubscribeNotifications();
      
      console.log('开始订阅通知更新，用户ID:', userId);
      currentUserId = userId;
      
      // 创建实时订阅
      notificationSubscription = supabase
        .channel(`notifications:${userId}`)
        .on('postgres_changes', {
          event: '*', // 监听所有事件类型 (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'notification',
          filter: `user_id=eq.${userId}`
        }, (payload) => {
          console.log('收到通知更新:', payload);
          
          // 根据事件类型分发不同的action
          switch (payload.eventType) {
            case 'INSERT':
              dispatch(notificationReceived(payload.new));
              break;
            case 'UPDATE':
              dispatch(notificationUpdated(payload.new));
              break;
            case 'DELETE':
              dispatch(notificationDeleted(payload.old.id));
              break;
          }
        })
        .subscribe((status) => {
          console.log('通知订阅状态:', status);
          if (status === 'SUBSCRIBED') {
            console.log('已成功订阅通知更新');
          }
        });
      
      return userId;
    } catch (error) {
      console.error('订阅通知失败:', error);
      return null;
    }
  }
);

// 取消订阅通知
export const unsubscribeFromNotifications = createAsyncThunk(
  'notifications/unsubscribeFromNotifications',
  async (_, { dispatch }) => {
    try {
      unsubscribeNotifications();
      console.log('已取消通知订阅');
      return true;
    } catch (error) {
      console.error('取消通知订阅失败:', error);
      return false;
    }
  }
);

// 辅助函数：取消订阅
function unsubscribeNotifications() {
  if (notificationSubscription) {
    console.log('正在取消现有的通知订阅');
    supabase.removeChannel(notificationSubscription);
    notificationSubscription = null;
    currentUserId = null;
  }
}

// 异步操作：标记通知为已读
export const markNotificationAsRead = createAsyncThunk(
  'notifications/markAsRead',
  async ({ notificationId, userId }, { rejectWithValue }) => {
    try {
      const result = await api.notifications.markAsRead(notificationId, userId);
      return notificationId;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

// 异步操作：标记所有通知为已读
export const markAllNotificationsAsRead = createAsyncThunk(
  'notifications/markAllAsRead',
  async (userId, { rejectWithValue }) => {
    try {
      const result = await api.notifications.markAllAsRead(userId);
      return true;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

// 异步操作：删除通知
export const deleteNotification = createAsyncThunk(
  'notifications/deleteNotification',
  async ({ notificationId, userId }, { rejectWithValue }) => {
    try {
      const result = await api.notifications.delete(notificationId, userId);
      return notificationId;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

// 创建通知
export const createNotification = createAsyncThunk(
  'notifications/createNotification',
  async (notificationData, { rejectWithValue }) => {
    try {
      const newNotification = await api.notifications.create(notificationData);
      return newNotification;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

const notificationSlice = createSlice({
  name: 'notifications',
  initialState: {
    items: [],
    unreadCount: 0,
    loading: false,
    error: null,
    lastFetched: null,
    isSubscribed: false,
  },
  reducers: {
    resetNotificationState: (state) => {
      state.items = [];
      state.unreadCount = 0;
      state.loading = false;
      state.error = null;
      state.lastFetched = null;
      state.isSubscribed = false;
      
      // 在UI重置时也取消订阅
      unsubscribeNotifications();
    },
    // 处理实时接收到的新通知
    notificationReceived: (state, action) => {
      const newNotification = action.payload;
      
      // 检查是否已存在相同ID的通知
      const exists = state.items.some(item => item.id === newNotification.id);
      if (!exists) {
        state.items.unshift(newNotification);
        if (!newNotification.is_read) {
          state.unreadCount += 1;
        }
      }
    },
    // 处理实时接收到的通知更新
    notificationUpdated: (state, action) => {
      const updatedNotification = action.payload;
      const index = state.items.findIndex(item => item.id === updatedNotification.id);
      
      if (index !== -1) {
        // 如果通知从未读变为已读，更新未读计数
        if (!updatedNotification.is_read && state.items[index].is_read) {
          state.unreadCount -= 1;
        } else if (updatedNotification.is_read && !state.items[index].is_read) {
          state.unreadCount += 1;
        }
        
        // 更新通知
        state.items[index] = updatedNotification;
      }
    },
    // 处理实时接收到的通知删除
    notificationDeleted: (state, action) => {
      const deletedNotificationId = action.payload;
      const deletedNotification = state.items.find(item => item.id === deletedNotificationId);
      
      if (deletedNotification && !deletedNotification.is_read) {
        state.unreadCount -= 1;
      }
      
      state.items = state.items.filter(item => item.id !== deletedNotificationId);
    }
  },
  extraReducers: (builder) => {
    builder
      // 获取通知
      .addCase(fetchNotifications.pending, (state) => {
        state.loading = true;
        state.error = null;
        console.log('通知加载状态: 开始加载');
      })
      .addCase(fetchNotifications.fulfilled, (state, action) => {
        state.loading = false;
        // 如果返回的是相同的数据（防抖机制触发），不做更新
        if (Array.isArray(action.payload)) {
          console.log(`通知加载状态: 加载完成, 共 ${action.payload.length} 条`);
          state.items = action.payload;
          state.unreadCount = action.payload.filter(notification => !notification.is_read).length;
          state.lastFetched = new Date().toISOString();
        } else {
          console.log('通知加载状态: 返回的数据不是数组，可能是缓存数据或空数据');
        }
      })
      .addCase(fetchNotifications.rejected, (state, action) => {
        console.error('通知加载状态: 加载失败', action.payload);
        state.error = action.payload;
        state.loading = false;
      })
      
      // 订阅通知
      .addCase(subscribeToNotifications.fulfilled, (state, action) => {
        if (action.payload) {
          state.isSubscribed = true;
          console.log('通知订阅状态: 已订阅');
        }
      })
      
      // 取消订阅通知
      .addCase(unsubscribeFromNotifications.fulfilled, (state) => {
        state.isSubscribed = false;
        console.log('通知订阅状态: 已取消订阅');
      })
      
      // 标记单个通知为已读
      .addCase(markNotificationAsRead.fulfilled, (state, action) => {
        const index = state.items.findIndex(item => item.id === action.payload);
        if (index !== -1) {
          state.items[index].is_read = true;
          state.unreadCount = state.items.filter(notification => !notification.is_read).length;
        }
      })
      
      // 标记所有通知为已读
      .addCase(markAllNotificationsAsRead.fulfilled, (state) => {
        state.items.forEach(item => {
          item.is_read = true;
        });
        state.unreadCount = 0;
      })
      
      // 删除通知
      .addCase(deleteNotification.fulfilled, (state, action) => {
        const deleted = state.items.find(item => item.id === action.payload);
        state.items = state.items.filter(item => item.id !== action.payload);
        if (deleted && !deleted.is_read) {
          state.unreadCount -= 1;
        }
      })
      
      // 创建通知
      .addCase(createNotification.fulfilled, (state, action) => {
        state.items.unshift(action.payload);
        if (!action.payload.is_read) {
          state.unreadCount += 1;
        }
      });
  },
});

export const { 
  resetNotificationState,
  notificationReceived,
  notificationUpdated,
  notificationDeleted
} = notificationSlice.actions;

export const selectNotifications = (state) => state.notifications.items;
export const selectUnreadCount = (state) => state.notifications.unreadCount;
export const selectNotificationsLoading = (state) => state.notifications.loading;
export const selectNotificationsError = (state) => state.notifications.error;
export const selectIsSubscribed = (state) => state.notifications.isSubscribed;

export default notificationSlice.reducer; 