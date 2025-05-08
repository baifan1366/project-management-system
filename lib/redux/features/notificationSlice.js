import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { api } from '@/lib/api';
import { supabase } from '@/lib/supabase';

// Realtime subscription variables
let notificationSubscription = null;
let currentUserId = null;

// Async action: Fetch user notifications
export const fetchNotifications = createAsyncThunk(
  'notifications/fetchNotifications',
  async (userId, { rejectWithValue, dispatch }) => {
    try {
      if (!userId) {
        console.error('Failed to fetch notifications: User ID is empty');
        return rejectWithValue('User ID cannot be empty');
      }
      
      // If user ID changes, cancel old subscription
      if (currentUserId && currentUserId !== userId) {
        unsubscribeNotifications();
      }
      
      // Note: We no longer auto-subscribe here, let components handle subscriptions explicitly
      
      // Fetch initial data
      const data = await api.notifications.list(userId);
      console.log(`Successfully fetched ${data?.length || 0} notifications`);
      return data || [];
    } catch (error) {
      console.error('Failed to fetch notifications:', error.message);
      return rejectWithValue(error.message);
    }
  }
);

// Subscribe to notification updates
export const subscribeToNotifications = createAsyncThunk(
  'notifications/subscribeToNotifications',
  async (userId, { dispatch }) => {
    try {
      // Ensure previous subscription is cleaned up
      unsubscribeNotifications();
      
      console.log('Starting notification subscription, User ID:', userId);
      currentUserId = userId;
      
      // Create realtime subscription
      notificationSubscription = supabase
        .channel(`notifications:${userId}`)
        .on('postgres_changes', {
          event: '*', // Listen to all event types (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'notification',
          filter: `user_id=eq.${userId}`
        }, (payload) => {
          console.log('Received notification update:', payload);
          
          // Dispatch different actions based on event type
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
          console.log('Notification subscription status:', status);
          if (status === 'SUBSCRIBED') {
            console.log('Successfully subscribed to notification updates');
          }
        });
      
      return userId;
    } catch (error) {
      console.error('Failed to subscribe to notifications:', error);
      return null;
    }
  }
);

// Unsubscribe from notifications
export const unsubscribeFromNotifications = createAsyncThunk(
  'notifications/unsubscribeFromNotifications',
  async (_, { dispatch }) => {
    try {
      unsubscribeNotifications();
      console.log('Notification subscription cancelled');
      return true;
    } catch (error) {
      console.error('Failed to unsubscribe from notifications:', error);
      return false;
    }
  }
);

// Helper function: Unsubscribe
function unsubscribeNotifications() {
  if (notificationSubscription) {
    console.log('Cancelling existing notification subscription');
    supabase.removeChannel(notificationSubscription);
    notificationSubscription = null;
    currentUserId = null;
  }
}

// Async action: Mark notification as read
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

// Async action: Mark all notifications as read
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

// Async action: Delete notification
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

// Check user notification permissions
const checkNotificationPermission = async (userId, notificationType) => {
  try {
    // Get user notification settings
    const { data: userData, error } = await supabase
      .from('user')
      .select('notifications_settings, notifications_enabled')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Failed to get user notification settings:', error);
      return false;
    }

    // If user completely disables notifications
    if (!userData.notifications_enabled) {
      return false;
    }

    // Check specific notification type permissions
    const settings = userData.notifications_settings || {};
    switch (notificationType) {
      case 'TASK_ASSIGNED':
        return settings.taskAssignments !== false;
      case 'COMMENT_ADDED':
        return settings.taskComments !== false;
      case 'MENTION':
        return settings.mentionNotifications !== false;
      case 'SYSTEM':
        return true; // System notifications are always allowed
      case 'TEAM_INVITATION':
        return settings.teamInvitations !== false;
      case 'DUE_DATE':
        return settings.dueDates !== false;
      default:
        return true; // Default allow unknown type notifications
    }
  } catch (error) {
    console.error('Error checking notification permissions:', error);
    return false;
  }
};

// Create notification
export const createNotification = createAsyncThunk(
  'notifications/createNotification',
  async (notificationData, { rejectWithValue }) => {
    try {
      // Check user notification permissions
      const hasPermission = await checkNotificationPermission(
        notificationData.user_id,
        notificationData.type
      );

      if (!hasPermission) {
        console.log(`User ${notificationData.user_id} has disabled ${notificationData.type} type notifications`);
        return null;
      }

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
      
      // Also cancel subscription when UI resets
      unsubscribeNotifications();
    },
    // Handle new notifications received in realtime
    notificationReceived: (state, action) => {
      const newNotification = action.payload;
      
      // Check if notification with same ID already exists
      const exists = state.items.some(item => item.id === newNotification.id);
      if (!exists) {
        state.items.unshift(newNotification);
        if (!newNotification.is_read) {
          state.unreadCount += 1;
        }
      }
    },
    // Handle notification updates received in realtime
    notificationUpdated: (state, action) => {
      const updatedNotification = action.payload;
      const index = state.items.findIndex(item => item.id === updatedNotification.id);
      
      if (index !== -1) {
        // If notification changes from unread to read, update unread count
        if (!updatedNotification.is_read && state.items[index].is_read) {
          state.unreadCount -= 1;
        } else if (updatedNotification.is_read && !state.items[index].is_read) {
          state.unreadCount += 1;
        }
        
        // Update notification
        state.items[index] = updatedNotification;
      }
    },
    // Handle notification deletion received in realtime
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
      // Fetch notifications
      .addCase(fetchNotifications.pending, (state) => {
        state.loading = true;
        state.error = null;
        console.log('Notification loading status: Starting load');
      })
      .addCase(fetchNotifications.fulfilled, (state, action) => {
        state.loading = false;
        // If returned data is same (debounce mechanism triggered), don't update
        if (Array.isArray(action.payload)) {
          console.log(`Notification loading status: Load completed, ${action.payload.length} notifications`);
          state.items = action.payload;
          state.unreadCount = action.payload.filter(notification => !notification.is_read).length;
          state.lastFetched = new Date().toISOString();
        } else {
          console.log('Notification loading status: Returned data is not an array, possibly cached data or empty data');
        }
      })
      .addCase(fetchNotifications.rejected, (state, action) => {
        console.error('Notification loading status: Load failed', action.payload);
        state.error = action.payload;
        state.loading = false;
      })
      
      // Subscribe to notifications
      .addCase(subscribeToNotifications.fulfilled, (state, action) => {
        if (action.payload) {
          state.isSubscribed = true;
          console.log('Notification subscription status: Subscribed');
        }
      })
      
      // Unsubscribe from notifications
      .addCase(unsubscribeFromNotifications.fulfilled, (state) => {
        state.isSubscribed = false;
        console.log('Notification subscription status: Unsubscribed');
      })
      
      // Mark single notification as read
      .addCase(markNotificationAsRead.fulfilled, (state, action) => {
        const index = state.items.findIndex(item => item.id === action.payload);
        if (index !== -1) {
          state.items[index].is_read = true;
          state.unreadCount = state.items.filter(notification => !notification.is_read).length;
        }
      })
      
      // Mark all notifications as read
      .addCase(markAllNotificationsAsRead.fulfilled, (state) => {
        state.items.forEach(item => {
          item.is_read = true;
        });
        state.unreadCount = 0;
      })
      
      // Delete notification
      .addCase(deleteNotification.fulfilled, (state, action) => {
        const deleted = state.items.find(item => item.id === action.payload);
        state.items = state.items.filter(item => item.id !== action.payload);
        if (deleted && !deleted.is_read) {
          state.unreadCount -= 1;
        }
      })
      
      // Create notification
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