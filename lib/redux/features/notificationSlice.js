import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { supabase } from '@/lib/supabase';

// 用于防抖的时间戳记录
let lastFetchTimestamp = 0;
const MIN_FETCH_INTERVAL = 30000; // 最小获取间隔，30秒

// 异步操作：获取用户的通知
export const fetchNotifications = createAsyncThunk(
  'notifications/fetchNotifications',
  async (userId, { rejectWithValue, getState }) => {
    try {
      const state = getState();
      const currentTime = Date.now();
      
      // 检查是否已经在加载中
      if (state.notifications.loading) {
        return rejectWithValue('Already loading');
      }
      
      // 检查是否在最小时间间隔内
      if (currentTime - lastFetchTimestamp < MIN_FETCH_INTERVAL && state.notifications.items.length > 0) {
        // 如果距离上次获取时间不足30秒，并且已有数据，则跳过
        return state.notifications.items;
      }
      
      // 更新时间戳
      lastFetchTimestamp = currentTime;
      
      const { data, error } = await supabase
        .from('notification')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

// 异步操作：标记通知为已读
export const markNotificationAsRead = createAsyncThunk(
  'notifications/markAsRead',
  async ({ notificationId, userId }, { rejectWithValue }) => {
    try {
      const { data, error } = await supabase
        .from('notification')
        .update({ is_read: true, updated_at: new Date() })
        .eq('id', notificationId)
        .eq('user_id', userId);

      if (error) throw error;
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
      const { data, error } = await supabase
        .from('notification')
        .update({ is_read: true, updated_at: new Date() })
        .eq('user_id', userId)
        .eq('is_read', false);

      if (error) throw error;
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
      const { error } = await supabase
        .from('notification')
        .delete()
        .eq('id', notificationId)
        .eq('user_id', userId);

      if (error) throw error;
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
      const { data, error } = await supabase
        .from('notification')
        .insert(notificationData)
        .select();

      if (error) throw error;
      return data[0];
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
  },
  reducers: {
    resetNotificationState: (state) => {
      state.items = [];
      state.unreadCount = 0;
      state.loading = false;
      state.error = null;
      state.lastFetched = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // 获取通知
      .addCase(fetchNotifications.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchNotifications.fulfilled, (state, action) => {
        state.loading = false;
        // 如果返回的是相同的数据（防抖机制触发），不做更新
        if (Array.isArray(action.payload)) {
          state.items = action.payload;
          state.unreadCount = action.payload.filter(notification => !notification.is_read).length;
          state.lastFetched = new Date().toISOString();
        }
      })
      .addCase(fetchNotifications.rejected, (state, action) => {
        // 如果是因为防抖机制拒绝的，不设置错误状态
        if (action.payload !== 'Already loading') {
          state.error = action.payload;
        }
        state.loading = false;
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

export const { resetNotificationState } = notificationSlice.actions;

export const selectNotifications = (state) => state.notifications.items;
export const selectUnreadCount = (state) => state.notifications.unreadCount;
export const selectNotificationsLoading = (state) => state.notifications.loading;
export const selectNotificationsError = (state) => state.notifications.error;

export default notificationSlice.reducer; 