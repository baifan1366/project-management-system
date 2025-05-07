import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { api } from '@/lib/api';

// Async thunk for user login
export const loginUser = createAsyncThunk(
  'users/login',
  async (credentials, { rejectWithValue }) => {
    try {
      const response = await fetch('/api/auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'login',
          ...credentials
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        return rejectWithValue(data.error || 'Login failed');
      }

      return data.data; // Contains user and subscription data
    } catch (error) {
      return rejectWithValue(error.message || 'Login failed');
    }
  }
);

// Async thunk for user signup
export const signupUser = createAsyncThunk(
  'users/signup',
  async (userData, { rejectWithValue }) => {
    try {
      const response = await fetch('/api/auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'signup',
          ...userData
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        return rejectWithValue(data.error || 'Signup failed');
      }

      return data;
    } catch (error) {
      return rejectWithValue(error.message || 'Signup failed');
    }
  }
);

// Async thunk for user logout
export const logoutUser = createAsyncThunk(
  'users/logout',
  async (_, { rejectWithValue }) => {
    try {
      const response = await fetch('/api/auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'logout' }),
      });

      const data = await response.json();

      if (!response.ok) {
        return rejectWithValue(data.error || 'Logout failed');
      }

      return data;
    } catch (error) {
      return rejectWithValue(error.message || 'Logout failed');
    }
  }
);

// Async thunk for sending verification email
export const sendVerificationEmail = createAsyncThunk(
  'users/sendVerification',
  async (email, { rejectWithValue }) => {
    try {
      const response = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        return rejectWithValue(data.error || 'Failed to send verification email');
      }

      return data;
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to send verification email');
    }
  }
);

// Async thunk for requesting password reset
export const requestPasswordReset = createAsyncThunk(
  'users/requestPasswordReset',
  async (email, { rejectWithValue }) => {
    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        return rejectWithValue(data.error || 'Failed to request password reset');
      }

      return data;
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to request password reset');
    }
  }
);

// Async thunk for resetting password
export const resetPassword = createAsyncThunk(
  'users/resetPassword',
  async ({ token, password, confirmPassword }, { rejectWithValue }) => {
    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token, password, confirmPassword }),
      });

      const data = await response.json();

      if (!response.ok) {
        return rejectWithValue(data.error || 'Failed to reset password');
      }

      return data;
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to reset password');
    }
  }
);

