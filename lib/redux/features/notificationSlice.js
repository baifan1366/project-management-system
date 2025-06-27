import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { api } from '@/lib/api';
import { supabase } from '@/lib/supabase';

// Realtime subscription variables
let notificationSubscription = null;
let currentUserId = null;
let subscriptionCheckInterval = null;
let isSubscriptionInProgress = false; // Flag to prevent concurrent subscription attempts

// Debounce handling for fetch requests
let lastFetchTime = null;
let lastFetchUserId = null;
const FETCH_DEBOUNCE_MS = 5000; // 5 seconds
const SUBSCRIPTION_CHECK_INTERVAL_MS = 30000; // 30 seconds

// Helper function: Check subscription status and reconnect if needed
export const checkSubscriptionStatus = createAsyncThunk(
  'notifications/checkSubscriptionStatus',
  async (_, { dispatch, getState }) => {
    try {
      const state = getState();
      
      // Only check if we're supposed to be subscribed
      if (state.notifications.isSubscribed) {
        // If we think we're subscribed but don't have a subscription object
        if (!notificationSubscription || !currentUserId) {
          
          const userId = currentUserId || state.auth?.user?.id;
          if (userId) {
            
            dispatch(subscribeToNotifications(userId));
          }
          return false;
        }
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error checking subscription status:', error);
      return false;
    }
  }
);

// Async action: Fetch user notifications
export const fetchNotifications = createAsyncThunk(
  'notifications/fetchNotifications',
  async (userId, { rejectWithValue, dispatch, getState }) => {
    try {
      if (!userId) {
        console.error('Failed to fetch notifications: User ID is empty');
        return rejectWithValue('User ID cannot be empty');
      }
      
      // Debounce requests - if a fetch was recently done for this user, skip
      const now = Date.now();
      if (lastFetchTime && lastFetchUserId === userId && now - lastFetchTime < FETCH_DEBOUNCE_MS) {
        
        // Instead of returning null (which would skip state update), return the current data
        const currentState = getState();
        return currentState.notifications.items || [];
      }
      
      // Set last fetch time and user ID
      lastFetchTime = now;
      lastFetchUserId = userId;
      
      // If user ID changes, cancel old subscription
      if (currentUserId && currentUserId !== userId) {
        unsubscribeNotifications();
      }
      
      // Fetch initial data
      const data = await api.notifications.list(userId);
      
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
  async (userId, { dispatch, getState }) => {
    try {
      // Validate userId
      if (!userId) {
        console.error('Cannot subscribe to notifications: User ID is empty');
        return null;
      }

      const state = getState();
      
      // Enhanced check for existing subscription
      if (isSubscriptionInProgress) {
        
        return { userId }; // Return userId in object to ensure consistent action payload
      }
      
      // Check if already subscribed with the same user ID
      if (state.notifications.isSubscribed && currentUserId === userId && notificationSubscription) {
        
        return { userId }; // Return userId in object to ensure consistent action payload
      }
      
      // Set flag to indicate subscription attempt is in progress
      isSubscriptionInProgress = true;
      
      // Ensure previous subscription is cleaned up
      unsubscribeNotifications();
      
      
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
          
          if (status === 'SUBSCRIBED') {
            
            
            // Start subscription health check interval
            clearInterval(subscriptionCheckInterval);
            subscriptionCheckInterval = setInterval(() => {
              dispatch(checkSubscriptionStatus());
            }, SUBSCRIPTION_CHECK_INTERVAL_MS);
            
            // Reset in-progress flag once subscription is complete
            isSubscriptionInProgress = false;
          }
        });
      
      return { userId }; // Return userId in object to ensure consistent action payload
    } catch (error) {
      console.error('Failed to subscribe to notifications:', error);
      // Reset in-progress flag on error
      isSubscriptionInProgress = false;
      return null;
    }
  }
);

// Unsubscribe from notifications
export const unsubscribeFromNotifications = createAsyncThunk(
  'notifications/unsubscribeFromNotifications',
  async (_, { dispatch, getState }) => {
    try {
      // Get userId from currentUserId or state before unsubscribing
      const userId = currentUserId || getState().auth?.user?.id || 'system';
      
      unsubscribeNotifications();
      // Clear subscription check interval
      clearInterval(subscriptionCheckInterval);
      subscriptionCheckInterval = null;
      
      return { userId }; // Return userId in object to ensure consistent action payload
    } catch (error) {
      console.error('Failed to unsubscribe from notifications:', error);
      return { success: false };
    }
  }
);

// Helper function: Unsubscribe
function unsubscribeNotifications() {
  if (notificationSubscription) {
    
    supabase.removeChannel(notificationSubscription);
    notificationSubscription = null;
    currentUserId = null;
    isSubscriptionInProgress = false; // Reset in-progress flag when unsubscribing
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
      .select('notifications_settings')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Failed to get user notification settings:', error);
      return false;
    }

    // If user completely disables notifications
    const settings = userData.notifications_settings || {};
    if (settings.notifications_enabled === false) {
      return false;
    }

    // Check specific notification type permissions
    switch (notificationType) {
      case 'TASK_ASSIGNED':
        return settings.taskAssignments !== false;
      case 'COMMENT_ADDED':
        return settings.taskComments !== false;
      case 'MENTION':
        return settings.mentionNotifications !== false;
      case 'MEETING_INVITE':
        return settings.inviteMeetingNotifications !== false;
      case 'ADDED_TO_CHAT':
        return settings.addedChatNotifications !== false;
      case 'SYSTEM':
        return true; // System notifications are always allowed
      case 'TEAM_INVITATION':
        return settings.teamInvitations !== false;
      case 'TEAM_ANNOUNCEMENT':
        return settings.teamAnnouncements !== false;
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
    userId: null, // Add userId to track which user we're subscribed for
  },
  reducers: {
    resetNotificationState: (state) => {
      state.items = [];
      state.unreadCount = 0;
      state.loading = false;
      state.error = null;
      state.lastFetched = null;
      state.isSubscribed = false;
      state.userId = null;
      
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
        
        // Only increment unreadCount if notification is for the current user
        // Check that the notification's user_id matches the subscribed userId
        if (!newNotification.is_read && newNotification.user_id === state.userId) {
          state.unreadCount += 1;
        }
      }
    },
    // Handle notification updates received in realtime
    notificationUpdated: (state, action) => {
      const updatedNotification = action.payload;
      const index = state.items.findIndex(item => item.id === updatedNotification.id);
      
      if (index !== -1) {
        // Check if this notification belongs to the current user
        const isForCurrentUser = updatedNotification.user_id === state.userId;
        
        // If notification changes from unread to read, update unread count
        if (isForCurrentUser) {
          if (!updatedNotification.is_read && state.items[index].is_read) {
            state.unreadCount -= 1;
          } else if (updatedNotification.is_read && !state.items[index].is_read) {
            state.unreadCount += 1;
          }
        }
        
        // Update notification
        state.items[index] = updatedNotification;
      }
    },
    // Handle notification deletion received in realtime
    notificationDeleted: (state, action) => {
      const deletedNotificationId = action.payload;
      const deletedNotification = state.items.find(item => item.id === deletedNotificationId);
      
      if (deletedNotification) {
        // Only decrement unread count if notification was for current user and unread
        if (!deletedNotification.is_read && deletedNotification.user_id === state.userId) {
          state.unreadCount -= 1;
        }
        
        state.items = state.items.filter(item => item.id !== deletedNotificationId);
      }
    }
  },
  extraReducers: (builder) => {
    builder
      // Fetch notifications
      .addCase(fetchNotifications.pending, (state) => {
        state.loading = true;
        state.error = null;
        
      })
      .addCase(fetchNotifications.fulfilled, (state, action) => {
        // If returned data is an array, update the state
        if (Array.isArray(action.payload)) {
          
          state.items = action.payload;
          // Only count unread notifications for the current user
          state.unreadCount = action.payload.filter(
            notification => !notification.is_read && notification.user_id === state.userId
          ).length;
          state.lastFetched = new Date().toISOString();
        } else {
          
        }
        // Always set loading to false when done, regardless of payload type
        state.loading = false;
      })
      .addCase(fetchNotifications.rejected, (state, action) => {
        console.error('Notification loading status: Load failed', action.payload);
        state.error = action.payload;
        state.loading = false;
      })
      
      // Subscribe to notifications
      .addCase(subscribeToNotifications.pending, (state, action) => {
        // Set the flag to true when subscription starts to prevent duplicate calls
        
      })
      .addCase(subscribeToNotifications.fulfilled, (state, action) => {
        if (action.payload && action.payload.userId) {
          state.isSubscribed = true;
          state.userId = action.payload.userId;
          
        }
      })
      .addCase(subscribeToNotifications.rejected, (state) => {
        state.isSubscribed = false;
        
      })
      
      // Unsubscribe from notifications
      .addCase(unsubscribeFromNotifications.fulfilled, (state, action) => {
        state.isSubscribed = false;
        state.userId = null;
        
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
        // Check if we have a valid notification payload before adding
        if (action.payload) {
          state.items.unshift(action.payload);
          // Only increment unread count if notification is for current user
          if (!action.payload.is_read && action.payload.user_id === state.userId) {
            state.unreadCount += 1;
          }
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
export const selectSubscribedUserId = (state) => state.notifications.userId;

export default notificationSlice.reducer; 