// 异步thunk用于更新用户资料
export const updateUserProfile = createAsyncThunk(
  'users/updateProfile',
  async ({ userId, profileData }, { rejectWithValue }) => {
    try {
      const response = await api.users.updateProfile(userId, profileData);
      return response;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

// 异步thunk用于更新用户偏好设置
export const updateUserPreference = createAsyncThunk(
  'users/updatePreference',
  async ({ userId, preferenceData }, { rejectWithValue }) => {
    try {
      const response = await api.users.updatePreference(userId, preferenceData);
      return response;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

// 异步thunk用于绑定第三方账号
export const connectProvider = createAsyncThunk(
  'users/connectProvider',
  async ({ userId, provider, providerId, providerIdField }, { rejectWithValue }) => {
    try {
      const response = await api.users.connectProvider(userId, { provider, providerId, providerIdField });
      return response;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

// 异步thunk用于解绑第三方账号
export const disconnectProvider = createAsyncThunk(
  'users/disconnectProvider',
  async ({ userId, provider, providerIdField }, { rejectWithValue }) => {
    try {
      const response = await api.users.disconnectProvider(userId, { provider, providerIdField });
      return response;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

// Add cache for API requests to prevent multiple redundant calls
let lastFetchTime = 0;
let isFetchingCurrentUser = false;
const CACHE_DURATION = 30000; // 30 seconds cache duration

// Async thunk for fetching current user
export const fetchCurrentUser = createAsyncThunk(
  'users/fetchCurrentUser',
  async (_, { rejectWithValue, getState }) => {
    try {
      // Check if we already have a user in the Redux store
      const { users } = getState();
      if (users.currentUser) {
        return { user: users.currentUser, subscription: users.subscription };
      }
      
      // Check if we're within cache duration
      const now = Date.now();
      if (now - lastFetchTime < CACHE_DURATION && isFetchingCurrentUser) {
        // Return a pending promise that will be fulfilled by the ongoing request
        return new Promise((resolve, reject) => {
          const checkStoreInterval = setInterval(() => {
            const state = getState();
            if (state.users.currentUser) {
              clearInterval(checkStoreInterval);
              resolve({
                user: state.users.currentUser,
                subscription: state.users.subscription
              });
            } else if (!isFetchingCurrentUser) {
              // If fetch is no longer in progress but we don't have a user
              // Clear the interval and make a new request
              clearInterval(checkStoreInterval);
              resolve(fetchActualUserData());
            }
          }, 100);
        });
      }
      
      return await fetchActualUserData();
      
      // Helper function to fetch actual user data from API
      async function fetchActualUserData() {
        try {
          isFetchingCurrentUser = true;
          const data = await api.auth.getCurrentUser();
          
          // Update cache time
          lastFetchTime = Date.now();
          
          if (!data.success) {
            return rejectWithValue(data.error || 'Failed to get current user');
          }
          
          return data.data;
        } finally {
          isFetchingCurrentUser = false;
        }
      }
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to get current user');
    }
  }
);

// Async thunk to get user info by ID or username
export const fetchUserById = createAsyncThunk(
  'users/fetchUserById',
  async (userId, { rejectWithValue, getState }) => {
    try {
      // Check if we already have this user in state
      const { users } = getState();
      const existingUser = users.users.find(user => 
        user.id === userId || 
        user.name?.toLowerCase() === userId?.toLowerCase()
      );
      
      // Return the existing user if found
      if (existingUser) {
        return existingUser;
      }
      
      // Use api module to call backend
      const response = await api.users.getById(userId);
      
      if (!response.success) {
        return rejectWithValue(response.error || 'Failed to get user information');
      }
      
      return response.data;
    } catch (error) {
      console.error(`Error fetching user ${userId}:`, error);
      return rejectWithValue(error.message || 'Failed to get user information');
    }
  }
);

// 异步thunk用于获取当前用户的订阅计划详情
export const fetchUserSubscription = createAsyncThunk(
  'users/fetchUserSubscription',
  async (_, { rejectWithValue, getState }) => {
    try {
      // 获取当前用户ID
      const { users } = getState();
      const userId = users.currentUser?.id;
      
      if (!userId) {
        return rejectWithValue('No user logged in');
      }
      
      // 使用新添加的API函数获取订阅详情
      const response = await api.subscriptions.getUserSubscriptionWithPlanDetails(userId);
      
      if (!response.success) {
        return rejectWithValue(response.error || 'Failed to fetch subscription details');
      }
      
      return response.data;
    } catch (error) {
      console.error('Error fetching user subscription:', error);
      return rejectWithValue(error.message || 'Failed to fetch subscription details');
    }
  }
);

const initialState = {
  currentUser: null,
  subscription: null,
  status: 'idle', // 'idle' | 'loading' | 'succeeded' | 'failed'
  error: null,
  verificationSent: false,
  passwordResetRequested: false,
  passwordResetSuccess: false,
  tempUserId: null,
  users: [], // 存储获取的用户信息
};

const usersSlice = createSlice({
  name: 'users',
  initialState,
  reducers: {
    setUser: (state, action) => {
      state.currentUser = action.payload;
      state.status = 'succeeded';
    },
    clearUser: (state) => {
      state.currentUser = null;
      state.subscription = null;
      state.tempUserId = null;
      state.status = 'idle';
      state.verificationSent = false;
      state.passwordResetRequested = false;
      state.passwordResetSuccess = false;
      state.error = null;
    },
    updateUserData: (state, action) => {
      if (state.currentUser) {
        state.currentUser = { ...state.currentUser, ...action.payload };
      }
    },
    resetAuthState: (state) => {
      state.error = null;
      state.status = 'idle';
      state.verificationSent = false;
      state.passwordResetRequested = false;
      state.passwordResetSuccess = false;
    },
  },
  extraReducers: (builder) => {
    builder
      // Handle login
      .addCase(loginUser.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.status = 'succeeded';
        
        // Store full user object with all fields from the user table
        state.currentUser = action.payload.user;
        
        // Store subscription information
        state.subscription = action.payload.subscription;
        
        // Log the full user object to debug
        console.log('User stored in Redux:', action.payload.user);
        
        state.error = null;
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })
      // Handle signup
      .addCase(signupUser.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(signupUser.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.verificationSent = true;
        
        // Store userId if available in the response
        if (action.payload.userId) {
          state.tempUserId = action.payload.userId;
          console.log('Registered user ID stored:', action.payload.userId);
        }
        
        state.error = null;
      })
      .addCase(signupUser.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })
      // Handle logout
      .addCase(logoutUser.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(logoutUser.fulfilled, (state) => {
        // Full reset of user state
        state.status = 'idle';
        state.currentUser = null;
        state.subscription = null;
        state.tempUserId = null;
        state.verificationSent = false;
        state.passwordResetRequested = false;
        state.passwordResetSuccess = false;
        state.error = null;
        
        console.log('User state cleared after logout');
      })
      .addCase(logoutUser.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })
      // Handle verification email
      .addCase(sendVerificationEmail.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(sendVerificationEmail.fulfilled, (state) => {
        state.status = 'succeeded';
        state.verificationSent = true;
      })
      .addCase(sendVerificationEmail.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })
      // Handle password reset request
      .addCase(requestPasswordReset.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(requestPasswordReset.fulfilled, (state) => {
        state.status = 'succeeded';
        state.passwordResetRequested = true;
      })
      .addCase(requestPasswordReset.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })
      // Handle password reset
      .addCase(resetPassword.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(resetPassword.fulfilled, (state) => {
        state.status = 'succeeded';
        state.passwordResetSuccess = true;
      })
      .addCase(resetPassword.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })
      // Handle updating user profile
      .addCase(updateUserProfile.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(updateUserProfile.fulfilled, (state, action) => {
        state.status = 'succeeded';
        if (state.currentUser) {
          state.currentUser = { ...state.currentUser, ...action.payload.data };
        }
      })
      .addCase(updateUserProfile.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })
      // Handle updating user preferences
      .addCase(updateUserPreference.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(updateUserPreference.fulfilled, (state, action) => {
        state.status = 'succeeded';
        if (state.currentUser) {
          state.currentUser = { ...state.currentUser, ...action.payload.data };
        }
      })
      .addCase(updateUserPreference.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })
      // Handle connecting provider
      .addCase(connectProvider.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(connectProvider.fulfilled, (state, action) => {
        state.status = 'succeeded';
        if (state.currentUser) {
          // Update user with the returned data from the API
          state.currentUser = { 
            ...state.currentUser,
            ...action.payload.data
          };
        }
      })
      .addCase(connectProvider.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })
      // Handle disconnecting provider
      .addCase(disconnectProvider.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(disconnectProvider.fulfilled, (state, action) => {
        state.status = 'succeeded';
        if (state.currentUser) {
          // Update user with the returned data from the API
          state.currentUser = { 
            ...state.currentUser,
            ...action.payload.data
          };
        }
      })
      .addCase(disconnectProvider.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })
      // Handle fetch current user
      .addCase(fetchCurrentUser.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchCurrentUser.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.currentUser = action.payload.user;
        state.subscription = action.payload.subscription;
        state.error = null;
      })
      .addCase(fetchCurrentUser.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })
      // Handle fetchUserById
      .addCase(fetchUserById.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchUserById.fulfilled, (state, action) => {
        // 检查用户是否已经存在于users数组中
        const userExists = state.users.some(user => user.id === action.payload.id);
        
        // 如果不存在，添加到数组
        if (!userExists) {
          state.users.push(action.payload);
        } else {
          // 如果已存在，更新用户信息
          state.users = state.users.map(user => 
            user.id === action.payload.id ? action.payload : user
          );
        }
        
        state.status = 'succeeded';
      })
      .addCase(fetchUserById.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })
      // Handle fetchUserSubscription
      .addCase(fetchUserSubscription.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchUserSubscription.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.subscription = action.payload;
      })
      .addCase(fetchUserSubscription.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      });
  },
});

export const { setUser, clearUser, updateUserData, resetAuthState } = usersSlice.actions;

export default usersSlice.reducer;
